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
  window._sabreCaptureBuffer = [];

  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  const CHAR_HEIGHT = 18;
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

  CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
    originalFillText.apply(this, arguments);
    if (text === undefined || text === null) return;
    const str = String(text);
    if (str.length === 0) return;

    const attr = extractAttributes(this);
    const rowIdx = Math.max(0, Math.floor(y / CHAR_HEIGHT));

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

    const currentRow = window._sabreCaptureBuffer[rowIdx];
    if (currentRow && currentRow.length > 0) {
      const last = currentRow[currentRow.length - 1];
      if (last) last.CR = true;
    }
  };

  window._flushSabreBuffer = function() {
    const bufferCopy = JSON.parse(JSON.stringify(window._sabreCaptureBuffer || []));
    window._sabreCaptureBuffer = [];
    return bufferCopy;
  };
})();
`;

app.disableHardwareAcceleration();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    show: true,
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

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Standard Desktop Chrome User-Agent for PingFederate / Duo MFA / AA SSO attestation checks
  const DESKTOP_USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  // Override User-Agent globally for all requests
  session.defaultSession.setUserAgent(DESKTOP_USER_AGENT);

  // 1. ELECTRON MAIN PROCESS & SECURITY BYPASS
  // Intercept headers and strip X-Frame-Options and Content-Security-Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };

    Object.keys(responseHeaders).forEach((header) => {
      const lower = header.toLowerCase();
      if (lower === "x-frame-options" || lower === "content-security-policy") {
        delete responseHeaders[header];
      }
    });

    callback({ responseHeaders });
  });

  // Inject User-Agent on all outgoing web requests
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    details.requestHeaders["User-Agent"] = DESKTOP_USER_AGENT;
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });

  // 2. SSO LOGIN & POP-UP WINDOW HANDLER (Duo MFA & Corporate SSO)
  // Intercept window.open / target="_blank" popups and load inside existing portal view
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log("[Electron Main] Intercepted pop-up URL request:", url);
    // Route SSO/Duo login directly inside main window/portal view
    if (url.includes("duosecurity.com") || url.includes("sso") || url.includes("login") || url.includes("aa.com")) {
      mainWindow.loadURL(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Intercept webview pop-ups and keep attached
  app.on("web-contents-created", (event, contents) => {
    if (contents.getType() === "webview") {
      contents.setUserAgent(DESKTOP_USER_AGENT);

      contents.setWindowOpenHandler(({ url }) => {
        console.log("[Electron Webview] Redirecting popup inside webview:", url);
        contents.loadURL(url);
        return { action: "deny" };
      });

      const injectInterceptor = () => {
        contents.executeJavaScript(CANVAS_INTERCEPTOR_SCRIPT).catch((err) => {
          // Frame state loading
        });
      };

      // Automatically inject canvas interceptor into webview across all lifecycle events
      contents.on("dom-ready", injectInterceptor);
      contents.on("did-frame-finish-load", injectInterceptor);
      contents.on("did-navigate-in-page", injectInterceptor);
    }
  });

  // Load Next.js local server or static build
  const startUrl = process.env.ELECTRON_START_URL || "http://localhost:3000";
  mainWindow.loadURL(startUrl);

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
