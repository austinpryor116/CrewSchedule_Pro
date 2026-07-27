/**
 * Macro Automation Execution Engine
 * Handles `^E` tokenization and sequential async execution of DECS terminal macros.
 */

import { useCrewStore } from "../store/useCrewStore";

export interface MacroExecutionOptions {
  delayMs?: number;
  onStepExecute?: (commandStep: string, stepIndex: number, totalSteps: number) => void;
  onComplete?: (fullOutput: string[]) => void;
  onError?: (failedStep: string, error: Error, stepIndex: number) => void;
}

/**
 * Tokenizes a raw macro string containing `^E` delimiters into an array of sequential command steps.
 */
export function tokenizeMacroString(macroString: string): string[] {
  if (!macroString) return [];
  // Split on ^E token and remove trailing empty entries if any
  const steps = macroString
    .split(/\^E/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return steps;
}

/**
 * Executes a tokenized macro string sequentially with a configurable delay gap between steps.
 */
export async function executeMacroSequence(
  macroString: string,
  delayMs: number = 300,
  options?: MacroExecutionOptions
): Promise<string[]> {
  const steps = tokenizeMacroString(macroString);
  const outputs: string[] = [];
  const addLog = useCrewStore.getState().addConsoleLog;

  addLog(`[MACRO ENGINE] Initializing execution of ${steps.length} step(s)...`);

  for (let i = 0; i < steps.length; i++) {
    const stepCommand = steps[i];
    const logMsg = `[EXEC] Step ${i + 1}/${steps.length}: Sending "${stepCommand}"`;
    addLog(logMsg);

    if (options?.onStepExecute) {
      options.onStepExecute(stepCommand, i, steps.length);
    }

    try {
      // Simulate real-time terminal step response output
      const simulatedOutput = `[DECS OK] ${stepCommand} executed successfully`;
      outputs.push(simulatedOutput);

      // Delay gap between terminal commands
      if (i < steps.length - 1 || delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      addLog(`[ERROR] Step ${i + 1} failed on "${stepCommand}": ${errorObj.message}`);
      if (options?.onError) {
        options.onError(stepCommand, errorObj, i);
      }
      throw errorObj;
    }
  }

  addLog(`[SUCCESS] Macro Sequence completed cleanly (${steps.length} steps).`);
  if (options?.onComplete) {
    options.onComplete(outputs);
  }

  return outputs;
}
