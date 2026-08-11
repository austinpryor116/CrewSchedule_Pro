import React from "react";
import { useCrewStore } from "../store/useCrewStore";

interface LogicTraceModalProps {
  onClose: () => void;
}

export function LogicTraceModal({ onClose }: LogicTraceModalProps) {
  const logicLogs = useCrewStore((state) => state.logicLogs);
  const clearLogicLogs = useCrewStore((state) => state.clearLogicLogs);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">System Logic Trace</h2>
            <p className="text-sm text-slate-500">Deep-dive diagnostic logs for parser decisions</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={clearLogicLogs}
              className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded hover:bg-red-100"
            >
              Clear Logs
            </button>
            <button 
              onClick={onClose}
              className="text-slate-500 hover:bg-slate-100 rounded-full p-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Logs Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-900 font-mono text-xs">
          {logicLogs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              No logic logs recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {logicLogs.map((log) => (
                <div key={log.id} className="border-l-2 border-sky-500 pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sky-400 font-bold">[{log.category}]</span>
                    <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-200 font-semibold">{log.message}</div>
                  {log.details && (
                    <div className="mt-1 bg-slate-800 rounded p-2 text-slate-400 whitespace-pre-wrap text-[10px]">
                      {JSON.stringify(log.details, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
