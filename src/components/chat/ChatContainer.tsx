"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMessageStore } from "../../store/useMessageStore";
import { useCrewStore } from "../../store/useCrewStore";
import MessageBubble from "./MessageBubble";
import TacticalMacroBar from "./TacticalMacroBar";
import TradeProposalModal from "./TradeProposalModal";
import ChannelList from "./ChannelList";
import {
  Lock,
  Moon,
  Zap,
  Sparkles,
  Plane,
  ChevronLeft,
  ShieldCheck,
  Info,
  Plus,
  ArrowUp,
  Building2,
  Users,
  X,
  MessageSquare,
  CornerDownRight,
  Edit2,
  Trash2,
  Pin,
  MoreVertical,
} from "lucide-react";

export default function ChatContainer() {
  const sequences = useCrewStore((s) => s.sequences);
  const userProfile = useCrewStore((s) => s.userProfile);

  const {
    channels,
    activeChannelId,
    messages,
    typingUsers,
    restShieldStatus,
    replyingTo,
    editingMessage,
    initializeMessaging,
    setActiveChannelId,
    sendMessage,
    editMessage,
    deleteChannel,
    togglePinChannel,
    setReplyingTo,
    setEditingMessage,
    toggleManualDnd,
  } = useMessageStore();


  const [inputContent, setInputContent] = useState<string>("");
  const [showMacroDrawer, setShowMacroDrawer] = useState<boolean>(false);
  const [showTradeModal, setShowTradeModal] = useState<boolean>(false);
  const [showSecurityInfo, setShowSecurityInfo] = useState<boolean>(false);
  const [showAttachMenu, setShowAttachMenu] = useState<boolean>(false);
  const [showChannelMenu, setShowChannelMenu] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize messaging on mount or when sequences update
  useEffect(() => {
    initializeMessaging(sequences, userProfile);
  }, [initializeMessaging, sequences, userProfile]);

  // Handle setting input text when entering edit mode
  useEffect(() => {
    if (editingMessage) {
      setInputContent(editingMessage.content);
      inputRef.current?.focus();
    }
  }, [editingMessage]);

  // Focus input when quoting / replying
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const currentMessages = activeChannelId ? messages[activeChannelId] || [] : [];
  const unreadTotal = channels.reduce((sum, ch) => sum + (ch.unreadCount || 0), 0);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (activeChannelId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentMessages.length, activeChannelId]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputContent.trim()) return;

    const textToSend = inputContent.trim();
    setInputContent("");
    setShowAttachMenu(false);
    setShowMacroDrawer(false);

    if (editingMessage) {
      await editMessage(editingMessage.channelId, editingMessage.messageId, textToSend);
    } else {
      await sendMessage({ content: textToSend });
    }
  };

  const handleSendActiveFlightLeg = async () => {
    for (const seq of sequences) {
      if (seq.isDropped || !seq.dutyPeriods) continue;
      for (const dp of seq.dutyPeriods) {
        for (const leg of dp.legs) {
          await sendMessage({
            content: `✈️ Active Flight Leg: ${leg.flightNumber} (${leg.depAirport} ➔ ${leg.arrAirport}) scheduled dep ${leg.depTime}.`,
            embeddedLeg: {
              flightNumber: leg.flightNumber,
              depAirport: leg.depAirport,
              arrAirport: leg.arrAirport,
              depTime: leg.depTime,
              arrTime: leg.arrTime,
              tailNumber: leg.tailNumber || "N824NN",
              aircraftType: leg.equipment || "E175",
              gate: leg.depAirport === "ORD" ? "G12" : "B4",
              status: "ON_TIME",
            },
          });
          setShowAttachMenu(false);
          return;
        }
      }
    }
  };

  const getChannelAvatar = () => {
    if (!activeChannel) return <Plane className="w-5 h-5 text-slate-700" />;
    switch (activeChannel.type) {
      case "DIRECT": {
        const initials = (activeChannel.title || "Crew")
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("");
        return <span className="font-bold text-xs text-sky-800">{initials}</span>;
      }
      case "SEQUENCE":
        return <Plane className="w-5 h-5 text-amber-600" />;
      case "BASE":
        return <Building2 className="w-5 h-5 text-sky-600" />;
      case "TRADE_MARKETPLACE":
        return <Sparkles className="w-5 h-5 text-emerald-600" />;
      default:
        return <Users className="w-5 h-5 text-slate-700" />;
    }
  };

  return (
    <div className="flex h-full w-full bg-[#f8fafc] text-slate-900 overflow-hidden relative font-sans select-none">
      {/* MASTER CONVERSATION LIST */}
      <div
        className={`h-full w-full lg:w-80 shrink-0 ${
          activeChannelId ? "hidden lg:block" : "block"
        }`}
      >
        <ChannelList onSelectChannel={(id) => setActiveChannelId(id)} />
      </div>

      {/* ACTIVE CONVERSATION SCREEN */}
      <div
        className={`flex-1 flex flex-col h-full min-w-0 bg-[#f8fafc] relative ${
          !activeChannelId ? "hidden lg:flex" : "flex"
        }`}
      >
        {activeChannelId && activeChannel ? (
          <>
            {/* iOS / Samsung Top Navigation Bar */}
            <div className="px-3 pt-[max(3rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-2.5 bg-white/95 border-b border-slate-200 backdrop-blur-md flex items-center justify-between shrink-0 shadow-xs z-30 relative">
              {/* Left: Back to Messages List Button */}
              <button
                onClick={() => setActiveChannelId(null)}
                className="flex items-center gap-0.5 text-[#007AFF] hover:text-sky-700 transition cursor-pointer active:scale-95 text-xs font-bold py-1 px-1 -ml-1"
                title="Back to Messages"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
                <span>Messages</span>
                {unreadTotal > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#007AFF] text-white text-[10px] font-bold">
                    {unreadTotal}
                  </span>
                )}
              </button>

              {/* Center: Contact / Group Header */}
              <div
                className="flex flex-col items-center text-center min-w-0 mx-2 cursor-pointer"
                onClick={() => setShowSecurityInfo(!showSecurityInfo)}
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-2xs mb-0.5">
                  {getChannelAvatar()}
                </div>
                <div className="flex items-center gap-1 max-w-[180px] sm:max-w-[280px]">
                  <span className="font-black text-[13px] text-slate-900 truncate leading-tight">
                    {activeChannel.title}
                  </span>
                  {activeChannel.isEncrypted && (
                    <Lock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                  )}
                  {activeChannel.isPinned && (
                    <Pin className="w-2.5 h-2.5 text-sky-600 shrink-0 fill-sky-600" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500 truncate max-w-[160px] sm:max-w-[240px] leading-none mt-0.5 font-medium">
                  {activeChannel.type === "SEQUENCE"
                    ? `${activeChannel.participantDetails.length} Crew Members • E2EE`
                    : activeChannel.subtitle || "Tap for details"}
                </span>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleManualDnd(8)}
                  className={`p-1.5 rounded-full border transition cursor-pointer active:scale-95 ${
                    restShieldStatus?.isSleepShieldActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-900"
                  }`}
                  title={restShieldStatus?.reason || "Toggle Rest Shield"}
                >
                  <Moon className={`w-4 h-4 ${restShieldStatus?.isSleepShieldActive ? "text-emerald-600 animate-pulse" : ""}`} />
                </button>

                <button
                  onClick={() => setShowChannelMenu(!showChannelMenu)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 hover:text-slate-900 transition cursor-pointer active:scale-95"
                  title="Channel Options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              {/* Channel Options Dropdown */}
              {showChannelMenu && (
                <div className="absolute right-3 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 min-w-[180px] animate-scaleIn text-xs font-semibold">
                  <button
                    onClick={() => {
                      togglePinChannel(activeChannel.id);
                      setShowChannelMenu(false);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer text-left"
                  >
                    <Pin className="w-3.5 h-3.5 text-sky-600" />
                    <span>{activeChannel.isPinned ? "Unpin Chat" : "Pin to Top"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowSecurityInfo(!showSecurityInfo);
                      setShowChannelMenu(false);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer text-left"
                  >
                    <Info className="w-3.5 h-3.5 text-slate-500" />
                    <span>Encryption Info</span>
                  </button>

                  <button
                    onClick={() => {
                      deleteChannel(activeChannel.id);
                      setShowChannelMenu(false);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Conversation</span>
                  </button>
                </div>
              )}
            </div>

            {/* Security Banner */}
            {showSecurityInfo && (
              <div className="p-3.5 bg-amber-50/90 border-b border-amber-200 text-xs text-slate-800 flex items-start justify-between animate-fadeIn shadow-xs z-20">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-amber-900 text-xs block">End-to-End Encrypted (AES-256-GCM)</span>
                    <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed">
                      Messages in this conversation are cryptographically secured on your device using Web Crypto AES-256-GCM with unique 96-bit IVs.
                    </p>
                    {restShieldStatus?.isSleepShieldActive && (
                      <div className="mt-1.5 p-1.5 rounded-lg bg-emerald-100 border border-emerald-300 text-[10.5px] text-emerald-900 font-medium">
                        🌙 {restShieldStatus.reason}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowSecurityInfo(false)}
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Chat Timeline */}
            <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-2.5 scrollbar-thin bg-[#f8fafc]">
              {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-16">
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-3 text-slate-400">
                    <Lock className="w-6 h-6 text-amber-600/80" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">Conversation Initialized</p>
                  <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                    Messages are encrypted. Tap the <span className="text-[#007AFF] font-bold">+</span> button below for tactical aviation macros.
                  </p>
                </div>
              ) : (
                currentMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isCurrentUser={msg.sender.userId === "user-current"}
                  />
                ))
              )}

              {/* Animated Typing Indicator */}
              {activeChannelId && (typingUsers[activeChannelId] || []).length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/90 rounded-2xl w-fit text-slate-600 text-xs animate-fadeIn border border-slate-200/80 mb-2">
                  <div className="flex items-center gap-1 px-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="font-semibold text-[11px] text-slate-500">
                    {(typingUsers[activeChannelId] || []).join(", ")}{" "}
                    {(typingUsers[activeChannelId] || []).length === 1 ? "is typing..." : "are typing..."}
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>


            {/* Tactical Macro Drawer */}
            {showMacroDrawer && (
              <div className="animate-slideUp shrink-0 border-t border-slate-200 shadow-lg bg-white">
                <TacticalMacroBar onMacroTriggered={() => setShowMacroDrawer(false)} />
              </div>
            )}

            {/* Attachment & Action Popup */}
            {showAttachMenu && (
              <div className="p-3 bg-white border-t border-slate-200 animate-slideUp flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    setShowMacroDrawer(true);
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold transition cursor-pointer active:scale-95 shrink-0"
                >
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>Aviation Macros</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowTradeModal(true);
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 text-sky-800 border border-sky-300 text-xs font-bold transition cursor-pointer active:scale-95 shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  <span>Propose Trade</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendActiveFlightLeg}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold transition cursor-pointer active:scale-95 shrink-0"
                >
                  <Plane className="w-4 h-4 text-emerald-600" />
                  <span>Embed Flight Leg</span>
                </button>
              </div>
            )}

            {/* Quoted Message / Replying-To Banner */}
            {replyingTo && (
              <div className="px-3.5 py-2 bg-sky-50 border-t border-sky-200 flex items-center justify-between shrink-0 text-xs text-sky-900 animate-fadeIn">
                <div className="flex items-center gap-2 min-w-0">
                  <CornerDownRight className="w-4 h-4 text-sky-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold block text-[11px] text-sky-800">
                      Replying to {replyingTo.sender.name}
                    </span>
                    <span className="text-[10.5px] text-sky-700 truncate block">
                      {replyingTo.content}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 text-sky-600 hover:text-sky-800 rounded-full hover:bg-sky-100 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Editing Message Banner */}
            {editingMessage && (
              <div className="px-3.5 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-between shrink-0 text-xs text-amber-900 animate-fadeIn">
                <div className="flex items-center gap-2 min-w-0">
                  <Edit2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold text-[11px] text-amber-800">
                    Editing message...
                  </span>
                </div>
                <button
                  onClick={() => {
                    setEditingMessage(null);
                    setInputContent("");
                  }}
                  className="px-2 py-0.5 text-xs font-bold text-amber-800 hover:bg-amber-100 rounded-md transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Light Capsule Input Dock */}
            <div className="px-3 py-2 bg-white/95 border-t border-slate-200 backdrop-blur-md shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                {/* Plus (+) Action Button */}
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-90 shrink-0 ${
                    showAttachMenu
                      ? "bg-slate-800 text-white rotate-45"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                  }`}
                  title="Attach Aviation Macro or Trade"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </button>

                {/* Capsule Input Field */}
                <div className="flex-1 relative flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputContent}
                    onChange={(e) => setInputContent(e.target.value)}
                    placeholder={
                      editingMessage
                        ? "Edit your message..."
                        : replyingTo
                        ? `Reply to ${replyingTo.sender.name}...`
                        : activeChannel.type === "DIRECT"
                        ? `Message ${activeChannel.title}...`
                        : "Type a message..."
                    }
                    className="w-full pl-4 pr-10 py-2 rounded-full bg-slate-100 border border-slate-300 text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#007AFF] focus:bg-white transition shadow-2xs font-sans"
                  />

                  {!inputContent && (
                    <button
                      type="button"
                      onClick={() => setShowMacroDrawer(!showMacroDrawer)}
                      className="absolute right-3 text-amber-600 hover:text-amber-700 transition cursor-pointer p-0.5"
                      title="Tactical Macros"
                    >
                      <Zap className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Send / Update Button */}
                <button
                  type="submit"
                  disabled={!inputContent.trim()}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs ${
                    inputContent.trim()
                      ? "bg-[#007AFF] hover:bg-[#0062D2] text-white active:scale-90 shadow-sky-500/25"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/40"
                  }`}
                >
                  <ArrowUp className="w-4 h-4 stroke-[3]" />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* Desktop Placeholder */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-8 bg-[#f8fafc]">
            <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-4 text-[#007AFF] shadow-xs">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-1">Select a Conversation</h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Choose a crew member from the list or tap the pencil to start a new chat.
            </p>
          </div>
        )}
      </div>

      {/* Trade Proposal Bottom Sheet Modal */}
      <TradeProposalModal
        isOpen={showTradeModal}
        onClose={() => setShowTradeModal(false)}
      />
    </div>
  );
}
