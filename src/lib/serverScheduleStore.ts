import { SequenceTrip, PersonalCalendarEvent, UserProfile, PayRates } from "../types";
import { MOCK_AUG_SEQUENCES, DEFAULT_PAY_RATES } from "./demoData";

export interface PublishedUserSchedule {
  token: string;
  employeeId?: string;
  crewName?: string;
  crewRole?: string;
  updatedAt: string;
  sequences: SequenceTrip[];
  personalEvents?: PersonalCalendarEvent[];
  payRates?: PayRates;
}

// In-memory multi-tenant store for serverless execution / local caching
// In production, this seamlessly connects to Cloudflare KV, Supabase, or Redis
const globalScheduleStore = new Map<string, PublishedUserSchedule>();

// Initialize default demo token for testing
globalScheduleStore.set("crew-742840", {
  token: "crew-742840",
  employeeId: "742840",
  crewName: "CAPTAIN PILOT",
  crewRole: "CA",
  updatedAt: new Date().toISOString(),
  sequences: MOCK_AUG_SEQUENCES,
  personalEvents: [],
  payRates: DEFAULT_PAY_RATES,
});

/**
 * Saves a user's published schedule by token
 */
export function saveUserSchedule(data: PublishedUserSchedule): void {
  if (!data.token) return;
  globalScheduleStore.set(data.token, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Retrieves a user's published schedule by token
 */
export function getUserSchedule(token: string): PublishedUserSchedule | null {
  if (!token) return null;
  return globalScheduleStore.get(token) || null;
}
