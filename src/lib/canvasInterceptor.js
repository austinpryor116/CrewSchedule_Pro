/**
 * CANVAS INTERCEPTOR INJECTION SCRIPT (src/lib/canvasInterceptor.js)
 * Injected into Electron WebContents/WebView for WebSabre canvas terminal scraping.
 * Overrides CanvasRenderingContext2D.prototype.fillText to capture drawn characters, X/Y, and attributes.
 */

export const CANVAS_INTERCEPTOR_SCRIPT = `
(function() {
  if (window._sabreInterceptorInjected) return;
  window._sabreInterceptorInjected = true;

  // Initialize global 2D capture buffer
  window._sabreCaptureBuffer = [];

  // Store reference to native fillText
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;

  // Terminal cell dimensions (estimated px per char/row grid)
  const CHAR_HEIGHT = 18;
  const CHAR_WIDTH = 10;

  /**
   * Helper to parse canvas context attributes (blink, reverse, color, font)
   */
  function extractAttributes(ctx) {
    const font = String(ctx.font || "");
    const fillStyle = String(ctx.fillStyle || "");
    const lowerFont = font.toLowerCase();
    const lowerFill = fillStyle.toLowerCase();

    return {
      blink: lowerFont.includes("italic") || lowerFont.includes("blink") || lowerFont.includes("oblique"),
      reverse: lowerFill === "#000000" || lowerFill === "#020617" || lowerFill === "black" || lowerFill === "rgb(0,0,0)",
      color: fillStyle,
      font: font
    };
  }

  // Override CanvasRenderingContext2D.prototype.fillText
  CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
    // Call original native fillText
    originalFillText.apply(this, arguments);

    if (text === undefined || text === null) return;
    const str = String(text);
    if (str.length === 0) return;

    const attr = extractAttributes(this);
    const rowIdx = Math.max(0, Math.floor(y / CHAR_HEIGHT));

    // Ensure row array exists in window._sabreCaptureBuffer
    while (window._sabreCaptureBuffer.length <= rowIdx) {
      window._sabreCaptureBuffer.push([]);
    }

    let colIdx = Math.max(0, Math.floor(x / CHAR_WIDTH));

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const charObj = {
        chr: char,
        x: Math.round(x + (i * CHAR_WIDTH)),
        y: Math.round(y),
        col: colIdx,
        row: rowIdx,
        CR: false,
        attr: { ...attr }
      };

      window._sabreCaptureBuffer[rowIdx][colIdx] = charObj;
      colIdx++;
    }

    // Set CR: true on trailing character in current row drawing
    const currentRow = window._sabreCaptureBuffer[rowIdx];
    if (currentRow && currentRow.length > 0) {
      const last = currentRow[currentRow.length - 1];
      if (last) {
        last.CR = true;
      }
    }
  };

  /**
   * Returns current 2D JSON capture array and resets buffer to empty.
   */
  window._flushSabreBuffer = function() {
    const bufferCopy = JSON.parse(JSON.stringify(window._sabreCaptureBuffer || []));
    window._sabreCaptureBuffer = [];
    return bufferCopy;
  };
})();
`;

// Self-executing injection if loaded in browser/renderer scope
if (typeof window !== "undefined") {
  try {
    eval(CANVAS_INTERCEPTOR_SCRIPT);
  } catch (e) {
    // Ignore in non-DOM Node execution environments
  }
}

export default CANVAS_INTERCEPTOR_SCRIPT;
