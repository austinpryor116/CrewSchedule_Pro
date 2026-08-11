/**
 * CANVAS INTERCEPTOR INJECTION SCRIPT (src/lib/canvasInterceptor.js)
 * Injected into Electron WebContents/WebView for WebSabre canvas terminal scraping.
 * Overrides CanvasRenderingContext2D.prototype.fillText to capture drawn characters, X/Y, and attributes.
 */

export const CANVAS_INTERCEPTOR_SCRIPT = `
(function() {
  if (window._sabreInterceptorInjected) return;
  window._sabreInterceptorInjected = true;

  // Dictionary of Y-clusters to X-column maps
  // Format: { "100": { "5": charObj, "6": charObj } }
  window._sabreCaptureBuffer = {};

  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  const originalClearRect = CanvasRenderingContext2D.prototype.clearRect;
  const originalFillRect = CanvasRenderingContext2D.prototype.fillRect;

  const CHAR_WIDTH = 10;

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
  
  function getOrCreateYCluster(y) {
    const keys = Object.keys(window._sabreCaptureBuffer);
    for (let i = 0; i < keys.length; i++) {
      if (Math.abs(Number(keys[i]) - y) <= 6) { // 6px tolerance for subpixel fonts
        return keys[i];
      }
    }
    const newKey = String(y);
    window._sabreCaptureBuffer[newKey] = {};
    return newKey;
  }

  CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
    if (text === "\\u0000" || text === "\\x00" || (typeof text === "string" && text.charCodeAt(0) === 0)) {
      arguments[0] = " ";
      text = " ";
    }
    
    originalFillText.apply(this, arguments);

    if (text === undefined || text === null) return;
    const str = String(text);
    if (str.length === 0) return;

    const attr = extractAttributes(this);
    const clusterY = getOrCreateYCluster(Math.round(y));
    const rowObj = window._sabreCaptureBuffer[clusterY];

    let colIdx = Math.max(0, Math.floor(x / CHAR_WIDTH));

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      
      const existing = rowObj[colIdx];
      // Prevent background spaces from erasing text that was already drawn
      if (existing && existing.chr && existing.chr.trim() !== "" && char.trim() === "") {
        colIdx++;
        continue;
      }
      
      rowObj[colIdx] = {
        chr: char,
        x: Math.round(x + (i * CHAR_WIDTH)),
        y: Math.round(y),
        col: colIdx,
        row: -1, // Will be fixed during getSabreBuffer
        CR: false,
        attr: { ...attr }
      };

      colIdx++;
    }
  };

  CanvasRenderingContext2D.prototype.clearRect = function(x, y, w, h) {
    originalClearRect.apply(this, arguments);
    if (w > 300 && h > 200) {
      window._sabreCaptureBuffer = {};
    }
  };

  CanvasRenderingContext2D.prototype.fillRect = function(x, y, w, h) {
    originalFillRect.apply(this, arguments);
    if (w > 300 && h > 200) {
      window._sabreCaptureBuffer = {};
    }
  };

  function build2DArray() {
    const yKeys = Object.keys(window._sabreCaptureBuffer).map(Number).sort((a,b) => a - b);
    const buffer = [];
    
    for (let r = 0; r < yKeys.length; r++) {
      const yKey = String(yKeys[r]);
      const rowObj = window._sabreCaptureBuffer[yKey];
      const colKeys = Object.keys(rowObj).map(Number).sort((a,b) => a - b);
      
      const rowArray = [];
      for (let i = 0; i < colKeys.length; i++) {
        const cKey = colKeys[i];
        const charObj = Object.assign({}, rowObj[String(cKey)]);
        charObj.row = r;
        
        // Mark CR (Carriage Return) on the absolute last character of the row
        if (i === colKeys.length - 1) {
          charObj.CR = true;
        }
        
        rowArray[cKey] = charObj;
      }
      buffer.push(rowArray);
    }
    return buffer;
  }

  window._flushSabreBuffer = function() {
    const buffer = build2DArray();
    window._sabreCaptureBuffer = {};
    return buffer;
  };
  
  window._getSabreBuffer = function() {
    return build2DArray();
  };
})();
`;

if (typeof window !== "undefined") {
  try {
    eval(CANVAS_INTERCEPTOR_SCRIPT);
  } catch (e) {}
}

export default CANVAS_INTERCEPTOR_SCRIPT;
