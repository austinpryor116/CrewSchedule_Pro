import { PersonalCalendarEvent, SubscribedCalendar } from "../types";

export interface PilotContractualMonth {
  calendarMonth: string;
  contractualDates: string; // e.g. "01Aug-30Aug"
  contractualStart: string; // YYYY-MM-DD
  contractualEnd: string;   // YYYY-MM-DD
  bidsOpenDate: string;     // YYYY-MM-DD
  bidsCloseAwardDate: string; // YYYY-MM-DD
  ttotOpenDate: string;     // YYYY-MM-DD
  ttotCloseDate: string;    // YYYY-MM-DD
  compRlfStart: string;     // YYYY-MM-DD
  compRlfEnd: string;       // YYYY-MM-DD
  openTime48hStart: string; // YYYY-MM-DD
  openTime48hEnd: string;   // YYYY-MM-DD
  ttotReopenDate: string;   // YYYY-MM-DD
}

/**
 * Pilot Contractual Bid & Transition Dates (2026)
 * Sourced from DOC_CRS_Bid-Dates.pdf (Envoy Flight Operations / CBA)
 */
export const PILOT_CONTRACTUAL_MONTHS_2026: PilotContractualMonth[] = [
  {
    calendarMonth: "JANUARY",
    contractualDates: "01Jan-30Jan",
    contractualStart: "2026-01-01",
    contractualEnd: "2026-01-30",
    bidsOpenDate: "2025-12-15",
    bidsCloseAwardDate: "2025-12-20",
    ttotOpenDate: "2025-12-24",
    ttotCloseDate: "2025-12-25",
    compRlfStart: "2025-12-25",
    compRlfEnd: "2025-12-27",
    openTime48hStart: "2025-12-27",
    openTime48hEnd: "2025-12-29",
    ttotReopenDate: "2025-12-31",
  },
  {
    calendarMonth: "FEBRUARY",
    contractualDates: "31Jan-01Mar",
    contractualStart: "2026-01-31",
    contractualEnd: "2026-03-01",
    bidsOpenDate: "2026-01-14",
    bidsCloseAwardDate: "2026-01-19",
    ttotOpenDate: "2026-01-23",
    ttotCloseDate: "2026-01-24",
    compRlfStart: "2026-01-24",
    compRlfEnd: "2026-01-26",
    openTime48hStart: "2026-01-26",
    openTime48hEnd: "2026-01-28",
    ttotReopenDate: "2026-01-30",
  },
  {
    calendarMonth: "MARCH",
    contractualDates: "02Mar-31Mar",
    contractualStart: "2026-03-02",
    contractualEnd: "2026-03-31",
    bidsOpenDate: "2026-02-14",
    bidsCloseAwardDate: "2026-02-19",
    ttotOpenDate: "2026-02-23",
    ttotCloseDate: "2026-02-24",
    compRlfStart: "2026-02-24",
    compRlfEnd: "2026-02-26",
    openTime48hStart: "2026-02-26",
    openTime48hEnd: "2026-02-28",
    ttotReopenDate: "2026-03-02",
  },
  {
    calendarMonth: "APRIL",
    contractualDates: "01Apr-30Apr",
    contractualStart: "2026-04-01",
    contractualEnd: "2026-04-30",
    bidsOpenDate: "2026-03-15",
    bidsCloseAwardDate: "2026-03-20",
    ttotOpenDate: "2026-03-24",
    ttotCloseDate: "2026-03-25",
    compRlfStart: "2026-03-25",
    compRlfEnd: "2026-03-27",
    openTime48hStart: "2026-03-27",
    openTime48hEnd: "2026-03-29",
    ttotReopenDate: "2026-03-31",
  },
  {
    calendarMonth: "MAY",
    contractualDates: "01May-31May",
    contractualStart: "2026-05-01",
    contractualEnd: "2026-05-31",
    bidsOpenDate: "2026-04-14",
    bidsCloseAwardDate: "2026-04-19",
    ttotOpenDate: "2026-04-23",
    ttotCloseDate: "2026-04-24",
    compRlfStart: "2026-04-24",
    compRlfEnd: "2026-04-26",
    openTime48hStart: "2026-04-26",
    openTime48hEnd: "2026-04-28",
    ttotReopenDate: "2026-04-30",
  },
  {
    calendarMonth: "JUNE",
    contractualDates: "01Jun-01Jul",
    contractualStart: "2026-06-01",
    contractualEnd: "2026-07-01",
    bidsOpenDate: "2026-05-15",
    bidsCloseAwardDate: "2026-05-20",
    ttotOpenDate: "2026-05-24",
    ttotCloseDate: "2026-05-25",
    compRlfStart: "2026-05-25",
    compRlfEnd: "2026-05-27",
    openTime48hStart: "2026-05-27",
    openTime48hEnd: "2026-05-29",
    ttotReopenDate: "2026-05-31",
  },
  {
    calendarMonth: "JULY",
    contractualDates: "02Jul-31Jul",
    contractualStart: "2026-07-02",
    contractualEnd: "2026-07-31",
    bidsOpenDate: "2026-06-15",
    bidsCloseAwardDate: "2026-06-20",
    ttotOpenDate: "2026-06-24",
    ttotCloseDate: "2026-06-25",
    compRlfStart: "2026-06-25",
    compRlfEnd: "2026-06-27",
    openTime48hStart: "2026-06-27",
    openTime48hEnd: "2026-06-29",
    ttotReopenDate: "2026-07-01",
  },
  {
    calendarMonth: "AUGUST",
    contractualDates: "01Aug-30Aug",
    contractualStart: "2026-08-01",
    contractualEnd: "2026-08-30",
    bidsOpenDate: "2026-07-15",
    bidsCloseAwardDate: "2026-07-20",
    ttotOpenDate: "2026-07-24",
    ttotCloseDate: "2026-07-25",
    compRlfStart: "2026-07-25",
    compRlfEnd: "2026-07-27",
    openTime48hStart: "2026-07-27",
    openTime48hEnd: "2026-07-29",
    ttotReopenDate: "2026-07-31",
  },
  {
    calendarMonth: "SEPTEMBER",
    contractualDates: "31Aug-30Sep",
    contractualStart: "2026-08-31",
    contractualEnd: "2026-09-30",
    bidsOpenDate: "2026-08-14",
    bidsCloseAwardDate: "2026-08-19",
    ttotOpenDate: "2026-08-23",
    ttotCloseDate: "2026-08-24",
    compRlfStart: "2026-08-24",
    compRlfEnd: "2026-08-26",
    openTime48hStart: "2026-08-26",
    openTime48hEnd: "2026-08-28",
    ttotReopenDate: "2026-08-30",
  },
  {
    calendarMonth: "OCTOBER",
    contractualDates: "01Oct-31Oct",
    contractualStart: "2026-10-01",
    contractualEnd: "2026-10-31",
    bidsOpenDate: "2026-09-14",
    bidsCloseAwardDate: "2026-09-19",
    ttotOpenDate: "2026-09-23",
    ttotCloseDate: "2026-09-24",
    compRlfStart: "2026-09-24",
    compRlfEnd: "2026-09-26",
    openTime48hStart: "2026-09-26",
    openTime48hEnd: "2026-09-28",
    ttotReopenDate: "2026-09-30",
  },
  {
    calendarMonth: "NOVEMBER",
    contractualDates: "01Nov-01Dec",
    contractualStart: "2026-11-01",
    contractualEnd: "2026-12-01",
    bidsOpenDate: "2026-10-15",
    bidsCloseAwardDate: "2026-10-20",
    ttotOpenDate: "2026-10-24",
    ttotCloseDate: "2026-10-25",
    compRlfStart: "2026-10-25",
    compRlfEnd: "2026-10-27",
    openTime48hStart: "2026-10-27",
    openTime48hEnd: "2026-10-29",
    ttotReopenDate: "2026-10-31",
  },
  {
    calendarMonth: "DECEMBER",
    contractualDates: "02Dec-31Dec",
    contractualStart: "2026-12-02",
    contractualEnd: "2026-12-31",
    bidsOpenDate: "2026-11-15",
    bidsCloseAwardDate: "2026-11-20",
    ttotOpenDate: "2026-11-24",
    ttotCloseDate: "2026-11-25",
    compRlfStart: "2026-11-25",
    compRlfEnd: "2026-11-27",
    openTime48hStart: "2026-11-27",
    openTime48hEnd: "2026-11-29",
    ttotReopenDate: "2026-12-01",
  },
  {
    calendarMonth: "JANUARY 2027",
    contractualDates: "01Jan-30Jan",
    contractualStart: "2027-01-01",
    contractualEnd: "2027-01-30",
    bidsOpenDate: "2026-12-15",
    bidsCloseAwardDate: "2026-12-20",
    ttotOpenDate: "2026-12-24",
    ttotCloseDate: "2026-12-25",
    compRlfStart: "2026-12-25",
    compRlfEnd: "2026-12-27",
    openTime48hStart: "2026-12-27",
    openTime48hEnd: "2026-12-29",
    ttotReopenDate: "2026-12-31",
  },
];

