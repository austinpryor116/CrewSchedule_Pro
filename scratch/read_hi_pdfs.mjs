import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

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

async function run() {
  if (fs.existsSync('C:/Users/austi/Downloads/HI1.pdf')) {
    console.log("=== HI1.pdf ===");
    console.log(await extractPdfText('C:/Users/austi/Downloads/HI1.pdf'));
  }
  if (fs.existsSync('C:/Users/austi/Downloads/HI2.pdf')) {
    console.log("=== HI2.pdf ===");
    console.log(await extractPdfText('C:/Users/austi/Downloads/HI2.pdf'));
  }
}
run();
