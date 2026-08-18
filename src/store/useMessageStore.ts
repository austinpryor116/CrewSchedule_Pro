/**
 * CREWSCHEDULE PRO // REACTIVE CREW MESSAGING STORE (ZUSTAND)
 * Manages channels, messages, E2EE encryption/decryption, offline queue, reactions, editing, and deletion.
 */

import { create } from "zustand";
import {
  ChatMessage,
  ChatChannel,
  MessageSender,
  FlightLegSummaryEmbed,
  TradeOfferEmbed,
  UserProfile,
  SequenceTrip,
} from "../types";
import {
  saveMessageLocally,
  saveMessagesBatch,
  getChannelMessages,
  getAllQueuedMessages,
  saveChannelsLocally,
  getChannelsLocally,
  flushQueuedMessages,
  initBackgroundSyncWorker,
  isOnline,
  deleteMessageLocally,
  updateMessageLocally,
  deleteChannelLocally,
} from "../lib/messaging/offlineMessageStore";
import {
  encryptMessage,
  decryptMessage,
  getCachedRoomKey,
} from "../lib/messaging/cryptoShield";

import {
  provisionAllChannels,
  generateDirectChannelId,
  STANDARD_BASES,
} from "../lib/messaging/sequenceChatManager";

import { getSimulatedCrewReplies } from "../lib/messaging/crewSimulationEngine";
import {
  evaluateRestShield,
  shouldMuteNotification,
  RestShieldStatus,
} from "../lib/messaging/restShield";

interface MessageState {
  channels: ChatChannel[];
  activeChannelId: string | null;
  messages: Record<string, ChatMessage[]>;
  decryptedContents: Record<string, string>; // msgId -> plainText
  typingUsers: Record<string, string[]>; // channelId -> array of names typing
  isSyncing: boolean;
  isOnline: boolean;
  queuedCount: number;
  manualDndUntil: number | undefined;
  restShieldStatus: RestShieldStatus | null;
  isInitialized: boolean;
  replyingTo: ChatMessage | null;
  editingMessage: { channelId: string; messageId: string; content: string } | null;