/**
 * Generates contractual month dates algorithmically for any given year.
 * Standard Envoy/American Eagle CBA timing:
 * - Bidding window opens 14th/15th of prior month, closes/awards 19th/20th at 12:00.
 * - TTOT window opens 23rd/24th of prior month, closes 24th/25th at 12:00.
 * - Comp & Relief lines build 24th/25th to 26th/27th.
 * - 48-Hour Open Time opens 26th/27th to 28th/29th.
 * - TTOT reopens on 30th/31st/1st.
 */
export function getContractualMonthsForYear(year: number): PilotContractualMonth[] {
  if (year === 2026) {
    return PILOT_CONTRACTUAL_MONTHS_2026.filter((m) => !m.calendarMonth.includes("2027"));
  }

  const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];

  return monthNames.map((name, idx) => {
    const targetMonth = idx; // 0 to 11
    const priorMonthDate = new Date(year, targetMonth - 1, 1);
    const priorYear = priorMonthDate.getFullYear();
    const priorMonth = priorMonthDate.getMonth(); // 0 to 11
    const pad = (n: number) => String(n).padStart(2, "0");

    const pY = priorYear;
    const pM = pad(priorMonth + 1);
    const tY = year;
    const tM = pad(targetMonth + 1);

    // Days in target month
    const daysInTarget = new Date(year, targetMonth + 1, 0).getDate();
    // Days in prior month
    const daysInPrior = new Date(priorYear, priorMonth + 1, 0).getDate();

    const bidsOpenDay = 15;
    const bidsCloseDay = 20;
    const ttotOpenDay = 24;
    const ttotCloseDay = 25;
    const compRlfStartDay = 25;
    const compRlfEndDay = Math.min(27, daysInPrior);
    const openTimeStartDay = Math.min(27, daysInPrior);
    const openTimeEndDay = Math.min(29, daysInPrior);
    const ttotReopenDay = Math.min(31, daysInPrior);

    return {
      calendarMonth: `${name} ${year}`,
      contractualDates: `01${name.slice(0, 3)}-${daysInTarget}${name.slice(0, 3)}`,
      contractualStart: `${tY}-${tM}-01`,
      contractualEnd: `${tY}-${tM}-${pad(daysInTarget)}`,
      bidsOpenDate: `${pY}-${pM}-${pad(bidsOpenDay)}`,
      bidsCloseAwardDate: `${pY}-${pM}-${pad(bidsCloseDay)}`,
      ttotOpenDate: `${pY}-${pM}-${pad(ttotOpenDay)}`,
      ttotCloseDate: `${pY}-${pM}-${pad(ttotCloseDay)}`,
      compRlfStart: `${pY}-${pM}-${pad(compRlfStartDay)}`,
      compRlfEnd: `${pY}-${pM}-${pad(compRlfEndDay)}`,
      openTime48hStart: `${pY}-${pM}-${pad(openTimeStartDay)}`,
      openTime48hEnd: `${pY}-${pM}-${pad(openTimeEndDay)}`,
      ttotReopenDate: `${pY}-${pM}-${pad(ttotReopenDay)}`,
    };
  });
}

