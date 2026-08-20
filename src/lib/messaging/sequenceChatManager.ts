/**
 * CREWSCHEDULE PRO // DYNAMIC SEQUENCE ROOM PROVISIONING & CHANNEL MANAGER
 * Generates person-to-person direct crew chats, pairing group chats, base channels, and trade marketplace.
 */

import { SequenceTrip, UserProfile, ChatChannel, ChatMessage, MessageSender } from "../../types";
import { CREW_ROSTER, CrewMemberContact } from "./crewDirectory";

/**
 * Deterministic Channel ID pattern for Pairings: group-seq-${base}-${equipment}-${sequenceNumber}-${cleanStartDate}
 */
export function generateSequenceChannelId(
  base: string,
  equipment: string,
  sequenceNumber: string,
  startDate: string
): string {
  const cleanBase = (base || "ORD").toUpperCase().trim();
  const cleanEq = (equipment || "E75").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const cleanSeq = sequenceNumber.toString().replace(/[^0-9A-Z]/g, "");
  const cleanDate = startDate.replace(/[^0-9]/g, "");
  return `group-seq-${cleanBase}-${cleanEq}-${cleanSeq}-${cleanDate}`;
}

export function generateDirectChannelId(targetUserId: string): string {
  return `direct-${targetUserId}`;
}

export const STANDARD_BASES = ["ORD", "DFW", "MIA", "PHX"];


export function generateBaseChannelId(base: string): string {
  return `base-${base.toUpperCase().trim()}`;
}

export const TRADE_MARKETPLACE_CHANNEL_ID = "trade-marketplace";

/**
 * Auto-provision all channels: Direct Person-to-Person, Pairing Groups, Bases, Marketplace
 */
