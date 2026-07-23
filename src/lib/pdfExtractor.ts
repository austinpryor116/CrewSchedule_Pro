/**
 * Extracts line-formatted text from a PDF file using spatial Y/X coordinates.
 * Preserves monospace alignment and line breaks for HI/HSS/N4 terminal sheets.
 */
export async function extractTextFromPdfFile(file: File): Promise<string> {
  if (typeof window === "undefined") {
    return "";
  }

  const pdfjsLib = await import("pdfjs-dist");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    // Sort items by Y coordinate descending (top to bottom), then X coordinate ascending (left to right)
    items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5];
      if (Math.abs(yDiff) > 3) return yDiff;
      return a.transform[4] - b.transform[4];
    });

    let lastY: number | null = null;
    let pageText = "";
    for (const item of items) {
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 3) {
        pageText += "\n";
      } else if (lastY !== null && pageText.length > 0 && !pageText.endsWith("\n") && !pageText.endsWith(" ")) {
        pageText += " ";
      }
      pageText += item.str;
      lastY = item.transform[5];
    }
    fullText += pageText + "\n";
  }

  return fullText;
}

/**
 * Universal file reader that reads either text (.txt, .log) or extracts text from PDF (.pdf).
 */
export async function readUploadedFileAsText(file: File): Promise<{ text: string; fileName: string; isPdf: boolean }> {
  const fileName = file.name;
  const isPdf = fileName.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const text = await extractTextFromPdfFile(file);
    return { text, fileName, isPdf: true };
  } else {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve({ text: text || "", fileName, isPdf: false });
      };
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }
}
