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

async function run() {
  const files = fs.readdirSync(refDir).filter(f => f.startsWith('HI') || f.startsWith('HSS'));
  console.log('Found', files.length, 'schedule files in Ref:');
  for (const f of files) {
    const text = await extractText(path.join(refDir, f));
    console.log(`=== File: ${f} (${text.length} chars) ===`);
    console.log(text.substring(0, 400));
    console.log('-------------------------------------------');
  }

  if (fs.existsSync(updatedDir)) {
    const upFiles = fs.readdirSync(updatedDir).filter(f => f.startsWith('HSS'));
    console.log('\nFound', upFiles.length, 'schedule files in Ref/updated:');
    for (const f of upFiles) {
      const text = await extractText(path.join(updatedDir, f));
      console.log(`=== File: updated/${f} (${text.length} chars) ===`);
      console.log(text.substring(0, 400));
      console.log('-------------------------------------------');
    }
  }
}

run();
