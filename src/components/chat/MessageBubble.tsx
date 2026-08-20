"use client";

import React, { useEffect, useState, useRef } from "react";
import { ChatMessage, TradeOfferEmbed, FlightLegSummaryEmbed } from "../../types";
import { decryptMessage, getCachedRoomKey } from "../../lib/messaging/cryptoShield";
import { useMessageStore } from "../../store/useMessageStore";
import {
  Lock,
  Clock,
  AlertCircle,
  Plane,
  ArrowRight,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  XCircle,
  Tag,
  MoreHorizontal,
  Reply,
  Copy,
  Edit2,
  Trash2,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Check,
  ExternalLink,
} from "lucide-react";
import HssDetailModal from "./HssDetailModal";

interface MessageBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
}

const EMOJI_REACTIONS = ["❤️", "👍", "👎", "😂", "❗", "✈️"];

export default function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const [displayText, setDisplayText] = useState<string>(message.content);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [showHssBreakdown, setShowHssBreakdown] = useState<boolean>(false);
  const [showHssModal, setShowHssModal] = useState<boolean>(false);



  const decryptedContents = useMessageStore((s) => s.decryptedContents);
  const updateTradeStatus = useMessageStore((s) => s.updateTradeStatus);
  const deleteMessage = useMessageStore((s) => s.deleteMessage);
  const addReaction = useMessageStore((s) => s.addReaction);
  const setReplyingTo = useMessageStore((s) => s.setReplyingTo);
  const setEditingMessage = useMessageStore((s) => s.setEditingMessage);

  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (message.encrypted && message.iv) {
      if (decryptedContents[message.id]) {
        setDisplayText(decryptedContents[message.id]);
      } else {
        setIsDecrypting(true);
        getCachedRoomKey(message.channelId)
          .then((key) => decryptMessage(message.content, message.iv!, key))
          .then((decrypted) => {
            setDisplayText(decrypted);
            setIsDecrypting(false);
          })
          .catch((err) => {
            console.warn("[MessageBubble] Decryption fallback:", err);
            setDisplayText(message.content);
            setIsDecrypting(false);
          });
      }
    } else {
      setDisplayText(message.content);
    }
  }, [message, decryptedContents]);

  // Format timestamp (e.g. 10:45 AM)
  const timeFormatted = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "CA":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "FO":
        return "bg-sky-100 text-sky-800 border-sky-300";
      case "FA":
        return "bg-teal-100 text-teal-800 border-teal-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setShowMenu(false);
    }, 1000);
  };

  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReplyingTo({ ...message, content: displayText });
    setShowMenu(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingMessage({
      channelId: message.channelId,
      messageId: message.id,
      content: displayText,
    });
    setShowMenu(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteMessage(message.channelId, message.id);
    setShowMenu(false);
  };

  const handleEmojiClick = async (e: React.MouseEvent, emoji: string) => {
    e.stopPropagation();
    await addReaction(message.channelId, message.id, emoji);
    setShowMenu(false);
  };

  // Long-press detection for mobile
  const handleTouchStart = () => {
    touchTimerRef.current = setTimeout(() => {
      setShowMenu(true);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  // Status subtitle like iMessage / Samsung Messages
  const renderDeliveryReceipt = () => {
    if (!isCurrentUser) return null;
    switch (message.status) {
      case "QUEUED":
        return (
          <span className="text-[10.5px] text-amber-600 font-semibold flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span>Queued (Offline)</span>
          </span>
        );
      case "SENDING":
        return (
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            <span>Sending...</span>
          </span>
        );
      case "SENT":
        return <span className="text-[10px] text-slate-500 font-medium">Sent</span>;
      case "DELIVERED":
        return <span className="text-[10px] text-slate-500 font-medium">Delivered</span>;
      case "READ":
        return <span className="text-[10px] text-sky-600 font-semibold">Read {timeFormatted}</span>;
      case "FAILED":
        return (
          <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>Not Delivered</span>
          </span>
        );
    }
  };

  const totalReactions = Object.entries(message.reactions || {});

  return (
    <>
      {/* Click-outside backdrop to dismiss context menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[0.5px]"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }}
        />
      )}

      <div
        className={`flex flex-col mb-3 max-w-[88%] sm:max-w-[76%] relative group select-text ${
          isCurrentUser ? "ml-auto items-end" : "mr-auto items-start"
        }`}
      >
        {/* Sender Header */}
        {!isCurrentUser && (
          <div className="flex items-center gap-1.5 mb-1 px-2.5">
            <span className="text-[11px] font-bold text-slate-700 tracking-tight">
              {message.sender.name}
            </span>
            <span
              className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border ${getRoleBadge(
                message.sender.role
              )}`}
            >
              {message.sender.role}
            </span>
            <span className="text-[9.5px] text-slate-500 font-mono">
              {message.sender.base}
            </span>
          </div>
        )}

        {/* Quoted / Replied Message Banner */}
        {message.replyToMessage && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1 mb-1 rounded-xl text-[11px] max-w-full truncate ${
              isCurrentUser
                ? "bg-sky-100 text-sky-900 border-l-2 border-[#007AFF]"
                : "bg-slate-200 text-slate-800 border-l-2 border-slate-400"
            }`}
          >
            <CornerDownRight className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="font-bold truncate shrink-0">{message.replyToMessage.senderName}:</span>
            <span className="truncate italic">{message.replyToMessage.textSnippet}</span>
          </div>
        )}

        {/* Main Message Bubble */}
        <div className="relative group/bubble flex items-center">
          {/* Quick Menu Button (Left for current user) */}
          {isCurrentUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 mr-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition cursor-pointer active:scale-95"
              title="Options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          )}

          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowMenu(true);
            }}
            className={`relative px-4 py-2.5 text-[14px] leading-snug select-text shadow-2xs transition ${
              isCurrentUser
                ? "bg-[#007AFF] text-white rounded-[22px] rounded-br-[6px] shadow-sky-500/15"
                : "bg-[#E9E9EB] text-slate-900 rounded-[22px] rounded-bl-[6px] border border-slate-300/40"
            }`}
          >
            {/* Quick Macro Tag Pill */}
            {message.quickMacroTag && (
              <div
                className={`flex items-center gap-1 mb-1.5 text-[10px] font-bold px-2 py-0.5 rounded-lg border w-fit ${
                  isCurrentUser
                    ? "bg-sky-700 text-sky-100 border-sky-300/40"
                    : "bg-amber-100 text-amber-900 border-amber-300"
                }`}
              >
                <Tag className="w-2.5 h-2.5" />
                <span>
                  {message.quickMacroTag === "CREW_VAN" && "🚐 HOTEL CREW VAN"}
                  {message.quickMacroTag === "GATE_HOLD" && "🚪 GATE / ATC HOLD"}
                  {message.quickMacroTag === "DEICING" && "❄️ DE-ICING PAD"}
                  {message.quickMacroTag === "RUNNING_LATE" && "⏱️ INBOUND DELAY"}
                  {message.quickMacroTag === "REST_START" && "🛡️ FAR 117 REST START"}
                </span>
              </div>
            )}

            {/* Text Content */}
            <div className="whitespace-pre-wrap break-words tracking-[-0.01em]">
              {isDecrypting ? (
                <span className="italic text-slate-500 flex items-center gap-1 text-xs">
                  <Lock className="w-3 h-3 text-amber-600 animate-pulse" /> Decrypting message...
                </span>
              ) : (
                displayText
              )}
              {message.isEdited && (
                <span className={`text-[10px] ml-1.5 font-medium ${isCurrentUser ? "text-sky-200" : "text-slate-400"}`}>
                  (edited)
                </span>
              )}
            </div>

            {/* Flight Leg Summary */}
            {message.embeddedLeg && (
              <div
                className={`mt-2.5 p-3 rounded-2xl border text-xs ${
                  isCurrentUser
                    ? "bg-sky-800/60 border-sky-400/40 text-white"
                    : "bg-white border-slate-200 shadow-xs text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between border-b pb-1.5 mb-2 border-slate-200/50">
                  <div className="flex items-center gap-1.5">
                    <Plane className={`w-3.5 h-3.5 ${isCurrentUser ? "text-sky-200" : "text-sky-600"}`} />
                    <span className="font-extrabold text-xs">
                      Flight {message.embeddedLeg.flightNumber}
                    </span>
                    {message.embeddedLeg.aircraftType && (
                      <span className={`text-[10px] font-mono ${isCurrentUser ? "text-sky-200" : "text-slate-500"}`}>
                        ({message.embeddedLeg.aircraftType})
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {message.embeddedLeg.status || "ON_TIME"}
                  </span>
                </div>

                <div className="flex items-center justify-between font-mono">
                  <div className="text-left">
                    <div className={`font-black text-sm ${isCurrentUser ? "text-amber-300" : "text-slate-900"}`}>
                      {message.embeddedLeg.depAirport}
                    </div>
                    <div className={`text-[10px] ${isCurrentUser ? "text-sky-200" : "text-slate-500"}`}>
                      {message.embeddedLeg.depTime}
                    </div>
                  </div>

                  <div className="flex flex-col items-center px-2">
                    <ArrowRight className={`w-3.5 h-3.5 ${isCurrentUser ? "text-sky-300" : "text-slate-400"}`} />
                    {message.embeddedLeg.gate && (
                      <span className={`text-[9.5px] font-sans font-bold ${isCurrentUser ? "text-sky-200" : "text-slate-600"}`}>
                        Gate {message.embeddedLeg.gate}
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <div className={`font-black text-sm ${isCurrentUser ? "text-amber-300" : "text-slate-900"}`}>
                      {message.embeddedLeg.arrAirport}
                    </div>
                    <div className={`text-[10px] ${isCurrentUser ? "text-sky-200" : "text-slate-500"}`}>
                      {message.embeddedLeg.arrTime}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trade Offer Proposal */}
            {message.embeddedTrade && (
              <div
                className={`mt-2.5 p-3 rounded-2xl border text-xs ${
                  isCurrentUser
                    ? "bg-sky-800/80 border-sky-400/40 text-white"
                    : "bg-white border-amber-300 shadow-xs text-slate-900"
                }`}
              >
                <div className="flex items-center justify-between border-b pb-1.5 mb-2.5 border-slate-200/50">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span className={`font-black text-xs ${isCurrentUser ? "text-amber-200" : "text-slate-900"}`}>
                      Trip Trade Proposal
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[8.5px] font-black px-1.5 py-0.2 rounded-md ${
                        message.embeddedTrade.tradeScope === "SELECTED_FLIGHTS"
                          ? "bg-purple-100 text-purple-800 border border-purple-300"
                          : "bg-sky-100 text-sky-800 border border-sky-300"
                      }`}
                    >
                      {message.embeddedTrade.tradeScope === "SELECTED_FLIGHTS" ? "SELECT FLIGHTS" : "FULL SEQ"}
                    </span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        message.embeddedTrade.status === "PENDING"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : message.embeddedTrade.status === "ACCEPTED"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}
                    >
                      {message.embeddedTrade.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2.5">
                  <div className={`p-2 rounded-xl border ${isCurrentUser ? "bg-sky-900/60 border-sky-500/30" : "bg-slate-50 border-slate-200"}`}>
                    <span className={`text-[10px] block font-medium ${isCurrentUser ? "text-sky-200" : "text-slate-500"}`}>Offered Sequence</span>
                    <span className="font-black text-sm">#{message.embeddedTrade.offeredSequenceNumber}</span>
                    <span className={`text-[10px] block font-bold ${isCurrentUser ? "text-amber-200" : "text-amber-700"}`}>
                      {message.embeddedTrade.offeredCreditHours.toFixed(2)}h Credit
                    </span>
                  </div>
                  <div className={`p-2 rounded-xl border ${isCurrentUser ? "bg-sky-900/60 border-sky-500/30" : "bg-slate-50 border-slate-200"}`}>
                    <span className={`text-[10px] block font-medium ${isCurrentUser ? "text-sky-200" : "text-slate-500"}`}>Date</span>
                    <span className="font-black text-sm">{message.embeddedTrade.offeredDate}</span>
                  </div>
                </div>

                {/* HSS Granular Flight Breakdown Modal Trigger */}
                {(message.embeddedTrade.fullHssSummary || message.embeddedTrade.selectedLegs) && (
                  <div className="mb-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHssModal(true);
                      }}
                      className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between text-xs font-black transition cursor-pointer active:scale-98 shadow-2xs ${
                        isCurrentUser
                          ? "bg-sky-900/90 border-sky-400/50 text-white hover:bg-sky-900"
                          : "bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-[#007AFF] text-white">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <span>Open HSS Pairing Schedule</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                    </button>
                  </div>
                )}

                {message.embeddedTrade.desiredDateOrTrip && (
                  <div className={`text-[11.5px] p-2 rounded-xl mb-2.5 border leading-relaxed ${
                    isCurrentUser ? "bg-sky-900/60 border-sky-500/30 text-sky-100" : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}>
                    <span className={`text-[9px] block font-bold tracking-wider ${isCurrentUser ? "text-sky-300" : "text-slate-500"}`}>
                      DESIRED IN EXCHANGE:
                    </span>
                    {message.embeddedTrade.desiredDateOrTrip}
                  </div>
                )}


                {message.embeddedTrade.status === "PENDING" && !isCurrentUser && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => updateTradeStatus(message.embeddedTrade!.offerId, "ACCEPTED")}
                      className="flex-1 py-2 bg-[#34C759] hover:bg-[#2EB350] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept Trade
                    </button>
                    <button
                      onClick={() => updateTradeStatus(message.embeddedTrade!.offerId, "DECLINED")}
                      className="px-3 py-2 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95 cursor-pointer border border-slate-300"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Decline
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>


          {/* Quick Menu Button (Right for other users) */}
          {!isCurrentUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 ml-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition cursor-pointer active:scale-95"
              title="Options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Emoji Reactions Attached Badges */}
        {totalReactions.length > 0 && (
          <div className={`flex items-center gap-1 mt-1 px-1 flex-wrap ${isCurrentUser ? "justify-end" : "justify-start"}`}>
            {totalReactions.map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={(e) => handleEmojiClick(e, emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs shadow-2xs transition cursor-pointer active:scale-95 ${
                  users.includes("user-current")
                    ? "bg-sky-100 border-[#007AFF] text-sky-900 font-bold"
                    : "bg-white border-slate-200 text-slate-700"
                }`}
              >
                <span>{emoji}</span>
                <span className="text-[10px] font-bold">{users.length}</span>
              </button>
            ))}
          </div>
        )}

        {/* Floating iOS Tapback & Context Action Menu */}
        {showMenu && (
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1.5 animate-scaleIn min-w-[210px] ${
              isCurrentUser ? "right-0 top-full mt-1" : "left-0 top-full mt-1"
            }`}
          >
            {/* Tapback Reaction Emojis */}
            <div className="flex items-center justify-between px-1.5 py-1 bg-slate-50 rounded-xl border border-slate-200/80">
              {EMOJI_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => handleEmojiClick(e, emoji)}
                  className="text-base p-1 hover:scale-125 transition active:scale-90 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Action List */}
            <div className="flex flex-col text-xs font-semibold divide-y divide-slate-100">
              <button
                onClick={handleReply}
                className="px-2.5 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 rounded-lg transition cursor-pointer text-left"
              >
                <Reply className="w-3.5 h-3.5 text-sky-600" />
                <span>Reply</span>
              </button>

              <button
                onClick={handleCopy}
                className="px-2.5 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 rounded-lg transition cursor-pointer text-left"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>{copied ? "Copied!" : "Copy Text"}</span>
              </button>

              {isCurrentUser && (
                <button
                  onClick={handleEdit}
                  className="px-2.5 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 rounded-lg transition cursor-pointer text-left"
                >
                  <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Edit Message</span>
                </button>
              )}

              <button
                onClick={handleDelete}
                className="px-2.5 py-2 flex items-center gap-2 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer text-left"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{isCurrentUser ? "Unsend / Delete" : "Delete for Me"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Message Timestamp & Receipt */}
        <div className="flex items-center gap-1.5 mt-0.5 px-2">
          {message.encrypted && (
            <span className="flex items-center gap-0.5 text-[9.5px] text-slate-500 font-mono">
              <Lock className="w-2.5 h-2.5 text-amber-600" />
            </span>
          )}
          <span className="text-[10px] text-slate-500">{timeFormatted}</span>
          {renderDeliveryReceipt()}
        </div>
      </div>

      {/* Full HSS Pairing Schedule Popup Modal */}
      {message.embeddedTrade && (
        <HssDetailModal
          isOpen={showHssModal}
          onClose={() => setShowHssModal(false)}
          tradeOffer={message.embeddedTrade}
          isCurrentUser={isCurrentUser}
          onAcceptTrade={(id) => updateTradeStatus(id, "ACCEPTED")}
          onDeclineTrade={(id) => updateTradeStatus(id, "DECLINED")}
        />
      )}
    </>
  );
}

