import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

async function extract() {
  const data = new Uint8Array(fs.readFileSync('C:/Users/austi/Downloads/HSS (14).pdf'));
  const doc = await pdfjs.getDocument({data}).promise;
  let text = '';
  for(let i=1; i<=doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let lastY;
    let line = '';
    for(const item of content.items) {
      if (lastY !== item.transform[5] && lastY !== undefined) {
        text += line + '\n';
        line = '';
      }
      line += item.str + ' ';
      lastY = item.transform[5];
    }
    text += line + '\n';
  }
  console.log(text);
}
extract().catch(console.error);
