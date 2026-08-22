"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught application error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleResetData = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("crewschedule_sequences");
        localStorage.removeItem("crewschedule_vacations");
        localStorage.removeItem("crewschedule_showoverlay");
        localStorage.removeItem("crewschedule_opensequences");
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  private handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black tracking-tight text-white">Application Encountered an Issue</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                A component error occurred while rendering the view. Your data is safe. You can reload or restore clean live schedule defaults below.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 active-press transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetData}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/20 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 active-press transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <span>Clear Cache & Reset Defaults</span>
              </button>
            </div>

            {/* Collapsible Error Details */}
            <div className="pt-2 border-t border-slate-800 text-left">
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-400 py-1"
              >
                <span>Diagnostics & Error Stack</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-2 p-3 bg-black/60 border border-slate-800 rounded-xl overflow-x-auto text-[10px] font-mono text-rose-300/90 max-h-48 whitespace-pre-wrap">
                  <div className="font-bold mb-1">{this.state.error?.toString()}</div>
                  <div className="text-slate-500">{this.state.errorInfo?.componentStack}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
