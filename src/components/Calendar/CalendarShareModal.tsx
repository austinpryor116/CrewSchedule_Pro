"use client";

import { useState } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  Calendar as CalendarIcon,
  Globe,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Info,
  Layers,
  Heart,
  Plane,
  Building,
} from "lucide-react";
import { useCrewStore } from "../../store/useCrewStore";
import { downloadRosterIcsFile, generateRosterIcs } from "../../lib/icalExporter";

interface CalendarShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CalendarShareModal({ isOpen, onClose }: CalendarShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [includeHotels, setIncludeHotels] = useState(true);
  const [includeLegs, setIncludeLegs] = useState(true);
  const [includePersonalEvents, setIncludePersonalEvents] = useState(true);
  const [activeGuideTab, setActiveGuideTab] = useState<"apple" | "google" | "scale">("apple");

  const sequences = useCrewStore((state) => state.sequences);
  const payRates = useCrewStore((state) => state.payRates);
  const userProfile = useCrewStore((state) => state.userProfile);
  const personalEvents = useCrewStore((state) => state.personalEvents);
  const publishSchedule = useCrewStore((state) => state.publishScheduleToFamilyFeed);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const userToken = `crew-${userProfile.employeeId || "742840"}`;
  const httpsSubscriptionUrl = `${origin}/api/calendar/subscribe?token=${userToken}&hotels=${includeHotels}&legs=${includeLegs}`;
  const webcalUrl = httpsSubscriptionUrl.replace(/^http:\/\//, "webcal://").replace(/^https:\/\//, "webcal://");
  const googleCalendarUrl = `https://calendar.google.com/calendar/r/settings/addbyurl?cid=${encodeURIComponent(
    httpsSubscriptionUrl
  )}`;

  const handleCopyLink = async () => {
    navigator.clipboard.writeText(httpsSubscriptionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${userProfile.name || "Flight Crew"} Schedule`,
          text: `Here is my live flight schedule feed. Add it to your Apple or Google Calendar to stay synced:`,
          url: httpsSubscriptionUrl,
        });
      } catch (err) {
        // User cancelled or fallback
      }
    } else {
      handleCopyLink();
    }
  };

  const handlePublishNow = async () => {
    setIsPublishing(true);
    const ok = await publishSchedule();
    setIsPublishing(false);
    if (ok) {
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 3000);
    }
  };

  const handleDownload = () => {
    downloadRosterIcsFile(sequences, payRates);
  };

  return (
    <div className="fixed inset-0 z-[100000] bg-slate-950/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn font-sans">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 border border-sky-400/30 rounded-2xl text-sky-400 shrink-0">
              <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight flex items-center gap-2">
                <span>Share Schedule with Family</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-mono font-bold">
                  100% FREE
                </span>
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Live iCal subscription link for Apple Calendar (iCloud) & Google Calendar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="relative z-10 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer active-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 bg-slate-50/60">
          {/* Live Subscription URL Box */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-600" />
                Live iCal Subscription Feed
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePublishNow}
                  disabled={isPublishing}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-[10px] font-extrabold transition flex items-center gap-1 cursor-pointer active-press shadow-2xs"
                >
                  {publishSuccess ? (
                    <>
                      <Check className="w-3 h-3 text-white" />
                      <span>Live Synced!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span>{isPublishing ? "Syncing..." : "Publish Live Roster"}</span>
                    </>
                  )}
                </button>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono font-bold">
                  24/7 Sync
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Give this link to your spouse or family member. When added to their phone or Google Calendar once, it will <strong>automatically stay updated</strong> whenever you fly or swap trips!
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={httpsSubscriptionUrl}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 select-all font-bold"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer active-press shadow-xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            {/* Native 1-Tap Share via SMS / iMessage */}
            <button
              onClick={handleNativeShare}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer active-press shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>Send Link to Spouse / Family (iMessage / SMS / WhatsApp)</span>
            </button>
          </div>

          {/* Quick One-Tap Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Apple Calendar / iCloud */}
            <a
              href={webcalUrl}
              className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs transition hover:shadow-sm cursor-pointer active-press group"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 mb-1.5 group-hover:scale-110 transition">
                <Smartphone className="w-5 h-5" />
              </div>
              <span className="text-xs font-black text-slate-900">Apple Calendar</span>
              <span className="text-[10px] text-slate-500 font-medium">1-Tap iCloud Subscribe</span>
            </a>

            {/* Google Calendar */}
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs transition hover:shadow-sm cursor-pointer active-press group"
            >
              <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 mb-1.5 group-hover:scale-110 transition">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <span className="text-xs font-black text-slate-900">Google Calendar</span>
              <span className="text-[10px] text-slate-500 font-medium">Add to Gmail / Android</span>
            </a>

            {/* Direct .ICS Download */}
            <button
              onClick={handleDownload}
              className="p-3 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs transition hover:shadow-sm cursor-pointer active-press group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-1.5 group-hover:scale-110 transition">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-xs font-black text-slate-900">Download .ICS File</span>
              <span className="text-[10px] text-slate-500 font-medium">AirDrop or Offline Export</span>
            </button>
          </div>

          {/* Privacy & Detail Toggles */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              What Family Members See in the Feed
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLegs}
                  onChange={(e) => setIncludeLegs(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span className="font-bold text-slate-800 text-[11px]">Flight Legs & Times</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHotels}
                  onChange={(e) => setIncludeHotels(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span className="font-bold text-slate-800 text-[11px]">Layover Hotels & Info</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePersonalEvents}
                  onChange={(e) => setIncludePersonalEvents(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                />
                <span className="font-bold text-slate-800 text-[11px]">Personal Custom Events</span>
              </label>
            </div>
          </div>

          {/* Free Step-by-Step Family Setup Guide */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                How to Set It Up for Free on Any Device
              </span>

              {/* Guide Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[10px] font-bold">
                <button
                  onClick={() => setActiveGuideTab("apple")}
                  className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                    activeGuideTab === "apple" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                  }`}
                >
                  iPhone / iCloud
                </button>
                <button
                  onClick={() => setActiveGuideTab("google")}
                  className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                    activeGuideTab === "google" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                  }`}
                >
                  Google
                </button>
                <button
                  onClick={() => setActiveGuideTab("scale")}
                  className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                    activeGuideTab === "scale" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"
                  }`}
                >
                  500–1,000 Crew Scale
                </button>
              </div>
            </div>

            {activeGuideTab === "apple" && (
              <div className="space-y-1.5 text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900">📱 iPhone & iPad (Apple Calendar / iCloud):</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 pl-1">
                  <li>Tap <strong>Send Link to Spouse</strong> above, or tap the <strong>Apple Calendar</strong> button.</li>
                  <li>On iPhone: Open <strong>Settings ➔ Calendar ➔ Accounts ➔ Add Account</strong>.</li>
                  <li>Tap <strong>Other ➔ Add Subscribed Calendar</strong>.</li>
                  <li>Paste your link and tap <strong>Next ➔ Save</strong>.</li>
                  <li>Your flight schedule, report times, and layover hotels will appear on their phone and update automatically for free!</li>
                </ol>
              </div>
            )}

            {activeGuideTab === "google" && (
              <div className="space-y-1.5 text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900">🌐 Google Calendar (Android / Gmail / Spouse):</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 pl-1">
                  <li>Tap <strong>Copy Link</strong> or <strong>Send Link</strong> above.</li>
                  <li>Open <strong>calendar.google.com</strong> on any browser.</li>
                  <li>On the left sidebar next to <em>Other calendars</em>, click <strong>+ ➔ From URL</strong>.</li>
                  <li>Paste your subscription link and click <strong>Add Calendar</strong>.</li>
                  <li>Google Calendar will sync your schedule for free.</li>
                </ol>
              </div>
            )}

            {activeGuideTab === "scale" && (
              <div className="space-y-2 text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900">🚀 Production Multi-Tenant Architecture (500–1,000 Flight Crews):</p>
                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 space-y-0.5">
                    <strong className="text-slate-900 block">1. Serverless Edge Hub (Cloudflare Workers KV / Supabase Free Tier):</strong>
                    <span>Each pilot/FA app publishes roster updates to <code className="font-mono bg-slate-100 px-1 rounded">/api/calendar/publish</code> with their unique token. The edge hub serves live <code className="font-mono bg-slate-100 px-1 rounded">.ics</code> feeds to Apple & Google Calendar 24/7 globally at $0/month.</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 space-y-0.5">
                    <strong className="text-slate-900 block">2. Native iCloud Family Calendar Sharing (Zero Servers):</strong>
                    <span>The mobile app writes flights directly to the crew member's local iOS Calendar, and iOS automatically pushes updates to family members in real-time via Apple Family Sharing.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3.5 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer active-press shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
