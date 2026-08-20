const fs = require('fs');
const content = fs.readFileSync('scratch/n4_sample.txt', 'utf8');

function parseN4OpenTime(text) {
  const lines = text.split('\n');
  const openSequences = [];
  
  let currentMonth = '08';
  let currentYear = '2026';
  let currentDay = '01';
  let currentBase = 'ORD';
  let currentSeat = 'CA';
  let currentEquipment = 'E75';
  let isDropBoard = false;

  const months = {
    JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
    JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.includes('CREWED SEQUENCES POSTED FOR DROP')) {
      isDropBoard = true;
    } else if (line.includes('OPEN SEQUENCES')) {
      isDropBoard = false;
    }

    const headerMatch = line.match(/^([A-Z]{3})\s+([A-Z0-9]+)\s+(CA|FO)\s+/i);
    if (headerMatch) {
      currentBase = headerMatch[1].toUpperCase();
      currentEquipment = headerMatch[2].toUpperCase();
      currentSeat = headerMatch[3].toUpperCase();
    }

    const dateMatch = line.match(/(\d{2})([A-Z]{3})\s+DOM/);
    if (dateMatch) {
      currentDay = dateMatch[1];
      const monthStr = dateMatch[2].toUpperCase();
      currentMonth = months[monthStr] || '08';
    }

    const match = line.match(/^\s*(\d{5})\s+(\d+\.\d+)\s+(\d{4})\s+(\d{4})\/(\d{2})/);
    if (match) {
      const seqNum = match[1];
      const credit = parseFloat(match[2]);
      
      if (credit > 0) {
        const report = match[3];
        const release = match[4];
        const releaseDay = match[5];
        
        const startDate = `${currentYear}-${currentMonth}-${currentDay.padStart(2, '0')}`;
        
        let endMonth = currentMonth;
        let endYear = currentYear;
        if (parseInt(releaseDay, 10) < parseInt(currentDay, 10)) {
          let m = parseInt(currentMonth, 10) + 1;
          let y = parseInt(currentYear, 10);
          if (m > 12) {
            m = 1;
            y += 1;
          }
          endMonth = String(m).padStart(2, '0');
          endYear = String(y);
        }
        const endDate = `${endYear}-${endMonth}-${releaseDay.padStart(2, '0')}`;

        let remaining = line.substring(match[0].length).trim();
        if (dateMatch && remaining.includes(dateMatch[0])) {
          remaining = remaining.replace(dateMatch[0], '').trim();
        }

        const tokens = remaining.split(/\s+/);
        const legs = tokens[0] || '—';
        const layovers = tokens.slice(1).join(' ') || '—';

        openSequences.push({
          id: `ot-${currentBase}-${seqNum}-${startDate}`,
          sequenceNumber: seqNum,
          creditHours: credit,
          reportTime: report,
          releaseTime: release,
          startDate,
          endDate,
          legsDescription: legs,
          layoverDescription: layovers,
          base: currentBase,
          equipment: currentEquipment,
          position: currentSeat,
          isDropBoard
        });
      }
    }
  }
  return openSequences;
}

const parsed = parseN4OpenTime(content);
console.log('Total parsed sequences:', parsed.length);
console.log('Open Time sample:', JSON.stringify(parsed.filter(p => !p.isDropBoard).slice(0, 5), null, 2));
console.log('Drop Board sample:', JSON.stringify(parsed.filter(p => p.isDropBoard), null, 2));
