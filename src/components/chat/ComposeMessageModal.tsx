"use client";

import React, { useState } from "react";
import { CREW_ROSTER, CrewMemberContact } from "../../lib/messaging/crewDirectory";
import { useMessageStore } from "../../store/useMessageStore";
import { useCrewStore } from "../../store/useCrewStore";
import {
  Search,
  X,
  User,
  Users,
  Check,
  Shield,
  Plane,
  Building2,
  Sparkles,
} from "lucide-react";

interface ComposeMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectChannel: (channelId: string) => void;
}

export default function ComposeMessageModal({
  isOpen,
  onClose,
  onSelectChannel,
}: ComposeMessageModalProps) {
  const channels = useMessageStore((s) => s.channels);
  const userProfile = useCrewStore((s) => s.userProfile);

  const [mode, setMode] = useState<"DIRECT" | "GROUP">("DIRECT");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState<string>("");

  if (!isOpen) return null;

  const filteredRoster = CREW_ROSTER.filter((member) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      member.name.toLowerCase().includes(q) ||
      member.role.toLowerCase().includes(q) ||
      member.base.toLowerCase().includes(q) ||
      member.employeeId.toLowerCase().includes(q)
    );
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

  const handleStartDirectChat = (member: CrewMemberContact) => {
    const directChannelId = `direct-${member.userId}`;
    const existing = channels.find((c) => c.id === directChannelId);

    if (existing) {
      onSelectChannel(existing.id);
    } else {
      // Provision on the fly if needed
      useMessageStore.setState((state) => {
        const newChan = {
          id: directChannelId,
          type: "DIRECT" as const,
          title: member.name,
          subtitle: `${member.role} • ${member.base} • Emp #${member.employeeId}`,
          base: member.base,
          participants: ["user-current", member.userId],
          participantDetails: [
            {
              userId: "user-current",
              name: userProfile.name || "Austin Pryor",
              employeeId: userProfile.employeeId || "742840",
              role: (userProfile.crewRole as any) || "CA",
              base: userProfile.base || "ORD",
            },
            member,
          ],
          unreadCount: 0,
          isEncrypted: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return {
          channels: [newChan, ...state.channels],
        };
      });
      onSelectChannel(directChannelId);
    }
    onClose();
  };

  const handleCreateGroupChat = () => {
    if (!groupTitle.trim() || selectedUserIds.length === 0) return;

    const newGroupId = `group-custom-${Date.now()}`;
    const selectedMembers = CREW_ROSTER.filter((m) => selectedUserIds.includes(m.userId));

    useMessageStore.setState((state) => {
      const newGroupChan = {
        id: newGroupId,
        type: "SEQUENCE" as const,
        title: groupTitle.trim(),
        subtitle: `Custom Group • ${selectedMembers.length + 1} Crew Members`,
        participants: ["user-current", ...selectedUserIds],
        participantDetails: [
          {
            userId: "user-current",
            name: userProfile.name || "Austin Pryor",
            employeeId: userProfile.employeeId || "742840",
            role: (userProfile.crewRole as any) || "CA",
            base: userProfile.base || "ORD",
          },
          ...selectedMembers,
        ],
        unreadCount: 0,
        isEncrypted: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return {
        channels: [newGroupChan, ...state.channels],
      };
    });

    onSelectChannel(newGroupId);
    onClose();
  };

  const toggleSelectMember = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[100000] animate-fadeIn"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-[100001] w-full max-w-lg mx-auto bg-white border-t border-slate-200 rounded-t-[28px] shadow-2xl flex flex-col animate-slideUp max-h-[88vh] overflow-hidden text-slate-900 pb-[max(1rem,env(safe-area-inset-bottom,0px))] font-sans">
        {/* iOS Grabber Pill */}
        <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mt-2.5 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shrink-0">
          <div>
            <h2 className="text-base font-black text-slate-900">New Message</h2>
            <p className="text-[11px] text-slate-500">Search airline crew directory</p>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-5 pt-3 shrink-0">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setMode("DIRECT")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === "DIRECT"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Direct (1-on-1)</span>
            </button>

            <button
              onClick={() => setMode("GROUP")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === "GROUP"
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Group Chat</span>
            </button>
          </div>
        </div>

        {/* Group Name Input if in Group mode */}
        {mode === "GROUP" && (
          <div className="px-5 pt-3 shrink-0">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Group Title:
            </label>
            <input
              type="text"
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder="e.g. Pairing #17495 Crew or ORD Crashpad"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#007AFF] focus:bg-white transition"
            />
          </div>
        )}

        {/* Search Input */}
        <div className="px-5 py-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, role (CA/FO/FA), or base..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#007AFF] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Crew Roster List */}
        <div className="flex-1 overflow-y-auto px-5 divide-y divide-slate-100 scrollbar-thin">
          {filteredRoster.map((member) => {
            const isSelected = selectedUserIds.includes(member.userId);

            return (
              <div
                key={member.userId}
                onClick={() => {
                  if (mode === "DIRECT") {
                    handleStartDirectChat(member);
                  } else {
                    toggleSelectMember(member.userId);
                  }
                }}
                className={`py-3 flex items-center justify-between cursor-pointer transition rounded-xl px-2.5 ${
                  isSelected ? "bg-sky-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shadow-2xs">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    {/* Status Dot */}
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        member.status === "ONLINE"
                          ? "bg-emerald-500"
                          : member.status === "RESTING"
                          ? "bg-purple-500"
                          : member.status === "FLYING"
                          ? "bg-sky-500"
                          : "bg-slate-400"
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-slate-900 truncate">
                        {member.name}
                      </span>
                      <span
                        className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border ${getRoleBadge(
                          member.role
                        )}`}
                      >
                        {member.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      {member.base} • Emp #{member.employeeId}
                    </span>

                  </div>
                </div>

                {mode === "GROUP" && (
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                      isSelected
                        ? "bg-[#007AFF] border-[#007AFF] text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Group Mode Action Button */}
        {mode === "GROUP" && (
          <div className="p-5 border-t border-slate-200 bg-white shrink-0">
            <button
              onClick={handleCreateGroupChat}
              disabled={!groupTitle.trim() || selectedUserIds.length === 0}
              className={`w-full py-3 rounded-2xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98 ${
                groupTitle.trim() && selectedUserIds.length > 0
                  ? "bg-[#007AFF] hover:bg-[#0062D2] text-white shadow-sky-500/20"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/60"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Create Group ({selectedUserIds.length} Selected)</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
