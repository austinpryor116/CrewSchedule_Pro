const { contextBridge, ipcRenderer } = require("electron");

/**
 * PRELOAD SCRIPT & SECURE IPC BRIDGE (electron/preload.js)
 * Exposes a safe window.electronAPI object to the Next.js React frontend.
 */

contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * Sends ^E delimited macro command strings from React frontend to main process
   */
  sendMacro: (macroString) => ipcRenderer.invoke("send-macro", macroString),

  /**
   * Injects Canvas Interceptor Script into current web contents
   */
  injectCanvasInterceptor: () => ipcRenderer.invoke("inject-canvas-interceptor"),

  /**
   * Flushes 2D canvas capture buffer from target window
   */
  flushSabreBuffer: () => ipcRenderer.invoke("flush-sabre-buffer"),

  /**
   * Fetches remote iCal / webcal / CORS-restricted feed URLs using native main process
   */
  fetchRemoteUrl: (url) => ipcRenderer.invoke("fetch-remote-url", url),

  /**
   * Subscribes to terminal response events returned from main process / portal
   */
  onTerminalResponse: (callback) => {
    ipcRenderer.on("terminal-response", (_event, response) => callback(response));
  },
});
