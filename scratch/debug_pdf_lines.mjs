import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function extractPdfText(path) {
  const data = new Uint8Array(fs.readFileSync(path));
  const doc = await pdfjsLib.getDocument({ data }).promise;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    console.log(`--- Page ${i} Items count: ${content.items.length} ---`);
    let lastY = null;
    let lineStr = "";
    for (const item of content.items) {
      if ('str' in item) {
        const y = item.transform ? item.transform[5] : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
          console.log("LINE:", lineStr);
          lineStr = item.str;
        } else {
          lineStr += (lineStr ? " " : "") + item.str;
        }
        lastY = y;
      }
    }
    if (lineStr) console.log("LINE:", lineStr);
  }
}

extractPdfText('C:/Users/austi/Downloads/HSS (15).pdf');