  // Actions
  initializeMessaging: (sequences: SequenceTrip[], userProfile: UserProfile) => Promise<void>;
  setActiveChannelId: (channelId: string | null) => void;
  setReplyingTo: (msg: ChatMessage | null) => void;
  setEditingMessage: (msg: { channelId: string; messageId: string; content: string } | null) => void;
  sendMessage: (params: {
    content: string;
    quickMacroTag?: ChatMessage["quickMacroTag"];
    embeddedLeg?: FlightLegSummaryEmbed;
    embeddedTrade?: TradeOfferEmbed;
    attachments?: ChatMessage["attachments"];
  }) => Promise<void>;
  editMessage: (channelId: string, messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (channelId: string, messageId: string) => Promise<void>;
  addReaction: (channelId: string, messageId: string, emoji: string) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  togglePinChannel: (channelId: string) => Promise<void>;
  sendQuickMacro: (
    tag: NonNullable<ChatMessage["quickMacroTag"]>,
    customText?: string,
    activeLeg?: FlightLegSummaryEmbed
  ) => Promise<void>;
  proposeTrade: (offer: {
    offeredSequenceNumber: string;
    offeredDate: string;
    offeredCreditHours: number;
    tradeScope?: "FULL_SEQUENCE" | "SELECTED_FLIGHTS";
    selectedFlightNumbers?: string[];
    selectedLegs?: TradeOfferEmbed["selectedLegs"];
    fullHssSummary?: TradeOfferEmbed["fullHssSummary"];
    desiredDateOrTrip?: string;
  }) => Promise<void>;

  updateTradeStatus: (offerId: string, newStatus: TradeOfferEmbed["status"]) => Promise<void>;
  toggleManualDnd: (hours?: number) => void;
  flushOfflineQueue: () => Promise<void>;
  markChannelAsRead: (channelId: string) => void;
  refreshRestShield: (sequences: SequenceTrip[]) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  channels: [],
  activeChannelId: null,
  messages: {},
  decryptedContents: {},
  typingUsers: {},
  isSyncing: false,

  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  queuedCount: 0,
  manualDndUntil: undefined,
  restShieldStatus: null,
  isInitialized: false,
  replyingTo: null,
  editingMessage: null,

  initializeMessaging: async (sequences: SequenceTrip[], userProfile: UserProfile) => {
    if (get().isInitialized && get().channels.length > 0) {
      get().refreshRestShield(sequences);
      return;
    }

    const cachedChannels = await getChannelsLocally();
    let finalChannels = cachedChannels;
    let initialSeedMessages: Record<string, ChatMessage[]> = {};

    // Purge any stale base channels not in STANDARD_BASES ("ORD", "DFW", "MIA", "PHX")
    if (cachedChannels && cachedChannels.length > 0) {
      for (const ch of cachedChannels) {
        if (ch.type === "BASE" && ch.base && !STANDARD_BASES.includes(ch.base)) {
          await deleteChannelLocally(ch.id);
        }
      }
      finalChannels = cachedChannels.filter(
        (ch) => ch.type !== "BASE" || (ch.base && STANDARD_BASES.includes(ch.base))
      );
    }

    if (!finalChannels || finalChannels.length === 0) {
      const provisioned = provisionAllChannels(sequences, userProfile);
      finalChannels = provisioned.channels;
      initialSeedMessages = provisioned.seedMessages;

      await saveChannelsLocally(finalChannels);

      for (const [chId, msgs] of Object.entries(initialSeedMessages)) {
        await saveMessagesBatch(msgs);
      }
    }


    const messagesMap: Record<string, ChatMessage[]> = {};
    for (const ch of finalChannels) {
      const msgs = await getChannelMessages(ch.id);
      messagesMap[ch.id] = msgs.length > 0 ? msgs : (initialSeedMessages[ch.id] || []);
    }

    const queued = await getAllQueuedMessages();
    const restStatus = evaluateRestShield(sequences, get().manualDndUntil);

    set({
      channels: finalChannels,
      activeChannelId: null,
      messages: messagesMap,
      queuedCount: queued.length,
      restShieldStatus: restStatus,
      isInitialized: true,
      isOnline: isOnline(),
    });

    initBackgroundSyncWorker((deliveredMsg) => {
      set((state) => {
        const chMsgs = state.messages[deliveredMsg.channelId] || [];
        const updated = chMsgs.map((m) => (m.id === deliveredMsg.id ? deliveredMsg : m));
        return {
          messages: { ...state.messages, [deliveredMsg.channelId]: updated },
        };
      });
    });
  },

  setActiveChannelId: (channelId) => {
    set({ activeChannelId: channelId, replyingTo: null, editingMessage: null });
    if (channelId) {
      get().markChannelAsRead(channelId);
    }
  },

  setReplyingTo: (msg) => set({ replyingTo: msg }),
  setEditingMessage: (msg) => set({ editingMessage: msg }),

  markChannelAsRead: (channelId) => {
    set((state) => ({
      channels: state.channels.map((c) =>
        c.id === channelId ? { ...c, unreadCount: 0 } : c
      ),
    }));
  },

  refreshRestShield: (sequences: SequenceTrip[]) => {
    const status = evaluateRestShield(sequences, get().manualDndUntil);
    set({ restShieldStatus: status });
  },

  toggleManualDnd: (hours = 8) => {
    const current = get().manualDndUntil;
    const newDnd = current && current > Date.now() ? undefined : Date.now() + hours * 3600000;
    set({ manualDndUntil: newDnd });
  },

  sendMessage: async (params) => {
    const { activeChannelId, channels, replyingTo } = get();
    if (!activeChannelId) return;

    const channel = channels.find((c) => c.id === activeChannelId);
    if (!channel) return;

    const online = isOnline();
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    const sender: MessageSender = {
      userId: "user-current",
      name: "Austin Pryor",
      employeeId: "742840",
      role: "CA",
      base: channel.base || "ORD",
    };

    let contentToStore = params.content;
    let iv: string | undefined = undefined;
    const isEncrypted = channel.isEncrypted;

    if (isEncrypted) {
      try {
        const roomKey = await getCachedRoomKey(channel.id);
        const encrypted = await encryptMessage(params.content, roomKey);
        contentToStore = encrypted.cipherText;
        iv = encrypted.iv;

      } catch (err) {
        console.warn("[useMessageStore] Encryption error:", err);
      }
    }

    const newMessage: ChatMessage = {
      id: msgId,
      channelId: channel.id,
      sender,
      content: contentToStore,
      timestamp: now,
      encrypted: isEncrypted,
      iv,
      status: online ? "SENT" : "QUEUED",
      quickMacroTag: params.quickMacroTag,
      embeddedLeg: params.embeddedLeg,
      embeddedTrade: params.embeddedTrade,
      attachments: params.attachments,
      replyToMessage: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.sender.name,
            textSnippet: replyingTo.content.slice(0, 60),
          }
        : undefined,
    };

    // Store plaintext in memory cache for instant display
    set((state) => ({
      decryptedContents: {
        ...state.decryptedContents,
        [msgId]: params.content,
      },
      messages: {
        ...state.messages,
        [channel.id]: [...(state.messages[channel.id] || []), newMessage],
      },
      channels: state.channels.map((c) =>
        c.id === channel.id
          ? { ...c, lastMessage: newMessage, updatedAt: now }
          : c
      ),
      queuedCount: online ? state.queuedCount : state.queuedCount + 1,
      replyingTo: null,
    }));

    await saveMessageLocally(newMessage);

    // Trigger interactive simulated crew reply
    const simulatedReplies = getSimulatedCrewReplies(channel, params.content, params.quickMacroTag);
    if (simulatedReplies.length > 0) {
      for (const sim of simulatedReplies) {
        // Set typing indicator
        set((state) => ({
          typingUsers: {
            ...state.typingUsers,
            [channel.id]: [...(state.typingUsers[channel.id] || []), sim.sender.name],
          },
        }));

        setTimeout(async () => {
          // Clear typing indicator
          set((state) => ({
            typingUsers: {
              ...state.typingUsers,
              [channel.id]: (state.typingUsers[channel.id] || []).filter((n) => n !== sim.sender.name),
            },
          }));

          const replyMsgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          let simContentToStore = sim.content;
          let simIv: string | undefined = undefined;

          if (channel.isEncrypted) {
            try {
              const rKey = await getCachedRoomKey(channel.id);
              const enc = await encryptMessage(sim.content, rKey);
              simContentToStore = enc.cipherText;
              simIv = enc.iv;
            } catch (e) {
              console.warn("[simulatedReply] Encryption error:", e);
            }
          }

          const simMsg: ChatMessage = {
            id: replyMsgId,
            channelId: channel.id,
            sender: sim.sender,
            content: simContentToStore,
            timestamp: Date.now(),
            encrypted: channel.isEncrypted,
            iv: simIv,
            status: "READ",
            quickMacroTag: sim.quickMacroTag,
            embeddedLeg: sim.embeddedLeg,
          };

          set((state) => ({
            decryptedContents: {
              ...state.decryptedContents,
              [replyMsgId]: sim.content,
            },
            messages: {
              ...state.messages,
              [channel.id]: [...(state.messages[channel.id] || []), simMsg],
            },
            channels: state.channels.map((c) =>
              c.id === channel.id
                ? { ...c, lastMessage: simMsg, updatedAt: Date.now() }
                : c
            ),
          }));

          await saveMessageLocally(simMsg);
        }, sim.delayMs);
      }
    }
  },