export function provisionAllChannels(
  sequences: SequenceTrip[],
  userProfile: UserProfile
): {
  channels: ChatChannel[];
  seedMessages: Record<string, ChatMessage[]>;
} {
  const now = Date.now();
  const channels: ChatChannel[] = [];
  const seedMessages: Record<string, ChatMessage[]> = {};

  const currentUser: MessageSender = {
    userId: "user-current",
    name: userProfile.name || "Austin Pryor",
    employeeId: userProfile.employeeId || "742840",
    role: (userProfile.crewRole as any) || "CA",
    base: userProfile.base || "ORD",
    seniorityNumber: userProfile.seniorityNumber || "01361",
  };

  // 1. PERSON-TO-PERSON DIRECT CREW CHATS (Top Priority)
  const directSeedCrew: { contact: CrewMemberContact; lastText: string; timeOffset: number; unread: number; macro?: any }[] = [
    {
      contact: CREW_ROSTER[0], // Marcus Vance (FO)
      lastText: "Sounds good Austin, I'll meet you at Gate G12 for Flight 3842. Preflight is underway.",
      timeOffset: 300000,
      unread: 1,
    },
    {
      contact: CREW_ROSTER[2], // Elena Rostova (FA)
      lastText: "Catering and emergency equipment checks are complete. Ready for passenger boarding.",
      timeOffset: 1200000,
      unread: 0,
    },
    {
      contact: CREW_ROSTER[3], // Jordan Hayes (FA)
      lastText: "Hey Austin, hotel crew van leaves the lobby in 15 mins. See you downstairs!",
      timeOffset: 3600000,
      unread: 0,
      macro: "CREW_VAN",
    },
    {
      contact: CREW_ROSTER[1], // Capt. Dave Miller
      lastText: "Are you free to pick up next Friday's turn? Let me know if you want to trade on the marketplace.",
      timeOffset: 7200000,
      unread: 0,
    },
    {
      contact: CREW_ROSTER[8], // Todd Miller (Dispatch)
      lastText: "Flight release for 3842 updated with alternate KGRR. Fuel load 14,200 lbs.",
      timeOffset: 86400000,
      unread: 0,
    },
  ];

  for (const item of directSeedCrew) {
    const directChannelId = generateDirectChannelId(item.contact.userId);
    const msgId = `msg-${directChannelId}-last`;

    const seedMsg: ChatMessage = {
      id: msgId,
      channelId: directChannelId,
      sender: item.contact,
      content: item.lastText,
      timestamp: now - item.timeOffset,
      encrypted: true,
      status: "READ",
      quickMacroTag: item.macro,
    };

    seedMessages[directChannelId] = [
      {
        id: `msg-${directChannelId}-intro`,
        channelId: directChannelId,
        sender: item.contact,
        content: `🔒 Direct E2EE messaging channel initialized with ${item.contact.name} (${item.contact.role} - ${item.contact.base}).`,
        timestamp: now - item.timeOffset - 60000,
        encrypted: true,
        status: "READ",
      },
      seedMsg,
    ];

    channels.push({
      id: directChannelId,
      type: "DIRECT",
      title: item.contact.name,
      subtitle: `${item.contact.role} • ${item.contact.base} • Emp #${item.contact.employeeId}`,
      base: item.contact.base,
      participants: ["user-current", item.contact.userId],
      participantDetails: [currentUser, item.contact],
      lastMessage: seedMsg,
      unreadCount: item.unread,
      isEncrypted: true,
      createdAt: now - 86400000 * 7,
      updatedAt: now - item.timeOffset,
    });
  }

  // 2. PAIRING GROUP CHATS
  for (const seq of sequences) {
    if (seq.isDropped) continue;

    const channelId = generateSequenceChannelId(
      seq.base || userProfile.base || "ORD",
      seq.equipment || userProfile.equipment || "E75",
      seq.sequenceNumber,
      seq.startDate
    );

    const groupCrew: MessageSender[] = [
      currentUser,
      CREW_ROSTER[0], // Marcus Vance
      CREW_ROSTER[2], // Elena Rostova
      CREW_ROSTER[3], // Jordan Hayes
    ];

    const groupLastMsg: ChatMessage = {
      id: `msg-${channelId}-group-last`,
      channelId,
      sender: CREW_ROSTER[0],
      content: `Pairing #${seq.sequenceNumber} crew group active. Departing ${seq.startDate}.`,
      timestamp: now - 1800000,
      encrypted: true,
      status: "READ",
    };

    seedMessages[channelId] = [
      {
        id: `msg-${channelId}-init`,
        channelId,
        sender: {
          userId: "system",
          name: "CrewSchedule Dispatch",
          employeeId: "SYS-01",
          role: "CA",
          base: seq.base || "ORD",
        },
        content: `🔒 Encrypted Pairing Group initialized for Seq #${seq.sequenceNumber} (${seq.startDate}). ${seq.dutyPeriods.length} Duty Periods • ${((seq.totalBlockMinutes || 0) / 60).toFixed(2)}h Block.`,
        timestamp: now - 3600000 * 2,
        encrypted: true,
        status: "READ",
      },
      groupLastMsg,
    ];

    channels.push({
      id: channelId,
      type: "SEQUENCE",
      title: `Pairing #${seq.sequenceNumber} Crew`,
      subtitle: `${seq.dutyPeriods.length}-Day Trip • ${seq.base || "ORD"} • 4 Crew Members`,
      base: seq.base || userProfile.base,
      sequenceNumber: seq.sequenceNumber,
      pairingStartDate: seq.startDate,
      participants: groupCrew.map((c) => c.userId),
      participantDetails: groupCrew,
      lastMessage: groupLastMsg,
      unreadCount: 0,
      isEncrypted: true,
      createdAt: now - 3600000 * 24,
      updatedAt: now - 1800000,
    });
  }

  // 3. BASE DOMICILE CHANNELS
  const baseChannels = STANDARD_BASES.map((base) => ({
    id: generateBaseChannelId(base),
    type: "BASE" as const,
    title: `${base} Domicile Channel`,
    subtitle: `Regional crew board for ${base} pilots & flight attendants`,
    base,
    participants: ["user-current", `base-${base}-bot`],
    participantDetails: [
      {
        userId: `base-${base}-bot`,
        name: `${base} Operations Hub`,
        employeeId: `BASE-${base}`,
        role: "CA" as const,
        base,
      },
    ],
    unreadCount: base === (userProfile.base || "ORD") ? 1 : 0,
    isEncrypted: false,
    createdAt: now - 86400000 * 7,
    updatedAt: now - 120000,
  }));
  channels.push(...baseChannels);

  // 4. TRADE MARKETPLACE
  channels.push({
    id: TRADE_MARKETPLACE_CHANNEL_ID,
    type: "TRADE_MARKETPLACE",
    title: "Trip Trade & Open Time Board",
    subtitle: "System-wide sequence drops, swaps & mutual trade negotiation",
    participants: ["all"],
    participantDetails: [],
    unreadCount: 2,
    isEncrypted: true,
    createdAt: now - 86400000 * 30,
    updatedAt: now - 60000,
  });

  return { channels, seedMessages };
}
