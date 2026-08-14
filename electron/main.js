const { app, BrowserWindow, session, ipcMain } = require("electron");
const path = require("path");

let mainWindow = null;

/**
 * CANVAS INTERCEPTOR INJECTION SCRIPT STRING
 */
const CANVAS_INTERCEPTOR_SCRIPT = `
(function() {
  if (window._sabreInterceptorInjected) return;
  window._sabreInterceptorInjected = true;

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
      if (Math.abs(Number(keys[i]) - y) <= 6) {
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
      if (existing && existing.chr && existing.chr.trim() !== "" && char.trim() === "") {
        colIdx++;
        continue;
      }
      
      rowObj[colIdx] = {
        chr: char,
        x: Math.round(x + (i * CHAR_WIDTH)),
        y: Math.round(y),
        col: colIdx,
        row: -1,
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

/**
 * DOM MONITOR & TARGET INSPECTOR INJECTION SCRIPT STRING
 * Tracks every click, focus, and input event to record exact CSS selectors and coordinates.
 */
const DOM_MONITOR_SCRIPT = `
(function() {
  if (window._domMonitorInjected) return;
  window._domMonitorInjected = true;
  window._lastInspectedElement = null;
  window._eventLogBuffer = [];

  function getCssSelector(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    if (el.id) return '#' + el.id;
    if (el.getAttribute('data-decs-input')) return '[data-decs-input="true"]';
    if (el.name) return el.tagName.toLowerCase() + '[name="' + el.name + '"]';
    
    let path = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += '#' + current.id;
        path.unshift(selector);
        break;
      } else {
        let sib = current, nth = 1;
        while (sib = sib.previousElementSibling) {
          if (sib.tagName.toLowerCase() === selector) nth++;
        }
        if (nth !== 1) selector += ':nth-of-type(' + nth + ')';
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(' > ');
  }

  function logElementEvent(eventType, target) {
    if (!target || target.nodeType !== Node.ELEMENT_NODE) return;
    const selector = getCssSelector(target);
    const rect = target.getBoundingClientRect ? target.getBoundingClientRect() : {};
    
    const info = {
      eventType: eventType,
      tagName: target.tagName,
      id: target.id || '',
      name: target.name || '',
      type: target.type || '',
      placeholder: target.placeholder || '',
      selector: selector,
      value: target.value || '',
      x: Math.round(rect.left || 0),
      y: Math.round(rect.top || 0),
      width: Math.round(rect.width || 0),
      height: Math.round(rect.height || 0),
      timestamp: new Date().toLocaleTimeString()
    };

    window._lastInspectedElement = info;
    if (!window._eventLogBuffer) window._eventLogBuffer = [];
    window._eventLogBuffer.unshift(info);
    if (window._eventLogBuffer.length > 50) window._eventLogBuffer.pop();
  }

  document.addEventListener('click', function(e) { logElementEvent('CLICK', e.target); }, true);
  document.addEventListener('focusin', function(e) { logElementEvent('FOCUS', e.target); }, true);
  document.addEventListener('input', function(e) { logElementEvent('TYPING', e.target); }, true);

  window._getInspectedTarget = function() {
    return window._lastInspectedElement || null;
  };
  window._getEventLogs = function() {
    return window._eventLogBuffer || [];
  };
})();
`;

app.disableHardwareAcceleration();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    show: true,
    backgroundColor: "#ffffff",
    autoHideMenuBar: false,
    title: "CrewSchedule Pro Desktop - WebSabre Native Terminal",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true, // Enables <webview> tags for WebSabre portal embedding
      sandbox: false,
    },
  });

  // Standard Desktop Chrome User-Agent for PingFederate / Duo MFA / AA SSO attestation checks
  const DESKTOP_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  // Override User-Agent globally for all requests
  session.defaultSession.setUserAgent(DESKTOP_USER_AGENT);

  // 1. ELECTRON MAIN PROCESS & SECURITY BYPASS
  // Upgrade any unencrypted HTTP requests to HTTPS for aa.com domains to avoid Akamai EdgeSuite blocks
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    if (details.url.startsWith("http://webfos.aa.com") || details.url.startsWith("http://fosp.aa.com") || details.url.startsWith("http://login.aa.com")) {
      return callback({ redirectURL: details.url.replace("http://", "https://") });
    }
    callback({});
  });

  // Intercept headers and strip X-Frame-Options and Content-Security-Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (!details.responseHeaders) {
      callback({ responseHeaders: {} });
      return;
    }
    const responseHeaders = { ...details.responseHeaders };

    Object.keys(responseHeaders).forEach((header) => {
      const lower = header.toLowerCase();
      if (lower === "x-frame-options" || lower === "content-security-policy") {
        delete responseHeaders[header];
      }
    });

    callback({ responseHeaders });
  });

  // Inject standard desktop browser headers on all outgoing web requests
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = details.requestHeaders || {};
    requestHeaders["User-Agent"] = DESKTOP_USER_AGENT;
    if (details.url.includes("aa.com")) {
      requestHeaders["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";
      requestHeaders["Accept-Language"] = "en-US,en;q=0.9";
      requestHeaders["Sec-Ch-Ua"] = '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"';
      requestHeaders["Sec-Ch-Ua-Mobile"] = "?0";
      requestHeaders["Sec-Ch-Ua-Platform"] = '"Windows"';
      requestHeaders["Upgrade-Insecure-Requests"] = "1";
    }
    callback({ cancel: false, requestHeaders });
  });

  // Log renderer console messages directly to log files
  mainWindow.webContents.on("console-message", (event, level, message) => {
    try {
      const fs = require("fs");
      const path = require("path");
      
      let formattedMessage = message;
      if (typeof message === 'string' && message.includes('[object Object]')) {
         formattedMessage = "[Array/Object omitted to save log space]";
      }

      const isLogicLog = typeof message === 'string' && message.startsWith("[LOGIC:");
      const logFileName = isLogicLog ? "logic_debug.log" : "decs_debug.log";
      const logPath = path.join(__dirname, "..", logFileName);
      
      let entry = "";
      if (isLogicLog) {
        // For logic logs, it already has the prefix, just add timestamp
        entry = `[${new Date().toISOString()}] ${formattedMessage}\n`;
      } else {
        entry = `[${new Date().toISOString()}] [RENDERER CONSOLE L${level}] ${String(formattedMessage)}\n`;
      }
      
      fs.appendFileSync(logPath, entry, "utf8");
    } catch (e) {}
  });

  // 2. SSO LOGIN & POP-UP WINDOW HANDLER (Duo MFA & Corporate SSO)
  // Prevent pop-up requests from replacing main application window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log("[Electron Main] Intercepted pop-up URL request:", url);
    return { action: "deny" };
  });

  // Intercept webview pop-ups and handle load errors cleanly
  app.on("web-contents-created", (event, contents) => {
    if (contents.getType() === "webview") {
      contents.setUserAgent(DESKTOP_USER_AGENT);

      contents.setWindowOpenHandler(({ url }) => {
        console.log("[Electron Webview] Redirecting popup inside webview:", url);
        contents.loadURL(url).catch(() => {});
        return { action: "deny" };
      });

      contents.on("did-fail-load", (e, errorCode, errorDescription, validatedURL) => {
        if (errorCode !== -3) {
          console.log(`[Electron Webview] Network notice (${errorCode}): ${errorDescription} for ${validatedURL}`);
        }
      });

      // Capture all WebSabre / webview console messages directly into decs_debug.log
      contents.on("console-message", (e, level, message, line, sourceId) => {
        try {
          const fs = require("fs");
          const path = require("path");
          
          let formattedMessage = message;
          if (typeof message === 'string' && message.includes('[object Object]')) {
             formattedMessage = "[Array/Object omitted to save log space]";
          }

          const isLogicLog = typeof message === 'string' && message.startsWith("[LOGIC:");
          const logFileName = isLogicLog ? "logic_debug.log" : "decs_debug.log";
          const logPath = path.join(__dirname, "..", logFileName);
          
          let entry = "";
          if (isLogicLog) {
            entry = `[${new Date().toISOString()}] ${formattedMessage}\n`;
          } else {
            entry = `[${new Date().toISOString()}] [WEBVIEW CONSOLE L${level}] ${formattedMessage} (${sourceId}:${line})\n`;
          }
          fs.appendFileSync(logPath, entry, "utf8");
        } catch (err) {}
      });

      const injectInterceptor = () => {
        contents.executeJavaScript(CANVAS_INTERCEPTOR_SCRIPT).catch(() => {});
        contents.executeJavaScript(DOM_MONITOR_SCRIPT).catch(() => {});
      };

      // Automatically inject canvas & DOM monitor interceptors into webview across all lifecycle events
      contents.on("dom-ready", injectInterceptor);
      contents.on("did-frame-finish-load", injectInterceptor);
      contents.on("did-navigate-in-page", injectInterceptor);
    }
  });

  // Load Next.js local server or static build
  const startUrl = process.env.ELECTRON_START_URL || "http://127.0.0.1:3000";

  // Retry loading startUrl automatically if dev server is still booting up
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL && (validatedURL.includes("127.0.0.1") || validatedURL.includes("localhost"))) {
      console.log(`[Electron Main] Server booting on 127.0.0.1:3000 (${errorDescription}). Retrying in 800ms...`);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(startUrl).catch(() => {});
        }
      }, 800);
    }
  });

  mainWindow.loadURL(startUrl).catch((err) => {
    console.log("[Electron Main] Initial loadURL notice:", err.message);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 3. IPC COMMUNICATION HANDLERS
ipcMain.handle("send-macro", async (event, macroString) => {
  console.log("[Electron IPC] Received send-macro command:", macroString);

  if (!mainWindow) return { success: false, error: "Main window inactive" };

  try {
    // Inject and execute canvas interceptor if not already present
    await mainWindow.webContents.executeJavaScript(CANVAS_INTERCEPTOR_SCRIPT);
    return { success: true, macro: macroString };
  } catch (err) {
    console.error("[Electron IPC] Macro routing error:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("inject-canvas-interceptor", async () => {
  if (mainWindow) {
    await mainWindow.webContents.executeJavaScript(CANVAS_INTERCEPTOR_SCRIPT);
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle("flush-sabre-buffer", async () => {
  if (mainWindow) {
    return await mainWindow.webContents.executeJavaScript(
      "window._flushSabreBuffer ? window._flushSabreBuffer() : []"
    );
  }
  return [];
});

ipcMain.handle("write-debug-log", async (event, logText) => {
  try {
    const fs = require("fs");
    const logPath = path.join(__dirname, "..", "decs_debug.log");
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${logText}\n`;
    fs.appendFileSync(logPath, entry, "utf8");
    return { success: true, path: logPath };
  } catch (err) {
    console.error("[Electron IPC] Error writing debug log:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("fetch-remote-url", async (event, targetUrl) => {
  console.log("[Electron IPC] Fetching remote URL feed:", targetUrl);
  let url = String(targetUrl || "").trim();
  if (url.startsWith("webcal://")) url = url.replace("webcal://", "https://");
  if (url.startsWith("webcals://")) url = url.replace("webcals://", "https://");
  if (!url.startsWith("http://") && !url.startsWith("https://")) url = `https://${url}`;

  const https = require("https");
  const http = require("http");
  const client = url.startsWith("https") ? https : http;

  return new Promise((resolve) => {
    const req = client.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "*/*",
        },
      },
      (res) => {
        // Follow HTTP redirects (301, 302, 307, 308)
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          console.log("[Electron IPC] Redirecting to:", res.headers.location);
          return resolve(ipcMain.emit("fetch-remote-url", event, res.headers.location));
        }

        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () =>
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 400,
            text: data,
            status: res.statusCode,
          })
        );
      }
    );

    req.on("error", (err) => {
      console.error("[Electron IPC] Fetch error:", err);
      resolve({ success: false, error: err.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ success: false, error: "Network request timeout (10s)" });
    });
  });
});

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
