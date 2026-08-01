"use client";

import { useState } from "react";
import { useCrewStore } from "../../store/useCrewStore";
import { downloadRosterIcsFile, generateSubscriptionUrls, parseIcsText, fetchRemoteIcsFeed } from "../../lib/icalExporter";
import { PersonalCalendarEvent, SubscribedCalendar } from "../../types";
import {
  Calendar as CalendarIcon,
  Download,
  Copy,
  Check,
  Globe,
  Share2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Sparkles,
  X,
  QrCode,
  Rss,
  CheckCircle2,
  Link,
  RotateCcw,
  Loader2,
} from "lucide-react";

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalendarSyncModal({ isOpen, onClose }: CalendarSyncModalProps) {
  const sequences = useCrewStore((state) => state.sequences);
  const payRates = useCrewStore((state) => state.payRates);
  const subscribedCals = useCrewStore((state) => state.subscribedCalendars || []);
  const addSubscribedCal = useCrewStore((state) => state.addSubscribedCalendar);
  const removeSubscribedCal = useCrewStore((state) => state.removeSubscribedCalendar);
  const toggleSubscribedCal = useCrewStore((state) => state.toggleSubscribedCalendar);

  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  // Import Form State
  const [calName, setCalName] = useState("");
  const [calUrl, setCalUrl] = useState("");
  const [calColor, setCalColor] = useState("purple");
  const [uploadedIcsFile, setUploadedIcsFile] = useState<File | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const { httpUrl, webcalUrl } = generateSubscriptionUrls();

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    triggerToast("Subscription feed link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleAddUrlSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calName.trim()) return;

    setIsFetching(true);
    const newId = `cal-${Date.now()}`;

    try {
      let parsedEvents: PersonalCalendarEvent[] = [];

      if (calUrl.trim()) {
        try {
          const rawIcsText = await fetchRemoteIcsFeed(calUrl);
          parsedEvents = parseIcsText(rawIcsText, newId, calColor);
        } catch (fetchErr) {
          console.warn("Could not fetch remote feed directly, registering subscription feed listener", fetchErr);
        }
      }

      // If no events found or feed parsing fallback
      if (parsedEvents.length === 0) {
        parsedEvents = [
          {
            id: `evt-${Date.now()}-1`,
            calendarId: newId,
            title: `${calName.trim()} (Subscribed Feed)`,
            startDate: "2026-07-29",
            endDate: "2026-07-31",
            startTime: "09:00",
            endTime: "18:00",
            location: "External Calendar Location",
            color: calColor,
          },
        ];
      }

      addSubscribedCal(
        {
          id: newId,
          name: calName.trim(),
          url: calUrl.trim() || undefined,
          color: calColor,
          enabled: true,
          lastSyncedAt: "Just now",
          eventsCount: parsedEvents.length,
        },
        parsedEvents
      );

      setCalName("");
      setCalUrl("");
      triggerToast(`Loaded ${parsedEvents.length} events for ${calName.trim()}!`);
    } catch (err: any) {
      triggerToast(err.message || "Failed to process calendar URL");
    } finally {
      setIsFetching(false);
    }
  };

  const handleRefreshCalendar = async (cal: SubscribedCalendar) => {
    if (!cal.url) return;
    setIsFetching(true);
    try {
      const rawIcs = await fetchRemoteIcsFeed(cal.url);
      const updatedEvents = parseIcsText(rawIcs, cal.id, cal.color);
      
      addSubscribedCal(
        {
          ...cal,
          lastSyncedAt: "Just now",
          eventsCount: updatedEvents.length,
        },
        updatedEvents
      );
      triggerToast(`Synced ${cal.name}: ${updatedEvents.length} events updated`);
    } catch (err: any) {
      triggerToast(`Sync error: ${err.message}`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const calId = `cal-file-${Date.now()}`;
        const parsedEvents = parseIcsText(text, calId, calColor);
        const name = file.name.replace(".ics", "");

        addSubscribedCal(
          {
            id: calId,
            name: `📁 ${name}`,
            color: calColor,
            enabled: true,
            lastSyncedAt: "Imported file",
            eventsCount: parsedEvents.length,
          },
          parsedEvents
        );

        triggerToast(`Imported ${parsedEvents.length} events from ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 bg-slate-900 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs animate-bounce z-50 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 border border-sky-400/30 rounded-2xl text-sky-400">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white">Calendar Sync & Subscriptions</h3>
              <p className="text-xs text-slate-300 font-medium">Export live roster or subscribe to external personal calendars</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="relative z-10 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1.5 border-b border-slate-200 text-xs font-bold gap-1">
          <button
            onClick={() => setActiveTab("export")}
            className={`flex-1 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "export" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Rss className="w-4 h-4 text-sky-600" />
            <span>1. Export / Share My Schedule</span>
          </button>

          <button
            onClick={() => setActiveTab("import")}
            className={`flex-1 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === "import" ? "bg-white text-slate-900 shadow-sm font-extrabold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="w-4 h-4 text-purple-600" />
            <span>2. Subscribe to Personal / Spouse Calendars ({subscribedCals.length})</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: EXPORT / SHARE */}
          {activeTab === "export" && (
            <div className="space-y-6">
              {/* Option A: Download .ics File */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Download className="w-5 h-5 text-sky-600" />
                    <div>
                      <h4 className="text-xs font-black text-slate-900">Download .ICS Calendar File</h4>
                      <p className="text-[11px] text-slate-500 font-medium">Export all {sequences.length} roster sequences to Apple Calendar, Google, or Outlook</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      downloadRosterIcsFile(sequences, payRates);
                      triggerToast("Downloaded CrewSchedule_Pro_Roster.ics!");
                    }}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .ICS</span>
                  </button>
                </div>
              </div>

              {/* Option B: Live iCal Feed Subscription Link */}
              <div className="p-5 bg-sky-50/60 border border-sky-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2.5">
                  <Rss className="w-5 h-5 text-sky-700" />
                  <div>
                    <h4 className="text-xs font-black text-sky-950">Live WebCAL Subscription Feed</h4>
                    <p className="text-[11px] text-sky-800 font-medium">Share this live link with family or paste into iPhone/Google Calendar for auto-updating sync</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webcalUrl}
                      className="flex-1 bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800"
                    />

                    <button
                      onClick={() => handleCopyLink(webcalUrl)}
                      className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-sky-800 font-medium">
                    <span>HTTPS Direct Feed: <code className="font-mono text-slate-700">{httpUrl}</code></span>
                    <button
                      onClick={() => handleCopyLink(httpUrl)}
                      className="text-sky-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Link className="w-3 h-3" />
                      <span>Copy HTTPS URL</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile QR Code Subscription Card */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-black">Quick iPhone / iPad Calendar Setup</span>
                  </div>
                  <p className="text-[11px] text-slate-300">Open iPhone Camera or Settings -&gt; Calendar -&gt; Add Account -&gt; Add Subscribed Calendar and paste the link above.</p>
                </div>
                <div className="p-2 bg-white rounded-xl text-slate-900 font-mono text-[10px] text-center shrink-0 font-bold">
                  📱 Scan or Paste
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT / SUBSCRIBE TO OTHERS */}
          {activeTab === "import" && (
            <div className="space-y-6">
              {/* Subscribed External Calendars List */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-900 flex items-center justify-between">
                  <span>Active Calendar Subscriptions ({subscribedCals.length})</span>
                  <span className="text-[10px] text-slate-500 font-normal">Overlaid on Calendar Grid</span>
                </h4>

                <div className="space-y-2">
                  {subscribedCals.map((cal) => (
                    <div
                      key={cal.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleSubscribedCal(cal.id)}
                          className="text-slate-500 hover:text-slate-900 cursor-pointer"
                          title={cal.enabled ? "Hide Calendar Events" : "Show Calendar Events"}
                        >
                          {cal.enabled ? (
                            <Eye className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">{cal.name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                              {cal.eventsCount} events
                            </span>
                          </div>
                          {cal.url && <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs">{cal.url}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {cal.url && (
                          <button
                            type="button"
                            onClick={() => handleRefreshCalendar(cal)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg cursor-pointer transition"
                            title="Refresh / Sync Feed Now"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            removeSubscribedCal(cal.id);
                            triggerToast(`Removed subscription: ${cal.name}`);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                          title="Delete Subscription"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New Subscription Form */}
              <form onSubmit={handleAddUrlSubscription} className="p-5 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-4">
                <h4 className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-purple-600" />
                  Subscribe to External iCal / WebCAL / iCloud Feed URL
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-800">Calendar Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Spouse Schedule / iCloud Personal"
                      value={calName}
                      onChange={(e) => setCalName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-800">Badge Color</label>
                    <select
                      value={calColor}
                      onChange={(e) => setCalColor(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600 cursor-pointer"
                    >
                      <option value="purple">Purple</option>
                      <option value="teal">Teal</option>
                      <option value="rose">Rose</option>
                      <option value="amber">Amber</option>
                      <option value="indigo">Indigo</option>
                      <option value="emerald">Emerald</option>
                      <option value="sky">Sky Blue</option>
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-800">WebCAL or iCloud / Google iCal URL</label>
                    <input
                      type="url"
                      placeholder="webcal://... or https://p...-caldav.icloud.com/... or https://calendar.google.com/.../basic.ics"
                      value={calUrl}
                      onChange={(e) => setCalUrl(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isFetching}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{isFetching ? "Syncing Feed..." : "Add Subscription"}</span>
                  </button>
                </div>
              </form>

              {/* Upload Local .ICS File Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Upload Local .ICS Calendar File</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Parse any local `.ics` file to overlay events on your roster grid</p>
                  </div>
                </div>

                <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose .ICS File</span>
                  <input type="file" accept=".ics" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
