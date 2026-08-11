import { useCrewStore } from "../store/useCrewStore";

type LogCategory = "PARSER" | "DECS_API" | "CALENDAR" | "SYSTEM";

class LogicLoggerEngine {
  private log(category: LogCategory, message: string, details?: any) {
    // 1. Output to browser console with specific prefix so Electron main.js can route to decs_debug.log
    const logString = `[LOGIC:${category}] ${message} ${details ? JSON.stringify(details) : ""}`;
    console.log(logString);

    // 2. Output to the Zustand store so the UI (Logic Trace Panel) can display it
    try {
      useCrewStore.getState().addLogicLog({
        category,
        message,
        details
      });
    } catch (e) {
      // Store might not be initialized yet
    }
  }

  public parser(message: string, details?: any) {
    this.log("PARSER", message, details);
  }

  public decs(message: string, details?: any) {
    this.log("DECS_API", message, details);
  }

  public calendar(message: string, details?: any) {
    this.log("CALENDAR", message, details);
  }

  public system(message: string, details?: any) {
    this.log("SYSTEM", message, details);
  }
}

export const LogicLogger = new LogicLoggerEngine();