export const PILOT_BIDDING_CALENDAR_ID = "cal-pilot-contractual-bidding";

export const PILOT_BIDDING_CALENDAR: SubscribedCalendar = {
  id: PILOT_BIDDING_CALENDAR_ID,
  name: "Pilot Contractual Bid & Transition Dates",
  url: "https://crewschedule.pro/feed/pilot-contractual-dates.ics",
  color: "indigo",
  enabled: true,
  lastSyncedAt: "Contractual Schedule",
  eventsCount: 150,
  isPilotOnly: true,
  targetRole: "pilot",
};

/**
 * Generates all Pilot Contractual events across multi-year schedules (2025 - 2030+).
 * All windows that span multiple days are configured with startDate & endDate
 * so they render as continuous multi-day blocks on the calendar grid.
 */
export function generatePilotContractualEvents(years: number[] = [2025, 2026, 2027, 2028, 2029, 2030]): PersonalCalendarEvent[] {
  const events: PersonalCalendarEvent[] = [];

  years.forEach((yr) => {
    const months = yr === 2026 ? PILOT_CONTRACTUAL_MONTHS_2026 : getContractualMonthsForYear(yr);
    months.forEach((m) => {
      const monthTag = m.calendarMonth.slice(0, 3).toUpperCase();
      const monthFull = m.calendarMonth;

    // 1. Pilot Bidding Window (Multi-day block from Bids Open to Bids Close & Award)
    events.push({
      id: `evt-bidding-window-${monthTag.toLowerCase()}-${m.bidsOpenDate}`,
      calendarId: PILOT_BIDDING_CALENDAR_ID,
      title: `${monthTag} Bidding Window`,
      startDate: m.bidsOpenDate,
      endDate: m.bidsCloseAwardDate,
      startTime: "12:00",
      endTime: "12:00",
      isAllDay: false,
      category: "pilot_bidding",
      color: "indigo",
      isPilotOnly: true,
      targetRole: "pilot",
      location: "Pilot Crew Portal / FOS",
      notes: `Pilot contractual bidding window for ${monthFull} (${m.contractualDates}). Bidding opens at 12:00 Noon on ${m.bidsOpenDate} and closes with schedule awards published at 12:00 Noon on ${m.bidsCloseAwardDate}.`,
    });

    // 2. TTOT Trade Window (Multi-day block from TTOT Open to TTOT Close)
    events.push({
      id: `evt-ttot-window-${monthTag.toLowerCase()}-${m.ttotOpenDate}`,
      calendarId: PILOT_BIDDING_CALENDAR_ID,
      title: `${monthTag} TTOT Window`,
      startDate: m.ttotOpenDate,
      endDate: m.ttotCloseDate,
      startTime: "12:00",
      endTime: "12:00",
      isAllDay: false,
      category: "pilot_bidding",
      color: "amber",
      isPilotOnly: true,
      targetRole: "pilot",
      location: "Trip Trade & Open Time (TTOT)",
      notes: `Trip Trade & Open Time (TTOT) initial trade window for ${monthFull}. Opens at 12:00 Noon on ${m.ttotOpenDate} and closes at 12:00 Noon on ${m.ttotCloseDate} for Composite & Relief line construction.`,
    });

    // 3. Comp & RLF Lines Built (Multi-day block)
    events.push({
      id: `evt-comp-rlf-${monthTag.toLowerCase()}-${m.compRlfStart}`,
      calendarId: PILOT_BIDDING_CALENDAR_ID,
      title: `${monthTag} Comp & RLF Lines Built`,
      startDate: m.compRlfStart,
      endDate: m.compRlfEnd,
      isAllDay: true,
      category: "pilot_bidding",
      color: "purple",
      isPilotOnly: true,
      targetRole: "pilot",
      location: "Crew Planning",
      notes: `Composite & Relief Lines built by Crew Planning for ${monthFull} (${m.compRlfStart} to ${m.compRlfEnd}).`,
    });

    // 4. 48-Hour Open Time Window (Multi-day block from Open Time Opens to Open Time Closes & Awarding Begins)
    events.push({
      id: `evt-48h-window-${monthTag.toLowerCase()}-${m.openTime48hStart}`,
      calendarId: PILOT_BIDDING_CALENDAR_ID,
      title: `${monthTag} 48-Hr Open Time Window`,
      startDate: m.openTime48hStart,
      endDate: m.openTime48hEnd,
      startTime: "12:00",
      endTime: "12:00",
      isAllDay: false,
      category: "pilot_bidding",
      color: "emerald",
      isPilotOnly: true,
      targetRole: "pilot",
      location: "48-Hour Open Time",
      notes: `48-Hour Priority Open Time Window for ${monthFull}. Opens at 12:00 Noon on ${m.openTime48hStart} and closes at 12:00 Noon on ${m.openTime48hEnd} (pilot awarding begins).`,
    });

    // 5. TTOT Reopens For Next Month (Single-day milestone)
    events.push({
      id: `evt-ttot-reopen-${monthTag.toLowerCase()}-${m.ttotReopenDate}`,
      calendarId: PILOT_BIDDING_CALENDAR_ID,
      title: `TTOT Reopens for ${monthTag} (Noon)`,
      startDate: m.ttotReopenDate,
      endDate: m.ttotReopenDate,
      startTime: "12:00",
      endTime: "13:00",
      isAllDay: false,
      category: "pilot_bidding",
      color: "amber",
      isPilotOnly: true,
      targetRole: "pilot",
      location: "TTOT System",
      notes: `Trip Trade & Open Time (TTOT) officially reopens at 12:00 Noon on ${m.ttotReopenDate} for ${monthFull} operational schedule.`,
    });
  });
  });

  return events;
}

export const DEFAULT_PILOT_BIDDING_EVENTS: PersonalCalendarEvent[] = generatePilotContractualEvents();

/**
 * Check whether a given user role is a Pilot
 */
export function isPilotRole(crewRole?: string): boolean {
  if (!crewRole) return true; // Default is pilot (Captain)
  const norm = crewRole.trim().toUpperCase();
  return (
    norm === "CA" ||
    norm === "FO" ||
    norm === "CHECK_PILOT" ||
    norm === "PILOT" ||
    norm === "CAPTAIN" ||
    norm === "FIRST OFFICER" ||
    norm === "CHECK PILOT"
  );
}
