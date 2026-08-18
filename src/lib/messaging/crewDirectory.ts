/**
 * CREWSCHEDULE PRO // CREW DIRECTORY & ROSTER ROSTER ENGINE
 * Provides person-to-person crew contacts, roles, bases, and seniority profiles.
 */

import { MessageSender } from "../../types";

export interface CrewMemberContact extends MessageSender {
  phone?: string;
  email?: string;
  status: "ONLINE" | "RESTING" | "FLYING" | "OFF_DUTY";
}

export const CREW_ROSTER: CrewMemberContact[] = [
  {
    userId: "crew-fo-marcus",
    name: "Marcus Vance",
    employeeId: "819402",
    role: "FO",
    base: "ORD",
    seniorityNumber: "08420",
    status: "FLYING",
  },
  {
    userId: "crew-ca-dave",
    name: "Captain Dave Miller",
    employeeId: "512948",
    role: "CA",
    base: "ORD",
    seniorityNumber: "00912",
    status: "ONLINE",
  },
  {
    userId: "crew-lfa-elena",
    name: "Elena Rostova",
    employeeId: "904123",
    role: "LFA",
    base: "ORD",
    seniorityNumber: "03114",
    status: "ONLINE",
  },
  {
    userId: "crew-fa-jordan",
    name: "Jordan Hayes",
    employeeId: "921855",
    role: "FA",
    base: "ORD",
    seniorityNumber: "05872",
    status: "RESTING",
  },
  {
    userId: "crew-ca-sarah",
    name: "Capt. Sarah Jenkins",
    employeeId: "649102",
    role: "CA",
    base: "DFW",
    seniorityNumber: "02194",
    status: "OFF_DUTY",
  },
  {
    userId: "crew-fo-kevin",
    name: "Kevin Patel",
    employeeId: "841920",
    role: "FO",
    base: "MIA",
    seniorityNumber: "07841",
    status: "ONLINE",
  },
  {
    userId: "crew-fa-sarahm",
    name: "Sarah Miller",
    employeeId: "938102",
    role: "FA",
    base: "DFW",
    seniorityNumber: "06214",
    status: "ONLINE",
  },
  {
    userId: "crew-ca-mike",
    name: "Capt. Mike Torres",
    employeeId: "492104",
    role: "CA",
    base: "PHX",
    seniorityNumber: "00742",
    status: "ONLINE",
  },
  {
    userId: "crew-dispatch-todd",
    name: "Todd Miller (Dispatch)",
    employeeId: "DSP-412",
    role: "CA",
    base: "ORD",
    status: "ONLINE",
  },
];
