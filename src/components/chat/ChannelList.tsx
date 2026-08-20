"use client";

import React, { useState } from "react";
import { useMessageStore } from "../../store/useMessageStore";
import { ChatChannel, ChannelType } from "../../types";
import ComposeMessageModal from "./ComposeMessageModal";
import {
  Lock,
  Plane,
  Building2,
  Users,
  Sparkles,
  Search,
  Moon,
  Edit3,
  User,
} from "lucide-react";

interface ChannelListProps {
  onSelectChannel: (channelId: string) => void;
}

export default function ChannelList({ onSelectChannel }: ChannelListProps) {
  const channels = useMessageStore((s) => s.channels);
  const activeChannelId = useMessageStore((s) => s.activeChannelId);
  const restShieldStatus = useMessageStore((s) => s.restShieldStatus);

  const [activeCategory, setActiveCategory] = useState<"ALL" | "DIRECT" | "GROUPS" | "CHANNELS">("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showComposeModal, setShowComposeModal] = useState<boolean>(false);

  const filteredChannels = channels.filter((ch) => {
    // Exclude any obsolete domicile channels
    if (ch.type === "BASE" && ch.base && !["ORD", "DFW", "MIA", "PHX"].includes(ch.base)) {
      return false;
    }

    let matchesCategory = true;
    if (activeCategory === "DIRECT") {
      matchesCategory = ch.type === "DIRECT";
    } else if (activeCategory === "GROUPS") {
      matchesCategory = ch.type === "SEQUENCE";
    } else if (activeCategory === "CHANNELS") {
      matchesCategory = ch.type === "BASE" || ch.type === "TRADE_MARKETPLACE";
    }


    const matchesSearch =
      searchQuery.trim() === "" ||
      ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ch.subtitle && ch.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ch.base && ch.base.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const getRoleBadge = (role?: string) => {
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

  const getChannelAvatar = (channel: ChatChannel) => {
    if (channel.type === "DIRECT") {
      const recipient = channel.participantDetails.find((p) => p.userId !== "user-current") || channel.participantDetails[0];
      const initials = (channel.title || "Crew")
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("");
      return (
        <div className="w-11 h-11 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center font-black text-xs text-sky-800 shadow-2xs">
          {initials}
        </div>
      );
    }

    if (channel.type === "SEQUENCE") {
      return (
        <div className="w-11 h-11 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shadow-2xs">
          <Plane className="w-5 h-5 text-amber-600" />
        </div>
      );
    }

    if (channel.type === "BASE") {
      return (
        <div className="w-11 h-11 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center shadow-2xs">
          <Building2 className="w-5 h-5 text-sky-600" />
        </div>
      );
    }

    return (
      <div className="w-11 h-11 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-2xs">
        <Sparkles className="w-5 h-5 text-emerald-600" />
      </div>
    );
  };

  const formatLastTime = (epochMs?: number) => {
    if (!epochMs) return "";
    const d = new Date(epochMs);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 border-r border-slate-200 select-none font-sans">
      {/* iOS Messages Top Navigation Header */}
      <div className="px-4 pt-[max(3rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-3 border-b border-slate-200 bg-white/95 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Messages</h1>
            {restShieldStatus?.isSleepShieldActive && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[10px] font-bold text-emerald-800 shadow-2xs"
                title={restShieldStatus.reason}
              >
                <Moon className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                <span>Rest Active</span>
              </div>
            )}
          </div>

          {/* iOS New Message Compose Button */}
          <button
            onClick={() => setShowComposeModal(true)}
            className="w-9 h-9 rounded-full bg-sky-50 hover:bg-sky-100 text-[#007AFF] border border-sky-200 flex items-center justify-center transition cursor-pointer active:scale-90 shadow-2xs"
            title="Compose Message or Group Chat"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        {/* Light Search Pill */}
        <div className="relative mb-2.5">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people, trips, or bases..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[13px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#007AFF] focus:bg-white transition"
          />
        </div>

        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none">
          {[
            { id: "ALL", label: "All" },
            { id: "DIRECT", label: "Direct (Crew)" },
            { id: "GROUPS", label: "Pairings & Groups" },
            { id: "CHANNELS", label: "Bases & Trades" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`flex-1 px-2.5 py-1 rounded-lg text-xs font-bold transition text-center cursor-pointer shrink-0 ${
                activeCategory === cat.id
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Channel & Direct Message Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 scrollbar-thin bg-white">
        {filteredChannels.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-medium px-4">
            <p className="font-bold text-slate-600 mb-1">No conversations found</p>
            <p>Tap the pencil button at the top right to start a message with a fellow crew member.</p>
          </div>
        ) : (
          filteredChannels.map((channel) => {
            const isSelected = activeChannelId === channel.id;
            const recipient =
              channel.type === "DIRECT"
                ? channel.participantDetails.find((p) => p.userId !== "user-current") || channel.participantDetails[0]
                : undefined;

            return (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={`w-full px-4 py-3 text-left transition flex items-center gap-3 cursor-pointer ${
                  isSelected
                    ? "bg-sky-50 text-slate-900"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                {/* Circular Avatar */}
                <div className="relative shrink-0">
                  {getChannelAvatar(channel)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-extrabold text-[14px] text-slate-900 truncate">
                        {channel.title}
                      </span>
                      {recipient && (
                        <span
                          className={`text-[8.5px] font-black px-1.5 py-0.2 rounded-md border ${getRoleBadge(
                            recipient.role
                          )}`}
                        >
                          {recipient.role}
                        </span>
                      )}
                      {channel.isEncrypted && (
                        <Lock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium shrink-0 ml-2">
                      {formatLastTime(channel.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[12.5px] text-slate-500 truncate pr-2 leading-tight">
                      {channel.lastMessage?.content || channel.subtitle || "No messages yet"}
                    </p>

                    {channel.unreadCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#007AFF] text-white font-bold text-[10.5px] flex items-center justify-center shrink-0 shadow-xs">
                        {channel.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Compose Message & Group Chat Modal */}
      <ComposeMessageModal
        isOpen={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        onSelectChannel={(id) => onSelectChannel(id)}
      />
    </div>
  );
}
