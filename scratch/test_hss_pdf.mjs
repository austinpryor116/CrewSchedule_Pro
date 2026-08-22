import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseHssSchedule } from '../src/lib/parser.ts';

async function extractPdfText(path) {
  const data = new Uint8Array(fs.readFileSync(path));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => ('str' in item ? item.str : ''));
    fullText += strings.join(' ') + '\n';
  }
  return fullText;
}

async function testHss() {
  const text = await extractPdfText('C:/Users/austi/Downloads/HSS (15).pdf');
  console.log("=== Raw PDF Text ===");
  console.log(text);
  console.log("=== Parsing with parseHssSchedule ===");
  const trips = parseHssSchedule(text, {
    command: "HSS/CA/18061/04SEP^",
    targetMonthKey: "2026-09"
  });
  console.log("Trips parsed:", JSON.stringify(trips, null, 2));
}

testHss();
