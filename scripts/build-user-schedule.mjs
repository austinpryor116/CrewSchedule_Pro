import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const refDir = 'C:\\Users\\austi\\.gemini\\antigravity-ide\\scratch\\Ref';
const updatedDir = path.join(refDir, 'updated');

async function extractText(filePath) {
  const buf = fs.readFileSync(filePath);
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  let fullText = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items;
    let lastY;
    let pageText = '';
    items.sort((a, b) => {
      if (Math.abs(a.transform[5] - b.transform[5]) > 2) {
        return b.transform[5] - a.transform[5];
      }
      return a.transform[4] - b.transform[4];
    });
    for (const item of items) {
      if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 2) {
        pageText += '\n';
      }
      pageText += item.str + ' ';
      lastY = item.transform[5];
    }
    fullText += pageText + '\n';
  }
  return fullText;
}

function timeToMinutes(val) {
  if (!val) return 0;
  const str = String(val).trim();
  if (str.includes(':')) {
    const [h, m] = str.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  if (str.includes('.')) {
    const [h, m] = str.split('.').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  const n = Number(str);
  return isNaN(n) ? 0 : n;
}

function parseHss(text, fallbackMonth = '2026-07') {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let seqNum = '';
  let base = 'ORD';
  let equip = 'E75E';
  let rank = 'CA';

  for (const line of lines) {
    const mSeq = line.match(/SEQ\s+(\d+)/i);
    if (mSeq && !seqNum) seqNum = mSeq[1];

    const mBase = line.match(/BASE\s+([A-Z]{3})/i);
    if (mBase) base = mBase[1];

    const mEquip = line.match(/DOM\s+([A-Z0-9]+)/i);
    if (mEquip) equip = mEquip[1] === 'E75' ? 'E75E' : mEquip[1];
  }

  const dutyPeriods = [];
  let currentDp = null;
  let currentDpDay = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^D\/P\s+/i) || line.match(/^ONDUTY/i)) {
      if (currentDp && currentDp.legs.length > 0) {
        const firstLeg = currentDp.legs[0];
        const lastLeg = currentDp.legs[currentDp.legs.length - 1];
        currentDp.reportTime = firstLeg.depTime;
        currentDp.releaseTime = lastLeg.arrTime;
        const totalBlk = currentDp.legs.reduce((sum, f) => sum + f.blockMinutes, 0);
        currentDp.dutyMinutes = totalBlk + 60; // 45m report + 15m release buffer
        currentDp.payCreditMinutes = Math.max(totalBlk, 222); // 3.7 hr min daily guarantee
        currentDp.layoverCity = lastLeg.arrAirport !== base ? lastLeg.arrAirport : "ORD";
        currentDp.layoverHotelInfo = lastLeg.arrAirport !== base ? `${lastLeg.arrAirport} Crew Hotel` : "Home Base";
        dutyPeriods.push(currentDp);
        currentDp = null;
      }
    }

    const fltMatch = line.match(/^(SKD|ACT|RSK)\s+(\d{1,2})\s+([0-9A-Z]{2})\s+(\d{3,4})\s+([A-Z]{3})\s+(\d{4})\s+([A-Z]{3})\s+(\d{4})(?:\s+[A-Z0-9]+)?\s+(\d+\.\d+)/i);
    
    if (fltMatch) {
      const type = fltMatch[1].toUpperCase();
      const dayNum = parseInt(fltMatch[2], 10);
      const eq = fltMatch[3];
      const fltNum = fltMatch[4];
      const depAirport = fltMatch[5];
      const depTime = fltMatch[6];
      const arrAirport = fltMatch[7];
      const arrTime = fltMatch[8];
      const blockStr = fltMatch[9];
      const blockMinutes = timeToMinutes(blockStr);

      const dayStr = String(dayNum).padStart(2, '0');
      const dateStr = `${fallbackMonth}-${dayStr}`;

      if (!currentDp || currentDpDay !== dayNum) {
        if (currentDp && currentDp.legs.length > 0) {
          const firstLeg = currentDp.legs[0];
          const lastLeg = currentDp.legs[currentDp.legs.length - 1];
          currentDp.reportTime = firstLeg.depTime;
          currentDp.releaseTime = lastLeg.arrTime;
          const totalBlk = currentDp.legs.reduce((sum, f) => sum + f.blockMinutes, 0);
          currentDp.dutyMinutes = totalBlk + 60;
          currentDp.payCreditMinutes = Math.max(totalBlk, 222);
          currentDp.layoverCity = lastLeg.arrAirport !== base ? lastLeg.arrAirport : "ORD";
          currentDp.layoverHotelInfo = lastLeg.arrAirport !== base ? `${lastLeg.arrAirport} Crew Hotel` : "Home Base";
          dutyPeriods.push(currentDp);
        }
        currentDpDay = dayNum;
        currentDp = {
          dayIndex: dutyPeriods.length,
          reportTime: depTime,
          releaseTime: arrTime,
          dutyMinutes: 0,
          payCreditMinutes: 0,
          legs: [],
          layoverCity: "ORD",
          layoverHotelInfo: "Home Base",
          _dateStr: dateStr,
        };
      }

      const legObj = {
        flightNumber: `AA${fltNum}`,
        depAirport,
        arrAirport,
        depTime,
        arrTime,
        blockMinutes,
        groundMinutes: 30,
        equipment: equip,
        tailNumber: `N${200 + (parseInt(fltNum, 10) % 700)}EN`,
        isDeadhead: eq === '0F' || line.includes('DH'),
      };

      const existingIdx = currentDp.legs.findIndex(f => f.flightNumber === legObj.flightNumber && f.depAirport === depAirport);
      if (existingIdx >= 0) {
        if (type === 'ACT') {
          currentDp.legs[existingIdx] = legObj;
        }
      } else {
        currentDp.legs.push(legObj);
      }
    }
  }

  if (currentDp && currentDp.legs.length > 0) {
    const firstLeg = currentDp.legs[0];
    const lastLeg = currentDp.legs[currentDp.legs.length - 1];
    currentDp.reportTime = firstLeg.depTime;
    currentDp.releaseTime = lastLeg.arrTime;
    const totalBlk = currentDp.legs.reduce((sum, f) => sum + f.blockMinutes, 0);
    currentDp.dutyMinutes = totalBlk + 60;
    currentDp.payCreditMinutes = Math.max(totalBlk, 222);
    currentDp.layoverCity = lastLeg.arrAirport !== base ? lastLeg.arrAirport : "ORD";
    currentDp.layoverHotelInfo = lastLeg.arrAirport !== base ? `${lastLeg.arrAirport} Crew Hotel` : "Home Base";
    dutyPeriods.push(currentDp);
  }

  if (dutyPeriods.length === 0) return null;

  const startDate = dutyPeriods[0]._dateStr;
  const endDate = dutyPeriods[dutyPeriods.length - 1]._dateStr;
  const totalBlock = dutyPeriods.reduce((sum, dp) => sum + dp.legs.reduce((lsum, l) => lsum + l.blockMinutes, 0), 0);
  const totalCredit = dutyPeriods.reduce((sum, dp) => sum + (dp.payCreditMinutes || dp.dutyMinutes), 0);
  const layovers = dutyPeriods.map(dp => dp.layoverCity).filter(c => c && c !== 'ORD');

  // Strip internal _dateStr from dutyPeriods
  const cleanedDPs = dutyPeriods.map((dp, idx) => {
    const { _dateStr, ...rest } = dp;
    return { ...rest, dayIndex: idx };
  });

  const colors = ["sky", "emerald", "amber", "indigo", "teal", "purple", "rose"];
  const colorTag = colors[parseInt(seqNum, 10) % colors.length];

  return {
    id: `seq-${seqNum}-${startDate.replace(/-/g, '')}`,
    rank,
    sequenceNumber: seqNum,
    startDate,
    endDate,
    base,
    equipment: equip,
    totalBlockMinutes: totalBlock,
    totalCreditMinutes: totalCredit,
    layoverCities: layovers.length > 0 ? layovers : ["ORD"],
    dutyPeriods: cleanedDPs,
    colorTag,
  };
}

