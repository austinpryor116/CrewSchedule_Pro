/**
 * ASYNC MACRO ENGINE & SMART LISTENER (src/lib/macroEngine.ts)
 * Manages macro execution,^E step splitting, DOM input simulation, polling, and screen response parsing.
 */

import { CanvasBuffer, CanvasBufferDecoder } from "./canvasDecoder";

export interface MacroExecutorOptions {
  timeoutMs?: number;
  pollIntervalMs?: number;
  terminalInputSelector?: string;
  executor?: {
    flushBuffer?: () => Promise<CanvasBuffer> | CanvasBuffer;
    sendInput?: (text: string) => Promise<void> | void;
    executeJS?: (script: string) => Promise<any>;
  };
}

/**
 * Polls window._flushSabreBuffer() every pollIntervalMs until a valid, populated CanvasBuffer is captured
 * or until timeoutMs is reached.
 */
export async function waitForTerminalResponse(
  timeoutMs: number = 5000,
  options?: MacroExecutorOptions
): Promise<CanvasBuffer> {
  const pollInterval = options?.pollIntervalMs || 200;

  return new Promise<CanvasBuffer>((resolve, reject) => {
    const startTime = Date.now();

    const intervalId = setInterval(async () => {
      try {
        let buffer: CanvasBuffer | null = null;

        if (options?.executor?.flushBuffer) {
          buffer = await options.executor.flushBuffer();
        } else if (options?.executor?.executeJS) {
          buffer = await options.executor.executeJS(
            "window._flushSabreBuffer ? window._flushSabreBuffer() : []"
          );
        } else if (typeof window !== "undefined" && (window as any)._flushSabreBuffer) {
          buffer = (window as any)._flushSabreBuffer();
        }

        // Validate buffer has populated content
        if (
          buffer &&
          Array.isArray(buffer) &&
          buffer.length > 0 &&
          buffer.some((row) => Array.isArray(row) && row.length > 0)
        ) {
          clearInterval(intervalId);
          resolve(buffer);
          return;
        }

        if (Date.now() - startTime >= timeoutMs) {
          clearInterval(intervalId);
          reject(
            new Error(`waitForTerminalResponse timed out after ${timeoutMs}ms waiting for canvas buffer render.`)
          );
        }
      } catch (err) {
        clearInterval(intervalId);
        reject(err);
      }
    }, pollInterval);
  });
}

/**
 * Injects command string into target terminal DOM input element and simulates Enter key press.
 */
export async function sendTerminalInput(
  command: string,
  options?: MacroExecutorOptions
): Promise<void> {
  if (options?.executor?.sendInput) {
    await options.executor.sendInput(command);
    return;
  }

  const selector =
    options?.terminalInputSelector ||
    '#sabreInput, input[name="sabreCmd"], #cmdInput, input[type="text"]';

  const jsCode = `
    (function() {
      const input = document.querySelector('${selector}');
      if (input) {
        input.value = ${JSON.stringify(command)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        // Simulate Enter key events
        const enterDown = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
        const enterPress = new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });
        const enterUp = new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true });

        input.dispatchEvent(enterDown);
        input.dispatchEvent(enterPress);
        input.dispatchEvent(enterUp);

        if (input.form) {
          input.form.dispatchEvent(new Event('submit', { bubbles: true }));
        }
      }
    })();
  `;

  if (options?.executor?.executeJS) {
    await options.executor.executeJS(jsCode);
  } else if (typeof window !== "undefined") {
    eval(jsCode);
  }
}

/**
 * Executes a macro string containing commands delimited by the ^E token.
 * 1. Splits macroString by ^E.
 * 2. Injects step string into terminal DOM input & simulates Enter key.
 * 3. Awaits waitForTerminalResponse() for canvas rendering completion.
 * 4. Passes final buffer through CanvasBufferDecoder and returns flat text.
 */
export async function executeCommand(
  macroString: string,
  options?: MacroExecutorOptions
): Promise<string> {
  if (!macroString) return "";

  // 1. Split macroString by ^E token (ENTER key)
  const steps = macroString.split("^E").filter((s) => s !== undefined);
  const timeoutMs = options?.timeoutMs || 5000;

  let lastBuffer: CanvasBuffer = [];

  for (let i = 0; i < steps.length; i++) {
    const stepCommand = steps[i];

    if (stepCommand && stepCommand.trim().length > 0) {
      // 2. Inject command step and simulate Enter key
      await sendTerminalInput(stepCommand.trim(), options);
    }

    // 3. Await waitForTerminalResponse to guarantee terminal screen render
    try {
      lastBuffer = await waitForTerminalResponse(timeoutMs, options);
    } catch (err) {
      console.warn(`Step ${i + 1}/${steps.length} ('${stepCommand}') wait notice:`, err);
    }
  }

  // 4. Pass final buffer through CanvasBufferDecoder and return flat text
  return CanvasBufferDecoder.decode(lastBuffer);
}
