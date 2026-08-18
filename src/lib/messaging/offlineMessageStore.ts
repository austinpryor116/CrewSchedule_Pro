/**
 * CREWSCHEDULE PRO // OFFLINE QUEUE & INDEXEDDB OPTIMISTIC STORAGE
 * Powered by Dexie.js (CrewScheduleDB) & Background Sync Worker
 */

import { db } from "../db";
import { ChatMessage, ChatChannel } from "../../types";

/**
 * Save a single chat message into local Dexie store.
 */
export async function saveMessageLocally(message: ChatMessage): Promise<void> {
  try {
    if (db.messages) {
      await db.messages.put(message);
    }
  } catch (err) {
    console.error("[OfflineStore] Failed to save message locally:", err);
  }
}

/**
 * Save multiple chat messages in a batch transaction.
 */
export async function saveMessagesBatch(messages: ChatMessage[]): Promise<void> {
  try {
    if (db.messages && messages.length > 0) {
      await db.messages.bulkPut(messages);
    }
  } catch (err) {
    console.error("[OfflineStore] Failed to batch save messages:", err);
  }
}

/**
 * Retrieve messages for a given channel ordered chronologically by timestamp.
 */
export async function getChannelMessages(channelId: string): Promise<ChatMessage[]> {
  try {
    if (db.messages) {
      return await db.messages.where("channelId").equals(channelId).sortBy("timestamp");
    }
  } catch (err) {
    console.error(`[OfflineStore] Failed to query messages for channel ${channelId}:`, err);
  }
  return [];
}

/**
 * Retrieve all currently QUEUED offline messages across all channels.
 */
export async function getAllQueuedMessages(): Promise<ChatMessage[]> {
  try {
    if (db.messages) {
      return await db.messages.where("status").equals("QUEUED").sortBy("timestamp");
    }
  } catch (err) {
    console.error("[OfflineStore] Failed to query queued messages:", err);
  }
  return [];
}

/**
 * Update message status (e.g. QUEUED -> SENDING -> SENT / DELIVERED / FAILED).
 */
export async function updateMessageStatus(
  messageId: string,
  status: ChatMessage["status"]
): Promise<void> {
  try {
    if (db.messages) {
      await db.messages.update(messageId, { status });
    }
  } catch (err) {
    console.error(`[OfflineStore] Failed to update status for msg ${messageId}:`, err);
  }
}

/**
 * Save channels to Dexie store.
 */
export async function saveChannelsLocally(channels: ChatChannel[]): Promise<void> {
  try {
    if (db.channels && channels.length > 0) {
      await db.channels.bulkPut(channels);
    }
  } catch (err) {
    console.error("[OfflineStore] Failed to save channels:", err);
  }
}

/**
 * Get all channels from Dexie store.
 */
export async function getChannelsLocally(): Promise<ChatChannel[]> {
  try {
    if (db.channels) {
      return await db.channels.toArray();
    }
  } catch (err) {
    console.error("[OfflineStore] Failed to query local channels:", err);
  }
  return [];
}

/**
 * Delete a message from local Dexie store.
 */
export async function deleteMessageLocally(messageId: string): Promise<void> {
  try {
    if (db.messages) {
      await db.messages.delete(messageId);
    }
  } catch (err) {
    console.error(`[OfflineStore] Failed to delete message ${messageId}:`, err);
  }
}

/**
 * Update message properties (content, reactions, etc.) in local Dexie store.
 */
export async function updateMessageLocally(
  messageId: string,
  changes: Partial<ChatMessage>
): Promise<void> {
  try {
    if (db.messages) {
      await db.messages.update(messageId, changes);
    }
  } catch (err) {
    console.error(`[OfflineStore] Failed to update message ${messageId}:`, err);
  }
}

/**
 * Delete an entire channel and its messages from local Dexie store.
 */
export async function deleteChannelLocally(channelId: string): Promise<void> {
  try {
    if (db.channels) {
      await db.channels.delete(channelId);
    }
    if (db.messages) {
      await db.messages.where("channelId").equals(channelId).delete();
    }
  } catch (err) {
    console.error(`[OfflineStore] Failed to delete channel ${channelId}:`, err);
  }
}


/**
 * Check if the browser / mobile WebView currently has internet connectivity.
 */
export function isOnline(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

/**
 * Background Sync Worker: Flushes all queued messages chronologically.
 */
export async function flushQueuedMessages(
  onDelivered?: (deliveredMsg: ChatMessage) => void
): Promise<{ syncedCount: number; failedCount: number }> {
  if (!isOnline()) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const queued = await getAllQueuedMessages();
  if (queued.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;

  for (const msg of queued) {
    try {
      // Simulate network dispatch / backend handshake latency
      await updateMessageStatus(msg.id, "SENDING");
      await new Promise((r) => setTimeout(r, 60));

      const updatedMsg: ChatMessage = {
        ...msg,
        status: "SENT",
      };

      await saveMessageLocally(updatedMsg);
      syncedCount++;

      if (onDelivered) {
        onDelivered(updatedMsg);
      }
    } catch (err) {
      console.error(`[OfflineStore] Failed to sync queued msg ${msg.id}:`, err);
      await updateMessageStatus(msg.id, "FAILED");
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}

/**
 * Registers window online event listener to trigger automatic queue flushing.
 */
export function initBackgroundSyncWorker(
  onSynced?: (msg: ChatMessage) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = async () => {
    console.log("[BackgroundSync] Device came ONLINE. Flushing offline queue...");
    await flushQueuedMessages(onSynced);
  };

  window.addEventListener("online", handleOnline);

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}