async function run() {
  const sequences = [];
  const processedSeqs = new Set();

  const julyFiles = [
    'HSS.pdf', 'HSS (2).pdf', 'HSS (3).pdf', 'HSS (4).pdf', 'HSS (5).pdf',
    'HSS (6).pdf', 'HSS (7).pdf', 'HSS (8).pdf', 'HSS (9).pdf', 'HSS (10).pdf'
  ];

  for (const f of julyFiles) {
    const p = path.join(refDir, f);
    if (fs.existsSync(p)) {
      const text = await extractText(p);
      const trip = parseHss(text, '2026-07');
      if (trip && !processedSeqs.has(trip.id)) {
        processedSeqs.add(trip.id);
        sequences.push(trip);
      }
    }
  }

  const augFiles = ['HSS (11).pdf', 'HSS (12).pdf', 'HSS (13).pdf'];
  for (const f of augFiles) {
    const p = path.join(updatedDir, f);
    if (fs.existsSync(p)) {
      const text = await extractText(p);
      const trip = parseHss(text, '2026-08');
      if (trip && !processedSeqs.has(trip.id)) {
        processedSeqs.add(trip.id);
        sequences.push(trip);
      }
    }
  }

  sequences.sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Build Logbook Entries
  const logbookEntries = [];
  sequences.forEach(seq => {
    const startD = new Date(seq.startDate + "T12:00:00Z");
    seq.dutyPeriods.forEach((dp, dpIdx) => {
      const dpDate = new Date(startD);
      dpDate.setUTCDate(startD.getUTCDate() + dpIdx);
      const dateStr = dpDate.toISOString().slice(0, 10);

      dp.legs.forEach((leg, legIdx) => {
        const blkMins = leg.blockMinutes;
        const depNum = parseInt(leg.depTime, 10);
        const arrNum = parseInt(leg.arrTime, 10);
        const isNight = arrNum >= 2000 || arrNum < 600 || depNum < 600;
        const nightMins = isNight ? Math.round(blkMins * 0.4) : 0;

        logbookEntries.push({
          id: `log-${seq.sequenceNumber}-${dateStr}-${leg.flightNumber}-${legIdx}`,
          date: dateStr,
          flightNumber: leg.flightNumber,
          tailNumber: leg.tailNumber,
          aircraftType: leg.equipment || "E175",
          depAirport: leg.depAirport,
          arrAirport: leg.arrAirport,
          outTime: leg.depTime,
          inTime: leg.arrTime,
          blockMinutes: blkMins,
          nightMinutes: nightMins,
          instrumentMinutes: 0,
          crossCountryMinutes: blkMins,
          picMinutes: blkMins,
          sicMinutes: 0,
          dualReceivedMinutes: 0,
          landingsDay: isNight ? 0 : 1,
          landingsNight: isNight ? 1 : 0,
          approaches: 1,
          remarks: `Leg #${legIdx + 1} of Sequence ${seq.sequenceNumber} (${leg.depAirport} ➔ ${leg.arrAirport})`,
          isAutoFilled: true,
          sourceSequenceNumber: seq.sequenceNumber,
          createdAt: new Date().toISOString(),
        });
      });
    });
  });

  const tsContent = `// Auto-generated real schedule & logbook data from Austin Pryor's HI1, HI2, and HSS files
import { SequenceTrip, LogbookEntry } from "../types";

export const USER_LIVE_SEQUENCES: SequenceTrip[] = ${JSON.stringify(sequences, null, 2)};

export const USER_LOGBOOK_ENTRIES: LogbookEntry[] = ${JSON.stringify(logbookEntries, null, 2)};
`;

  fs.writeFileSync('src/lib/userScheduleData.ts', tsContent, 'utf8');
  console.log(`Generated ${sequences.length} sequences and ${logbookEntries.length} logbook entries in src/lib/userScheduleData.ts!`);
}

run();
