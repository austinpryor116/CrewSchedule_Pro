/**
 * CREWSCHEDULE PRO // INTERACTIVE CREW SIMULATION & AUTOMATED CONVERSATION ENGINE
 * Provides dynamic, contextual real-time replies from fellow pilots, flight attendants, and dispatch.
 */

import { ChatMessage, ChatChannel, MessageSender, FlightLegSummaryEmbed } from "../../types";
import { CREW_ROSTER } from "./crewDirectory";

export interface SimulatedResponse {
  sender: MessageSender;
  content: string;
  delayMs: number;
  quickMacroTag?: ChatMessage["quickMacroTag"];
  embeddedLeg?: FlightLegSummaryEmbed;
}

export function getSimulatedCrewReplies(
  channel: ChatChannel,
  incomingMessage: string,
  macroTag?: ChatMessage["quickMacroTag"]
): SimulatedResponse[] {
  const text = incomingMessage.toLowerCase().trim();

  // 1. DIRECT PERSON-TO-PERSON CHATS
  if (channel.type === "DIRECT") {
    const recipient =
      channel.participantDetails.find((p) => p.userId !== "user-current") ||
      channel.participantDetails[0] ||
      CREW_ROSTER[0];

    // FO Marcus Vance
    if (recipient.name.includes("Marcus") || recipient.role === "FO") {
      if (macroTag === "CREW_VAN" || text.includes("van") || text.includes("lobby") || text.includes("hotel")) {
        return [
          {
            sender: recipient,
            content: "Got it Austin! Grabbed my crew bag, in the elevator heading down to the lobby now 🚐",
            delayMs: 1400,
          },
        ];
      }

      if (macroTag === "RUNNING_LATE" || text.includes("delay") || text.includes("late") || text.includes("gate")) {
        return [
          {
            sender: recipient,
            content: "Roger that. I'll finish up the preflight checks and let station ops know we're standing by.",
            delayMs: 1800,
          },
        ];
      }

      if (macroTag === "DEICING" || text.includes("deice") || text.includes("ice") || text.includes("snow")) {
        return [
          {
            sender: recipient,
            content: "De-ice pad frequency is 129.85. Type IV fluid holdover time is running. Flaps set for taxi.",
            delayMs: 1600,
          },
        ];
      }

      if (text.includes("flight") || text.includes("3842") || text.includes("leg") || text.includes("fuel")) {
        return [
          {
            sender: recipient,
            content: "Copied Captain. Flight release received with KGRR alternate. Fuel on board is 14,400 lbs. FMC is programmed and cross-checked.",
            delayMs: 2000,
          },
        ];
      }

      if (text.includes("swap") || text.includes("trade") || text.includes("off") || text.includes("sequence")) {
        return [
          {
            sender: recipient,
            content: "Let me pull up my calendar! Next Friday looks open on my schedule. Shoot me the sequence trade proposal and I'll accept it 👍",
            delayMs: 1800,
          },
        ];
      }

      // Default conversational reply
      const casualReplies = [
        "Hey Austin! Just got into the ops room grabbing coffee. All set for today's turns.",
        "Loud and clear. Weather along the route looks smooth with light turbulence descending through FL180.",
        "Sounds great Captain! Standing by at the gate.",
        "Got your message! Preflight walkaround is 100% complete and exterior gear pins are stowed.",
      ];
      const randomReply = casualReplies[Math.floor(Math.random() * casualReplies.length)];

      return [
        {
          sender: recipient,
          content: randomReply,
          delayMs: 1500,
        },
      ];
    }

    // LFA Elena Rostova
    if (recipient.name.includes("Elena") || recipient.role === "LFA") {
      if (macroTag === "CREW_VAN" || text.includes("van")) {
        return [
          {
            sender: recipient,
            content: "Cabin crew is ready in the lobby! See you at the shuttle.",
            delayMs: 1200,
          },
        ];
      }

      return [
        {
          sender: recipient,
          content: "Hi Austin! Emergency equipment checklist verified and cabin catering is loaded. Ready for boarding whenever you give the signal.",
          delayMs: 1600,
        },
      ];
    }

    // Dispatch
    if (recipient.name.includes("Dispatch") || recipient.employeeId.includes("DSP")) {
      return [
        {
          sender: recipient,
          content: "Flight Dispatch copy. Route winds aloft updated. En route turbulence moderate near waypoint BDF, FL310 recommended.",
          delayMs: 1700,
        },
      ];
    }

    // Generic Crew Contact
    return [
      {
        sender: recipient,
        content: `Thanks Austin, received loud and clear! Let me know if you need anything from ${recipient.base}.`,
        delayMs: 1500,
      },
    ];
  }

  // 2. PAIRING / GROUP CHATS
  if (channel.type === "SEQUENCE") {
    const fo = CREW_ROSTER[0];
    const lfa = CREW_ROSTER[2];

    if (macroTag === "CREW_VAN" || text.includes("van") || text.includes("lobby")) {
      return [
        {
          sender: fo,
          content: "Copy van departure. Downstairs in 2 mins.",
          delayMs: 1200,
        },
        {
          sender: lfa,
          content: "Cabin crew is in the lobby waiting at the curb 🚐",
          delayMs: 2500,
        },
      ];
    }

    if (macroTag === "GATE_HOLD" || text.includes("delay") || text.includes("hold")) {
      return [
        {
          sender: fo,
          content: "Monitoring Ground Control 121.75. We'll hold position with engines cut to save fuel.",
          delayMs: 1600,
        },
      ];
    }

    return [
      {
        sender: fo,
        content: "Roger that Captain, copied for the whole crew.",
        delayMs: 1500,
      },
    ];
  }

  // 3. BASE DOMICILE CHANNELS (e.g. ORD, DFW)
  if (channel.type === "BASE") {
    const baseBot: MessageSender = {
      userId: `base-${channel.base || "ORD"}-bot`,
      name: `${channel.base || "ORD"} Operations Dispatch`,
      employeeId: `BASE-${channel.base || "ORD"}`,
      role: "CA",
      base: channel.base || "ORD",
    };

    return [
      {
        sender: baseBot,
        content: `[${channel.base} OPS ADVISORY]: Ground metering in effect. Average taxi out time is 18 minutes. Runways 28C/28R active for departures.`,
        delayMs: 1400,
      },
    ];
  }

  // 4. TRADE MARKETPLACE
  if (channel.type === "TRADE_MARKETPLACE") {
    const peerPilot = CREW_ROSTER[4]; // Capt. Sarah Jenkins
    return [
      {
        sender: peerPilot,
        content: "Interesting pairing! Checking my reserve schedule to see if scheduling will approve a direct swap.",
        delayMs: 2200,
      },
    ];
  }

  return [];
}
