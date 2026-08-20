/**
 * DECS Command Types and Macro Definitions
 * Strongly typed dictionary for DECS terminal interaction and automated macros.
 */

export * from "../lib/decsReference";

export enum DECSCommandType {
  // Schedule & Duty
  HI1 = "HI1", // Current Month Roster
  HI2 = "HI2", // Next Month Roster
  HI3 = "HI3", // Current Sequence Detail
  HSS = "HSS", // Sequence Detail Lookup
  HSD = "HSD", // Sequence Detail by Employee ID

  // Open Time & Reserve
  N4D = "N4D",   // Open Time Full Listings
  N3D = "N3D",   // Open Time Summary
  HI33 = "HI33", // Reserve Availability List
  HI25 = "HI25", // Reserve Standings
  N6D = "N6D",   // Base Reserve List
  HIHR = "HIHR", // Reserve Turnback List

  // Preflight, Ops & Weather
  JP_STAR = "JP*",   // Dispatch Release Summary
  JPD = "JPD",       // Short Release Summary
  SLS_STAR = "SLS*", // Station Weather & Field Conditions
  RGMN = "RGMN",     // Open MELs / CDLs
  FIL = "FIL",       // Flight Status & Location

  // Commute, Bids & Pass Travel
  C26AAA = "26AAA", // Airline Flight Schedules
  C26B = "26B",     // Commute Flights with Passenger Counts
  C3BR = "3BR",     // Bid Results Summary
  HIB = "HIB",      // Monthly Bidding Page
}

export interface MacroDefinition {
  id: string;
  label: string;
  commandString: string;
  category: "Schedule" | "Reserve" | "Trade" | "Commute" | "Ops";
  description?: string;
}

export interface CommuteFlightInfo {
  flightNumber: string;
  depAirport: string;
  arrAirport: string;
  depTime: string;
  arrTime: string;
  firstClassCount: number;
  mainCabinCount: number;
  availableSeats?: number;
}

export interface ReleaseSummaryInfo {
  flightNumber: string;
  tailNumber: string;
  releaseFuelPounds: number;
  routeSummary: string;
  depAirport: string;
  arrAirport: string;
}

export interface HSSParsedLeg {
  dayIndex: number;
  flightNumber: string;
  depAirport: string;
  arrAirport: string;
  depTime: string;
  arrTime: string;
  blockMinutes: number;
  isDeadhead: boolean;
}