  editMessage: async (channelId, messageId, newContent) => {
    const { messages, channels } = get();
    const chMsgs = messages[channelId] || [];
    const channel = channels.find((c) => c.id === channelId);

    let contentToStore = newContent;
    let iv: string | undefined = undefined;

    if (channel?.isEncrypted) {
      try {
        const roomKey = await getCachedRoomKey(channelId);
        const encrypted = await encryptMessage(newContent, roomKey);
        contentToStore = encrypted.cipherText;
        iv = encrypted.iv;

      } catch (err) {
        console.warn("[editMessage] Encryption error:", err);
      }
    }

    const updatedMsgs = chMsgs.map((m) => {
      if (m.id === messageId) {
        return {
          ...m,
          content: contentToStore,
          iv: iv || m.iv,
          isEdited: true,
        };
      }
      return m;
    });

    set((state) => ({
      decryptedContents: {
        ...state.decryptedContents,
        [messageId]: newContent,
      },
      messages: {
        ...state.messages,
        [channelId]: updatedMsgs,
      },
      editingMessage: null,
    }));

    await updateMessageLocally(messageId, {
      content: contentToStore,
      iv: iv || undefined,
      isEdited: true,
    });
  },

  deleteMessage: async (channelId, messageId) => {
    const { messages } = get();
    const chMsgs = messages[channelId] || [];
    const updatedMsgs = chMsgs.filter((m) => m.id !== messageId);

    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: updatedMsgs,
      },
    }));

    await deleteMessageLocally(messageId);
  },

  addReaction: async (channelId, messageId, emoji) => {
    const { messages } = get();
    const chMsgs = messages[channelId] || [];
    const userId = "user-current";

    const updatedMsgs = chMsgs.map((m) => {
      if (m.id === messageId) {
        const reactions = { ...(m.reactions || {}) };
        const currentUsers = reactions[emoji] || [];

        if (currentUsers.includes(userId)) {
          reactions[emoji] = currentUsers.filter((u) => u !== userId);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          reactions[emoji] = [...currentUsers, userId];
        }

        return { ...m, reactions };
      }
      return m;
    });

    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: updatedMsgs,
      },
    }));

    const targetMsg = updatedMsgs.find((m) => m.id === messageId);
    if (targetMsg) {
      await updateMessageLocally(messageId, { reactions: targetMsg.reactions });
    }
  },

  deleteChannel: async (channelId) => {
    set((state) => ({
      channels: state.channels.filter((c) => c.id !== channelId),
      activeChannelId: state.activeChannelId === channelId ? null : state.activeChannelId,
    }));
    await deleteChannelLocally(channelId);
  },

  togglePinChannel: async (channelId) => {
    set((state) => {
      const updated = state.channels.map((c) =>
        c.id === channelId ? { ...c, isPinned: !c.isPinned } : c
      );
      // Sort pinned channels first
      updated.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
      return { channels: updated };
    });
  },

  sendQuickMacro: async (tag, customText, activeLeg) => {
    const macroMessages: Record<string, string> = {
      CREW_VAN: "🚐 Hotel Crew Van departing lobby in 15 mins. Please be downstairs!",
      RUNNING_LATE: "⏱️ Inbound flight delay. Anticipated gate arrival +15 mins behind schedule.",
      DEICING: "❄️ De-icing pad active. Type I / Type IV treatment underway. Hold short of Taxiway Alpha.",
      REST_START: "🛡️ FAR 117 Legal Rest period has started (10.0 Hours required uninterrupted). Muting all alerts.",
      GATE_HOLD: "🚪 Gate / ATC ground hold issued by ATC. Stand by for revised release time.",
    };

    const text = customText || macroMessages[tag] || "Tactical Macro Dispatch";

    await get().sendMessage({
      content: text,
      quickMacroTag: tag,
      embeddedLeg: activeLeg,
    });
  },

  proposeTrade: async (offer) => {
    const tradeOffer: TradeOfferEmbed = {
      offerId: `trade-${Date.now()}`,
      offeredSequenceNumber: offer.offeredSequenceNumber,
      offeredDate: offer.offeredDate,
      offeredCreditHours: offer.offeredCreditHours,
      tradeScope: offer.tradeScope || "FULL_SEQUENCE",
      selectedFlightNumbers: offer.selectedFlightNumbers,
      selectedLegs: offer.selectedLegs,
      fullHssSummary: offer.fullHssSummary,
      desiredDateOrTrip: offer.desiredDateOrTrip,
      status: "PENDING",
    };

    const scopeStr =
      offer.tradeScope === "SELECTED_FLIGHTS" && offer.selectedFlightNumbers?.length
        ? `[${offer.selectedFlightNumbers.length} Selected Flights: ${offer.selectedFlightNumbers.join(", ")}]`
        : `[Full Sequence]`;

    const text = `🔄 Trip Trade Proposal: Offering Sequence #${offer.offeredSequenceNumber} (${scopeStr} • ${offer.offeredCreditHours.toFixed(2)}h Credit) on ${offer.offeredDate}.${offer.desiredDateOrTrip ? ` Desired: ${offer.desiredDateOrTrip}` : ""}`;

    await get().sendMessage({
      content: text,
      embeddedTrade: tradeOffer,
    });
  },


  updateTradeStatus: async (offerId, newStatus) => {
    const { messages, activeChannelId } = get();
    if (!activeChannelId) return;

    const chMsgs = messages[activeChannelId] || [];
    const updatedMsgs = chMsgs.map((m) => {
      if (m.embeddedTrade && m.embeddedTrade.offerId === offerId) {
        return {
          ...m,
          embeddedTrade: {
            ...m.embeddedTrade,
            status: newStatus,
          },
        };
      }
      return m;
    });

    set((state) => ({
      messages: {
        ...state.messages,
        [activeChannelId]: updatedMsgs,
      },
    }));

    const target = updatedMsgs.find((m) => m.embeddedTrade?.offerId === offerId);
    if (target) {
      await saveMessageLocally(target);
    }
  },

  flushOfflineQueue: async () => {
    set({ isSyncing: true });
    await flushQueuedMessages((deliveredMsg) => {
      set((state) => {
        const chMsgs = state.messages[deliveredMsg.channelId] || [];
        const updated = chMsgs.map((m) => (m.id === deliveredMsg.id ? deliveredMsg : m));
        return {
          messages: { ...state.messages, [deliveredMsg.channelId]: updated },
        };
      });
    });

    const remainingQueued = await getAllQueuedMessages();
    set({
      isSyncing: false,
      queuedCount: remainingQueued.length,
    });
  },
}));
