/**
 * ELECTRON IPC WINDOW DECLARATIONS (src/types/electron.d.ts)
 */

export interface ElectronAPI {
  sendMacro: (macroString: string) => Promise<{ success: boolean; macro?: string; error?: string }>;
  injectCanvasInterceptor: () => Promise<{ success: boolean }>;
  flushSabreBuffer: () => Promise<any[]>;
  fetchRemoteUrl: (url: string) => Promise<{ success: boolean; text?: string; status?: number; error?: string }>;
  writeDebugLog: (logText: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  onTerminalResponse: (callback: (response: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    _sabreCaptureBuffer?: any[];
    _flushSabreBuffer?: () => any[];
    _sabreInterceptorInjected?: boolean;
  }
}
