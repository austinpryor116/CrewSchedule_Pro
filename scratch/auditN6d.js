const fs = require('fs');
const path = require('path');

// Let's import or compile n6dParser
const raw = fs.readFileSync(path.resolve(__dirname, '../../Ref/N6D.txt'), 'utf8');

function parseN6DReserves(rawText) {
  let base = "ORD";
  let equipment = "E75";
  let seat = "CAPT";
  let category = "DOMESTIC";
  let asOfDate = "15AUG26";
  let asOfTime = "1718";
  let displayDays = [15, 16, 17, 18, 19, 20, 21];

  // Header extraction
  const headerMatch = rawText.match(
    /([A-Z]{3})\s+([A-Z0-9]+)\s+([A-Z]+)\s+RESERVES DISPLAY\s+(\d{1,2}[A-Z]{3})\s+AS OF\s+(\d{4})\s+(\d{1,2}[A-Z]{3}\d{2})/i
  );
  if (headerMatch) {
    base = headerMatch[1].toUpperCase();
    equipment = headerMatch[2].toUpperCase();
    seat = headerMatch[3].toUpperCase().includes("FO") ? "FO" : "CAPT";
    asOfTime = headerMatch[5];
    asOfDate = headerMatch[6].toUpperCase();
  }

  const catMatch = rawText.match(/\b(DOMESTIC|INTERNATIONAL|INTL)\b/i);
  if (catMatch) {
    category = catMatch[1].toUpperCase();
  }

  // Days header extraction
  const daysMatch = rawText.match(
    /SEN\s+NAME\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/i
  );
  if (daysMatch) {
    displayDays = [
      parseInt(daysMatch[1], 10),
      parseInt(daysMatch[2], 10),
      parseInt(daysMatch[3], 10),
      parseInt(daysMatch[4], 10),
      parseInt(daysMatch[5], 10),
      parseInt(daysMatch[6], 10),
      parseInt(daysMatch[7], 10),
    ];
  }

  // Strip page headers and pagination artifacts
  let cleaned = rawText.replace(/=== PAGE \d+ ===\s*/gi, "");
  cleaned = cleaned.replace(/[A-Z]{3}\s+[A-Z0-9]+\s+[A-Z]+\s+RESERVES DISPLAY.*?\n/gi, "");
  cleaned = cleaned.replace(/DOMESTIC.*?\n/gi, "");
  cleaned = cleaned.replace(/SEN\s+NAME.*?\n/gi, "");

  const rawBlocks = cleaned
    .split(/-{20,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const pilots = [];
  const dailySummaries = [];
  const colStarts = [18, 24, 30, 36, 42, 48, 54];

  for (const b of rawBlocks) {
    // Check if this is the summary footer block
    if (b.includes("TOTAL AVAILABLE") || b.includes("AVAILABLE RSVS")) {
      const totM = b.match(/TOTAL AVAILABLE\s+([\d\s]+)/i);
      const rap1M = b.match(/RAP1\s+([\d\s]+)/i);
      const rap2M = b.match(/RAP2\s+([\d\s]+)/i);
      const othM = b.match(/OTHERS\s+([\d\s]+)/i);

      const tots = totM ? totM[1].trim().split(/\s+/).map((n) => parseInt(n, 10)) : [];
      const r1s = rap1M ? rap1M[1].trim().split(/\s+/).map((n) => parseInt(n, 10)) : [];
      const r2s = rap2M ? rap2M[1].trim().split(/\s+/).map((n) => parseInt(n, 10)) : [];
      const oths = othM ? othM[1].trim().split(/\s+/).map((n) => parseInt(n, 10)) : [];

      displayDays.forEach((d, idx) => {
        dailySummaries.push({
          day: d,
          totalAvailable: tots[idx] ?? 0,
          rap1Count: r1s[idx] ?? 0,
          rap2Count: r2s[idx] ?? 0,
          othersCount: oths[idx] ?? 0,
        });
      });
      continue;
    }

    const lines = b.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.length > 0);
    if (lines.length === 0) continue;

    // Seniority & Name
    const senMatch = b.match(/(\d{4})\s+([A-Z\s\-\.\/\']+?)(?:\s{2,}|\s+(?=\d{2}|\b[A-Z0-9]{4,}\b|\n|$))/i);
    const scMatch = b.match(/SC\s+(\d{6})/i);
    const projMatch = b.match(/PROJ\s+([\d\.]+)/i);
    const gtdMatch = b.match(/GTD\s+([\d\.]+)/i);
    const actMatch = b.match(/ACT\/SKD\s+([\d\.]+)/i);

    let sen = "0000";
    let name = "UNKNOWN";

    if (senMatch) {
      sen = senMatch[1];
      name = senMatch[2].split(/\r?\n/)[0].trim();
      name = name.replace(/\s+SC$/i, "").replace(/\s+\d{4,}$/, "").trim();
    } else if (lines[0] && /^\d{4}/.test(lines[0])) {
      const parts = lines[0].split(/\s+/);
      sen = parts[0];
      name = parts.slice(1).join(" ").trim();
    }

    // Skip non-pilot rows
    if (sen === "0000" && !scMatch) continue;

    const employeeId = scMatch ? scMatch[1] : "";
    const projHours = projMatch ? parseFloat(projMatch[1]) : 0;
    const gtdHours = gtdMatch ? parseFloat(gtdMatch[1]) : 0;
    const actSkdHours = actMatch ? parseFloat(actMatch[1]) : 0;

    // Extract Day Columns
    const daysStatus = {};

    displayDays.forEach((d, idx) => {
      const colStart = colStarts[idx] ?? (18 + idx * 6);
      const colEnd = colStart + 6;

      const tokens = [];
      lines.forEach((line) => {
        if (line.length > colStart) {
          const chunk = line.substring(colStart, Math.min(line.length, colEnd)).trim();
          if (chunk) {
            tokens.push(chunk);
          }
        }
      });

      let status = "OFF";
      let rapType = undefined;
      let rapWindow = undefined;
      let sequenceNumber = undefined;
      let code = undefined;
      let isAvailable = false;

      const tokenStr = tokens.join(" ");

      if (tokens.some((t) => t === "24" || t === "RD")) {
        status = "OFF";
        code = tokens.includes("24") ? "24" : "RD";
        isAvailable = false;
      } else if (tokens.includes("SK")) {
        status = "SK";
        code = "SK";
        isAvailable = false;
      } else if (
        tokens.some((t) =>
          ["VC", "V6", "VX", "PW", "BK", "UM", "MV", "NR", "TG", "TD", "CQ", "TRFF", "7D", "5G"].includes(t)
        )
      ) {
        status = "OTHER";
        code = tokens.find((t) =>
          ["VC", "V6", "VX", "PW", "BK", "UM", "MV", "NR", "TG", "TD", "CQ", "TRFF", "7D", "5G"].includes(t)
        );
        isAvailable = false;
      } else if (tokens.some((t) => t.includes("R04") || t.includes("1800"))) {
        status = "RAP";
        rapType = "RAP1";
        rapWindow = "0400-1800";
        code = "R0400";
        isAvailable = true;
      } else if (tokens.some((t) => t.includes("R12") || t.includes("2359"))) {
        status = "RAP";
        rapType = "RAP2";
        rapWindow = "1200-2359";
        code = "R1200";
        isAvailable = true;
      } else if (
        tokens.includes("SB") ||
        tokenStr.includes("STANDBY") ||
        (tokenStr.includes("0100") && tokenStr.includes("1700"))
      ) {
        status = "SB";
        rapType = "STANDBY";
        rapWindow = "0100-1700";
        code = "SB";
        isAvailable = true;
      } else if (tokens.includes("FLY") || tokens.some((t) => /^\d{5}$/.test(t))) {
        status = "FLY";
        const seqs = tokens.filter((t) => /^\d{5}$/.test(t));
        sequenceNumber = seqs[0];
        code = sequenceNumber ? `SEQ ${sequenceNumber}` : "FLY";
        isAvailable = false;
      } else if (tokens.length === 0) {
        // Empty on a reserve sheet indicates Available / Unassigned Reserve day
        status = "RAP";
        code = "RSV";
        isAvailable = true;
      } else {
        status = "OTHER";
        code = tokenStr;
        isAvailable = false;
      }

      daysStatus[d] = {
        day: d,
        status,
        rapType,
        rapWindow,
        sequenceNumber,
        code,
        rawText: tokenStr,
        isAvailable,
      };
    });

    pilots.push({
      seniority: sen,
      seniorityNum: parseInt(sen, 10) || 9999,
      name,
      employeeId,
      projHours,
      gtdHours,
      actSkdHours,
      days: daysStatus,
      rawBlock: b,
    });
  }

  // Deduplicate and merge pilot records across multi-page captures
  const uniquePilotsMap = new Map();
  pilots.forEach((p) => {
    const key = p.employeeId ? `emp-${p.employeeId}` : `sen-${p.seniority}`;
    if (!uniquePilotsMap.has(key)) {
      uniquePilotsMap.set(key, p);
    } else {
      const existing = uniquePilotsMap.get(key);
      uniquePilotsMap.set(key, {
        ...existing,
        ...p,
        days: { ...existing.days, ...p.days },
      });
    }
  });

  const finalPilots = Array.from(uniquePilotsMap.values());
  finalPilots.sort((a, b) => a.seniorityNum - b.seniorityNum);

  return {
    base,
    equipment,
    seat,
    category,
    asOfDate,
    asOfTime,
    displayDays,
    pilots: finalPilots,
    dailySummaries,
    rawText,
    importedAt: new Date().toISOString(),
  };
}

const parsed = parseN6DReserves(raw);
console.log('=== N6D AUDIT RESULTS ===');
console.log(`Base: ${parsed.base} | Equip: ${parsed.equipment} | Seat: ${parsed.seat}`);
console.log(`As of: ${parsed.asOfDate} at ${parsed.asOfTime}`);
console.log(`Display Days: [${parsed.displayDays.join(', ')}]`);
console.log(`Total Unique Pilots: ${parsed.pilots.length}`);
console.log('\n--- Daily Breakdown ---');
parsed.displayDays.forEach(d => {
  const avail = parsed.pilots.filter(p => p.days[d]?.isAvailable).length;
  const rap1 = parsed.pilots.filter(p => p.days[d]?.rapType === 'RAP1').length;
  const rap2 = parsed.pilots.filter(p => p.days[d]?.rapType === 'RAP2').length;
  const sb = parsed.pilots.filter(p => p.days[d]?.rapType === 'STANDBY').length;
  const fly = parsed.pilots.filter(p => p.days[d]?.status === 'FLY').length;
  const off = parsed.pilots.filter(p => p.days[d]?.status === 'OFF').length;
  const other = parsed.pilots.filter(p => p.days[d]?.status === 'OTHER' || p.days[d]?.status === 'SK').length;
  console.log(`Day ${d}: ${avail} Avail (RAP1:${rap1}, RAP2:${rap2}, SB:${sb}) | ${fly} Flying | ${off} Off | ${other} Other`);
});

console.log('\n--- Top 3 Most Senior Pilots ---');
parsed.pilots.slice(0, 3).forEach((p, idx) => {
  console.log(`${idx+1}. SEN ${p.seniority} - ${p.name} (SC ${p.employeeId}) | PROJ: ${p.projHours}h, GTD: ${p.gtdHours}h, ACT: ${p.actSkdHours}h`);
});

console.log('\n--- Bottom 3 Most Junior Pilots (Callout #1, #2, #3) ---');
const juniorSorted = [...parsed.pilots].sort((a,b) => b.seniorityNum - a.seniorityNum);
juniorSorted.slice(0, 3).forEach((p, idx) => {
  console.log(`Callout #${idx+1}: SEN ${p.seniority} - ${p.name} (SC ${p.employeeId}) | PROJ: ${p.projHours}h, GTD: ${p.gtdHours}h, ACT: ${p.actSkdHours}h`);
});
