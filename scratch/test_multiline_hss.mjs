import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseHssSchedule } from '../src/lib/parser.ts';

async function extractPdfTextWithLines(path) {
  const data = new Uint8Array(fs.readFileSync(path));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  let fullLines = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let lastY = null;
    let lineStr = "";
    for (const item of content.items) {
      if ('str' in item) {
        const y = item.transform ? item.transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
          fullLines.push(lineStr);
          lineStr = item.str;
        } else {
          lineStr += (lineStr ? " " : "") + item.str;
        }
        lastY = y;
      }
    }
    if (lineStr) fullLines.push(lineStr);
  }
  return fullLines.join("\n");
}

async function testHssLines() {
  const text = await extractPdfTextWithLines('C:/Users/austi/Downloads/HSS (15).pdf');
  console.log("=== Multiline PDF Text ===");
  console.log(text);
  console.log("=== Parsing with parseHssSchedule ===");
  const trips = parseHssSchedule(text, {
    command: "HSS/CA/18061/04SEP^",
    targetMonthKey: "2026-09"
  });
  console.log("Trips parsed count:", trips.length);
  if (trips.length > 0) {
    const t = trips[0];
    console.log(`Seq #${t.sequenceNumber}: startDate=${t.startDate}, endDate=${t.endDate}, credit=${t.totalCreditMinutes}m, TAFB=${t.expTafbHours}h, dutyPeriods=${t.dutyPeriods.length}`);
    t.dutyPeriods.forEach((dp, idx) => {
      console.log(`  Day ${idx + 1} (${dp.layoverCity || 'Base'}): ${dp.legs.map(l => `${l.flightNumber} ${l.depAirport}->${l.arrAirport} (${l.depTime}-${l.arrTime})`).join(', ')}`);
    });
  }
}

testHssLines();
