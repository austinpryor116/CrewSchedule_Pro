/**
 * ELECTRON IPC WINDOW DECLARATIONS (src/types/electron.d.ts)
 */

export interface ElectronAPI {
  sendMacro: (macroString: string) => Promise<{ success: boolean; macro?: string; error?: string }>;
  injectCanvasInterceptor: () => Promise<{ success: boolean }>;
  flushSabreBuffer: () => Promise<any[]>;
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
