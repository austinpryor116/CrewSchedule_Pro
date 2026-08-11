import React, { useState } from "react";
import { X, Calendar, Zap } from "lucide-react";
import { useCrewStore } from "@/store/useCrewStore";

interface HssSequenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute?: (sequences: any[]) => void;
}

export function HssSequenceModal({ isOpen, onClose, onExecute }: HssSequenceModalProps) {
  const sequences = useCrewStore((state) => state.sequences);
  const [selectedSeqIds, setSelectedSeqIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  // Filter out dropped/vacation if needed, or just show all parsed real sequences
  const validSequences = sequences.filter(s => !s.isDropped && !s.isGhost && s.sequenceNumber !== "VC");

  const toggleSelection = (id: string) => {
    setSelectedSeqIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div 
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-white">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">HSS Lookup</h2>
              <p className="text-xs font-medium text-teal-50">Select sequences to pull details</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Sequences */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
          {validSequences.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-500">No sequences found</p>
              <p className="text-xs text-slate-400 mt-1">Import your HI1 first</p>
            </div>
          ) : (
            validSequences.map((seq) => {
              const isSelected = selectedSeqIds.has(seq.id);
              
              // Formatting dates nicely
              const startObj = new Date(seq.startDate + "T12:00:00Z");
              const endObj = new Date(seq.endDate + "T12:00:00Z");
              const startFormatted = startObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const endFormatted = endObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

              return (
                <div
                  key={seq.id}
                  onClick={() => toggleSelection(seq.id)}
                  className={`
                    group relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200
                    ${isSelected 
                      ? "bg-teal-50 border-teal-500 shadow-md shadow-teal-500/20 scale-[1.02]" 
                      : "bg-white border-slate-200 hover:border-teal-300 hover:shadow-sm"}
                  `}
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <span className={`text-base font-black ${isSelected ? "text-teal-700" : "text-slate-800"}`}>
                      {seq.sequenceNumber}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg uppercase tracking-wider">
                      {seq.statusTag || "SKD"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{startFormatted} - {endFormatted}</span>
                    </div>
                    {seq.totalCreditMinutes > 0 && (
                      <span className="font-bold text-slate-700">
                        {(seq.totalCreditMinutes / 60).toFixed(2)} hrs
                      </span>
                    )}
                  </div>
                  
                  {isSelected && (
                    <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1/2 bg-teal-500 rounded-r-full" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={selectedSeqIds.size === 0}
            onClick={() => {
              if (selectedSeqIds.size > 0) {
                const selected = validSequences.filter(s => selectedSeqIds.has(s.id));
                if (onExecute) onExecute(selected);
                onClose();
                setSelectedSeqIds(new Set()); // Reset selection after executing
              }
            }}
            className={`
              flex-[2] py-3.5 rounded-xl font-bold text-white shadow-lg transition-all
              ${selectedSeqIds.size > 0 
                ? "bg-teal-500 hover:bg-teal-600 hover:shadow-teal-500/30 shadow-teal-500/20 transform hover:-translate-y-0.5 active:translate-y-0" 
                : "bg-slate-300 cursor-not-allowed shadow-none"}
            `}
          >
            Pull HSS ({selectedSeqIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}
