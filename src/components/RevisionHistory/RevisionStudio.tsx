"use client";

import { useState } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import { ScheduleSnapshot, ScheduleDiffItem } from "../../types";
import { parseHI1Schedule, diffScheduleSnapshots } from "../../lib/parser";
import { History, FileText, ArrowRight, AlertTriangle, ShieldCheck, Clock, Calendar, CheckCircle2, FileUp, Sparkles, AlertCircle, PlusCircle, MinusCircle, RefreshCw } from "lucide-react";

export default function RevisionStudio() {
  const snapshots = useCrewStore((state) => state.snapshots);
  const activeSnapshotId = useCrewStore((state) => state.activeSnapshotId);
  const setActiveSnapshotId = useCrewStore((state) => state.setActiveSnapshotId);
  const addSnapshot = useCrewStore((state) => state.addSnapshot);

  const [pastedText, setPastedText] = useState("");
  const [sourceFileNameInput, setSourceFileNameInput] = useState("HI1_upload.pdf");
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    activeSnapshotId || (snapshots.length > 0 ? snapshots[0].id : null)
  );

  const activeSnapshot = snapshots.find((s) => s.id === (selectedSnapshotId || activeSnapshotId)) || snapshots[0];

  const handleCreateSnapshotFromText = () => {
    if (!pastedText.trim()) return;
    
    // Extract AS OF line if available
    const asOfMatch = pastedText.match(/AS OF\s+([A-Z0-9\/\s]+)/i);
    const asOfStr = asOfMatch ? asOfMatch[1].trim() : `UPLOADED_${new Date().toLocaleTimeString()}`;
    const monthMatch = pastedText.match(/MONTH ENDING\s+([A-Z0-9]+)/i);
    const monthStr = monthMatch ? monthMatch[1].trim() : "CURRENT";

    const parsedSeqs = parseHI1Schedule(pastedText);

    // Compute diffs against previous snapshot
    const prevSnapshot = snapshots.length > 0 ? snapshots[0] : null;
    const computedDiffs = prevSnapshot ? diffScheduleSnapshots(prevSnapshot.sequences, parsedSeqs) : [];

    const totalCreditMins = parsedSeqs.reduce((acc, s) => acc + s.totalCreditMinutes, 0);
    const totalBlockMins = parsedSeqs.reduce((acc, s) => acc + s.totalBlockMinutes, 0);

    const newSnapshot: ScheduleSnapshot = {
      id: `snap-${Date.now()}`,
      asOfDateStr: asOfStr,
      uploadedAt: new Date().toISOString(),
      sourceFileName: sourceFileNameInput || "Uploaded_HI1.pdf",
      monthLabel: monthStr,
      sequences: parsedSeqs,
      rawText: pastedText,
      diffs: computedDiffs,
      projectedCreditHours: totalCreditMins / 60,
      flownBlockHours: totalBlockMins / 60,
    };

    addSnapshot(newSnapshot);
    setSelectedSnapshotId(newSnapshot.id);
    setActiveSnapshotId(newSnapshot.id);
    setPastedText("");
  };

  const getDiffBadge = (diff: ScheduleDiffItem) => {
    switch (diff.type) {
      case "REASSIGNMENT":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Reassignment (RA)
          </span>
        );
      case "CREDIT_CHANGE":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Credit Pay Adjustment
          </span>
        );
      case "TRIP_DROPPED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-500/20 border border-slate-600 text-slate-300 flex items-center gap-1">
            <MinusCircle className="w-3 h-3" /> Trip Dropped
          </span>
        );
      case "TRIP_ADDED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
            <PlusCircle className="w-3 h-3" /> Trip Added
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-sky-500/15 border border-sky-500/30 text-sky-400">
            Schedule Change
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <History className="w-6 h-6 text-sky-600" />
              <h1 className="text-xl font-extrabold text-slate-900">Schedule Revision Studio & Audit Trail</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-100 border border-sky-300 text-sky-900">
                Local Computer Persistent
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Track historical HI1/HSS uploads, audit reassignments (<code className="text-rose-700 font-bold">RA</code>), inspect flight time adjustments, and switch schedule snapshot versions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-right">
              <span className="text-[10px] font-extrabold text-slate-600 uppercase block">Total Snapshots</span>
              <span className="text-sm font-extrabold text-sky-700">{snapshots.length} Versions Saved</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Timeline & Snapshots list */}
        <div className="xl:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <h2 className="text-sm font-bold text-slate-900">Upload Timeline</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-600">HI Document Versions</span>
            </div>

            <div className="space-y-3">
              {snapshots.map((snap) => {
                const isSelected = snap.id === (selectedSnapshotId || activeSnapshotId);
                const isActiveInStore = snap.id === activeSnapshotId;
                const hasReassignments = snap.diffs.some((d) => d.type === "REASSIGNMENT");

                return (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedSnapshotId(snap.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-sky-50 border-sky-400 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <FileText className={`w-4 h-4 ${isSelected ? "text-sky-600" : "text-slate-400"}`} />
                        <span className="text-xs font-bold text-slate-900">{snap.sourceFileName}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 font-bold">
                        {snap.monthLabel}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 font-bold">
                      <span className="font-mono text-sky-700">AS OF {snap.asOfDateStr}</span>
                      <span className="text-slate-900">{snap.projectedCreditHours.toFixed(2)}h credit</span>
                    </div>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200 text-[10px]">
                      {hasReassignments ? (
                        <span className="text-rose-700 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Reassignment (RA)
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">No reassignments</span>
                      )}

                      {isActiveInStore ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active Roster
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSnapshotId(snap.id);
                          }}
                          className="text-sky-700 hover:text-sky-900 font-bold underline cursor-pointer"
                        >
                          Load as Active
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Importer / Snapshot Creator Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FileUp className="w-4 h-4 text-sky-600" />
              <h2 className="text-sm font-bold text-slate-900">Upload New HI Document</h2>
            </div>
            <p className="text-[11px] text-slate-600 mb-3 font-medium">
              Paste raw HI1/HSS report text below. A new version snapshot will be created without overwriting existing history.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Source File Name</label>
                <input
                  type="text"
                  value={sourceFileNameInput}
                  onChange={(e) => setSourceFileNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">Raw HI Report Text</label>
                <textarea
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste HI1/HSS report text here..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-600"
                />
              </div>

              <button
                onClick={handleCreateSnapshotFromText}
                disabled={!pastedText.trim()}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Save Version Snapshot
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Snapshot Audit Log & Diffs */}
        <div className="xl:col-span-8 space-y-6">
          {activeSnapshot ? (
            <>
              {/* Selected Snapshot Details Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-5 h-5 text-sky-600" />
                      <h2 className="text-lg font-black text-slate-900">{activeSnapshot.sourceFileName}</h2>
                    </div>
                    <p className="text-xs text-slate-600 font-mono font-bold">
                      Timestamp Header: <span className="text-sky-700 font-extrabold">AS OF {activeSnapshot.asOfDateStr}</span> • Month: {activeSnapshot.monthLabel}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeSnapshot.id === activeSnapshotId ? (
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 border border-emerald-300 text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Active Roster Version
                      </span>
                    ) : (
                      <button
                        onClick={() => setActiveSnapshotId(activeSnapshot.id)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition cursor-pointer flex items-center gap-1.5"
                      >
                        Set as Active Schedule
                      </button>
                    )}
                  </div>
                </div>

                {/* Audit Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-600 font-extrabold uppercase block">Line Credit Hours</span>
                    <span className="text-base font-black text-slate-900">{activeSnapshot.projectedCreditHours.toFixed(2)}h</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-600 font-extrabold uppercase block">Flown Block Hours</span>
                    <span className="text-base font-black text-slate-900">{activeSnapshot.flownBlockHours.toFixed(2)}h</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-600 font-extrabold uppercase block">Total Sequences</span>
                    <span className="text-base font-black text-sky-700">{activeSnapshot.sequences.length} Trips</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-600 font-extrabold uppercase block">Audit Diffs Detected</span>
                    <span className="text-base font-black text-amber-700">{activeSnapshot.diffs.length} Changes</span>
                  </div>
                </div>
              </div>

              {/* Audit Diffs List */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-sky-600" />
                    <h3 className="text-base font-bold text-slate-900">Audit Trail & Change Log</h3>
                  </div>
                  <span className="text-xs text-slate-600 font-bold">Automated Version Diff</span>
                </div>

                {activeSnapshot.diffs.length > 0 ? (
                  <div className="space-y-3">
                    {activeSnapshot.diffs.map((diff) => (
                      <div
                        key={diff.id}
                        className={`p-4 rounded-xl border ${
                          diff.type === "REASSIGNMENT"
                            ? "bg-rose-50 border-rose-300"
                            : diff.type === "CREDIT_CHANGE"
                            ? "bg-amber-50 border-amber-300"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {getDiffBadge(diff)}
                            <span className="font-mono text-xs font-bold text-slate-900">
                              Seq {diff.sequenceNumber}
                            </span>
                          </div>
                          {diff.creditDeltaMinutes !== undefined && diff.creditDeltaMinutes !== 0 && (
                            <span
                              className={`text-xs font-black font-mono ${
                                diff.creditDeltaMinutes > 0 ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {diff.creditDeltaMinutes > 0 ? "+" : ""}
                              {(diff.creditDeltaMinutes / 60).toFixed(2)}h credit
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-800 leading-relaxed font-sans font-medium mb-2">
                          {diff.description}
                        </p>

                        {(diff.oldValue || diff.newValue) && (
                          <div className="flex items-center gap-3 text-[11px] font-mono bg-white p-2.5 rounded-lg border border-slate-200 mt-2 font-bold">
                            {diff.oldValue && (
                              <div className="text-slate-600">
                                <span className="text-[9px] text-slate-500 block uppercase font-sans">Previous</span>
                                <span>{diff.oldValue}</span>
                              </div>
                            )}
                            {diff.oldValue && diff.newValue && <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                            {diff.newValue && (
                              <div className="text-sky-700 font-extrabold">
                                <span className="text-[9px] text-slate-500 block uppercase font-sans">New / Reassigned</span>
                                <span>{diff.newValue}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2 opacity-80" />
                    <p className="text-sm font-bold text-slate-900">Base Roster Version</p>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      No reassignments or schedule changes detected relative to baseline.
                    </p>
                  </div>
                )}
              </div>

              {/* Sequences in this Snapshot */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Sequences Included in This Version</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeSnapshot.sequences.map((seq) => (
                    <div
                      key={seq.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Seq {seq.sequenceNumber}</span>
                          {seq.statusTag && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                seq.statusTag === "RA"
                                  ? "bg-rose-100 border border-rose-300 text-rose-950"
                                  : seq.statusTag === "OT"
                                  ? "bg-amber-100 border border-amber-300 text-amber-950"
                                  : "bg-slate-200 text-slate-800"
                              }`}
                            >
                              {seq.statusTag}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono font-bold">
                          {seq.startDate} ➔ {seq.endDate} • {seq.base} {seq.equipment}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-sky-700 font-bold text-xs block">
                          {(seq.totalCreditMinutes / 60).toFixed(2)}h
                        </span>
                        <span className="text-[10px] text-slate-600 font-bold">
                          {seq.layoverCities.join("-") || "Turn"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-900">No Snapshot Selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
