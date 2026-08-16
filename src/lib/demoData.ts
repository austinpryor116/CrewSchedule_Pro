import { USER_LIVE_SEQUENCES, USER_LOGBOOK_ENTRIES } from "./userScheduleData";
import { SequenceTrip, PayRates, VacationPeriod, LogbookEntry } from "../types";

export const DEFAULT_PAY_RATES: PayRates = {
  hourlyRate: 198.75, // $/hr (Year 11 Captain from CBA Sec. 3.D.1 2026 Table w/ 50% PSP)
  overtimeMultiplier: 1.5,
  perDiemRate: 2.00, // $/hr for Time Away From Base (CBA Sec. 5.B)
  intlPerDiemRate: 2.00,
  minDailyGuaranteeMinutes: 222, // 3.7 hours (3:42) Value of Day (CBA Sec. 3.F.1)
  monthlyGuaranteeHours: 72.0, // CBA Sec. 3.E.1 Lineholder Minimum Guarantee
  deadheadPayRatio: 1.0, // 100% Deadhead Pay
  holdingPayRate: 45.0,
  tafbHours: 0,

  crewRole: "CA",
  equipment: "E175",
  homeBase: "ORD",

  legalityStandard: "FAR117",
  minRestHours: 10.0,
  maxFdpHours: 13.0,
  maxDailyFlightHours: 9.0,
  max28DayFlightHours: 100.0,

  reportBufferMins: 45,
  releaseBufferMins: 15,
};

export const DEFAULT_SUBSCRIBED_CALENDARS = [
  {
    id: "cal-opentime-48h",
    name: "48-Hour Open Time Priority Feed",
    url: "https://crewschedule.pro/feed/opentime-48h.ics",
    color: "amber",
    enabled: true,
    lastSyncedAt: "Today at 18:00",
    eventsCount: 1,
  },
  {
    id: "cal-spouse-01",
    name: "Spouse Schedule (B737 Captain)",
    url: "https://crewschedule.pro/feed/spouse-9912.ics",
    color: "purple",
    enabled: true,
    lastSyncedAt: "Today at 16:45",
    eventsCount: 2,
  },
  {
    id: "cal-personal-02",
    name: "Personal Google Calendar",
    url: "https://calendar.google.com/calendar/ical/user%40gmail.com/public/basic.ics",
    color: "teal",
    enabled: true,
    lastSyncedAt: "Today at 17:10",
    eventsCount: 1,
  },
];

export const DEFAULT_PERSONAL_EVENTS = [
  {
    id: "evt-opentime-48h",
    calendarId: "cal-opentime-48h",
    title: "48-Hour Open Time Window (ORD)",
    startDate: "2026-07-27",
    endDate: "2026-07-29",
    startTime: "00:00",
    endTime: "23:59",
    location: "ORD Base Open Time",
    notes: "CBA 48-Hour Priority Open Time Pickup Window (July 27 - July 29)",
    color: "amber",
  },
  {
    id: "evt-01",
    calendarId: "cal-spouse-01",
    title: "Spouse Sequence #22841 (ORD->MIA)",
    startDate: "2026-07-28",
    endDate: "2026-07-29",
    startTime: "08:00",
    endTime: "19:00",
    location: "MIA Layover",
    notes: "Spouse pairing flight",
    color: "purple",
  },
  {
    id: "evt-02",
    calendarId: "cal-personal-02",
    title: "Family Dinner & Anniversary",
    startDate: "2026-08-01",
    endDate: "2026-08-01",
    startTime: "18:30",
    endTime: "21:00",
    location: "Gibson's Steakhouse ORD",
    notes: "Anniversary dinner",
    color: "teal",
  },
];

// Generate realistic sequences for July/August 2026
export const MOCK_SEQUENCES: SequenceTrip[] = [
  {
    id: "seq-17894-jul27",
    sequenceNumber: "17894",
    startDate: "2026-07-27",
    endDate: "2026-07-28",
    base: "ORD",
    equipment: "E75E",
    totalBlockMinutes: 478,
    totalCreditMinutes: 478,
    layoverCities: ["CAE"],
    colorTag: "sky",
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: "1421",
        releaseTime: "2319",
        dutyMinutes: 538,
        legs: [
          {
            flightNumber: "AA3980",
            depAirport: "ORD",
            arrAirport: "DTW",
            depTime: "1506",
            arrTime: "1741",
            blockMinutes: 95,
          },
          {
            flightNumber: "AA3980",
            depAirport: "DTW",
            arrAirport: "ORD",
            depTime: "1811",
            arrTime: "1858",
            blockMinutes: 107,
          },
          {
            flightNumber: "AA4275",
            depAirport: "ORD",
            arrAirport: "CAE",
            depTime: "2014",
            arrTime: "2319",
            blockMinutes: 125,
          },
        ],
        layoverCity: "CAE",
        layoverHotelInfo: "Courtyard Columbia Downtown at USC (803-799-7800)",
      },
      {
        dayIndex: 1,
        reportTime: "1528",
        releaseTime: "1844",
        dutyMinutes: 196,
        legs: [
          {
            flightNumber: "AA4183",
            depAirport: "CAE",
            arrAirport: "ORD",
            depTime: "1713",
            arrTime: "1844",
            blockMinutes: 151,
          },
        ],
        layoverCity: "",
        layoverHotelInfo: "",
      },
    ],
  },
  {
    id: "S8341-demo-1",
    sequenceNumber: "S8341",
    startDate: "2026-07-22",
    endDate: "2026-07-25",
    base: "ORD",
    equipment: "B737",
    totalBlockMinutes: 980, // ~16.3 hrs
    totalCreditMinutes: 1200, // 4 days * 300 min = 1200 min (20.0 hrs) due to soft pay guarantee!
    layoverCities: ["DEN", "SFO", "PHX"],
    colorTag: "sky",
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: "0715",
        releaseTime: "1530",
        dutyMinutes: 495,
        legs: [
          {
            flightNumber: "AA1245",
            depAirport: "ORD",
            arrAirport: "DEN",
            depTime: "0800",
            arrTime: "0945",
            blockMinutes: 165,
            tailNumber: "N372AA",
          },
          {
            flightNumber: "AA1320",
            depAirport: "DEN",
            arrAirport: "SFO",
            depTime: "1100",
            arrTime: "1230",
            blockMinutes: 150,
            tailNumber: "N372AA",
          },
        ],
        layoverCity: "DEN",
        layoverHotelInfo: "The Westin Denver International Airport (303-317-1800)",
      },
      {
        dayIndex: 1,
        reportTime: "0830",
        releaseTime: "1630",
        dutyMinutes: 480,
        legs: [
          {
            flightNumber: "AA842",
            depAirport: "DEN",
            arrAirport: "PHX",
            depTime: "0915",
            arrTime: "1100",
            blockMinutes: 165,
            tailNumber: "N304AA",
          },
          {
            flightNumber: "AA1094",
            depAirport: "PHX",
            arrAirport: "SFO",
            depTime: "1230",
            arrTime: "1445",
            blockMinutes: 195,
            tailNumber: "N304AA",
          },
        ],
        layoverCity: "SFO",
        layoverHotelInfo: "Grand Hyatt at SFO (650-452-1234)",
      },
      {
        dayIndex: 2,
        reportTime: "1215",
        releaseTime: "1945",
        dutyMinutes: 450,
        legs: [
          {
            flightNumber: "AA443",
            depAirport: "SFO",
            arrAirport: "LAX",
            depTime: "1300",
            arrTime: "1425",
            blockMinutes: 85,
            tailNumber: "N911AA",
          },
          {
            flightNumber: "AA2201",
            depAirport: "LAX",
            arrAirport: "PHX",
            depTime: "1600",
            arrTime: "1720",
            blockMinutes: 80,
            tailNumber: "N911AA",
          },
        ],
        layoverCity: "PHX",
        layoverHotelInfo: "Sheraton Phoenix Downtown (602-262-2500)",
      },
      {
        dayIndex: 3,
        reportTime: "0815",
        releaseTime: "1415",
        dutyMinutes: 360,
        legs: [
          {
            flightNumber: "AA904",
            depAirport: "PHX",
            arrAirport: "ORD",
            depTime: "0900",
            arrTime: "1345",
            blockMinutes: 225,
            tailNumber: "N372AA",
          },
        ],
        layoverCity: "",
        layoverHotelInfo: "",
      },
    ],
  },
  {
    id: "S4492-demo-2",
    sequenceNumber: "S4492",
    startDate: "2026-07-28",
    endDate: "2026-07-30",
    base: "ORD",
    equipment: "A321",
    totalBlockMinutes: 870, // 14.5 hrs
    totalCreditMinutes: 900, // 3 days * 300 min = 900 min (15.0 hrs)
    layoverCities: ["MIA", "LGA"],
    colorTag: "emerald",
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: "1415",
        releaseTime: "2230",
        dutyMinutes: 495,
        legs: [
          {
            flightNumber: "AA342",
            depAirport: "ORD",
            arrAirport: "MIA",
            depTime: "1500",
            arrTime: "1915",
            blockMinutes: 255,
            tailNumber: "N984AA",
          },
        ],
        layoverCity: "MIA",
        layoverHotelInfo: "Miami Airport Marriott (305-649-5000)",
      },
      {
        dayIndex: 1,
        reportTime: "1000",
        releaseTime: "1745",
        dutyMinutes: 465,
        legs: [
          {
            flightNumber: "AA506",
            depAirport: "MIA",
            arrAirport: "LGA",
            depTime: "1045",
            arrTime: "1350",
            blockMinutes: 185,
            tailNumber: "N984AA",
          },
          {
            flightNumber: "AA722",
            depAirport: "LGA",
            arrAirport: "MIA",
            depTime: "1445",
            arrTime: "1715",
            blockMinutes: 150,
            tailNumber: "N956AA",
          },
        ],
        layoverCity: "MIA",
        layoverHotelInfo: "Miami Airport Marriott (305-649-5000)",
      },
      {
        dayIndex: 2,
        reportTime: "0615",
        releaseTime: "1230",
        dutyMinutes: 375,
        legs: [
          {
            flightNumber: "AA811",
            depAirport: "MIA",
            arrAirport: "ORD",
            depTime: "0700",
            arrTime: "1200",
            blockMinutes: 280,
            tailNumber: "N956AA",
          },
        ],
        layoverCity: "",
        layoverHotelInfo: "",
      },
    ],
  },
  {
    id: "S7210-demo-3",
    sequenceNumber: "S7210",
    startDate: "2026-08-03",
    endDate: "2026-08-04",
    base: "ORD",
    equipment: "B737",
    totalBlockMinutes: 620, // 10.3 hrs
    totalCreditMinutes: 620, // Over daily min guarantee
    layoverCities: ["DFW"],
    colorTag: "amber",
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: "0515",
        releaseTime: "1245",
        dutyMinutes: 450,
        legs: [
          {
            flightNumber: "AA109",
            depAirport: "ORD",
            arrAirport: "DFW",
            depTime: "0600",
            arrTime: "0830",
            blockMinutes: 150,
            tailNumber: "N322AA",
          },
          {
            flightNumber: "AA803",
            depAirport: "DFW",
            arrAirport: "SAT",
            depTime: "0930",
            arrTime: "1035",
            blockMinutes: 65,
            tailNumber: "N322AA",
          },
          {
            flightNumber: "AA804",
            depAirport: "SAT",
            arrAirport: "DFW",
            depTime: "1115",
            arrTime: "1215",
            blockMinutes: 60,
            tailNumber: "N322AA",
          },
        ],
        layoverCity: "DFW",
        layoverHotelInfo: "Hyatt Regency DFW International Airport (972-453-1234)",
      },
      {
        dayIndex: 1,
        reportTime: "0915",
        releaseTime: "1530",
        dutyMinutes: 375,
        legs: [
          {
            flightNumber: "AA220",
            depAirport: "DFW",
            arrAirport: "ORD",
            depTime: "1000",
            arrTime: "1245",
            blockMinutes: 165,
            tailNumber: "N345AA",
          },
          {
            flightNumber: "AA443",
            depAirport: "ORD",
            arrAirport: "MSP",
            depTime: "1345",
            arrTime: "1500",
            blockMinutes: 75,
            tailNumber: "N345AA",
          },
          {
            flightNumber: "AA444",
            depAirport: "MSP",
            arrAirport: "ORD",
            depTime: "1545",
            arrTime: "1700",
            blockMinutes: 75, // wait, release is 1530? Let's fix this for consistency: release 1730
            tailNumber: "N345AA",
          },
        ],
        layoverCity: "",
        layoverHotelInfo: "",
      },
    ],
  },
];

// Correct release time on day 2 of sequence S7210
const s7210 = MOCK_SEQUENCES.find((s) => s.sequenceNumber === "S7210");
if (s7210 && s7210.dutyPeriods[1]) {
  s7210.dutyPeriods[1].releaseTime = "1730";
  s7210.dutyPeriods[1].dutyMinutes = 495;
  if (s7210.dutyPeriods[1].legs[2]) s7210.dutyPeriods[1].legs[2].blockMinutes = 75;
  s7210.totalBlockMinutes = 150 + 65 + 60 + 165 + 75 + 75;
  s7210.totalCreditMinutes = Math.max(150 + 65 + 60, 300) + Math.max(165 + 75 + 75, 300);
}

export const RAW_DEMO_TEXT = `
SEQ S8341 BASE ORD EQ B737 DATES 2026-07-22 to 2026-07-25
REPORT 0715 RELEASE 1530
1245 ORD-DEN 0800 0945 165 N372AA
1320 DEN-SFO 1100 1230 150 N372AA
LAYOVER SFO
HOTEL Grand Hyatt at SFO (650-452-1234)

REPORT 0830 RELEASE 1630
842 DEN-PHX 0915 1100 165 N304AA
1094 PHX-SFO 1230 1445 195 N304AA
LAYOVER SFO
HOTEL Grand Hyatt at SFO (650-452-1234)

REPORT 1215 RELEASE 1945
443 SFO-LAX 1300 1425 85 N911AA
2201 LAX-PHX 1600 1720 80 N911AA
LAYOVER PHX
HOTEL Sheraton Phoenix Downtown (602-262-2500)

REPORT 0815 RELEASE 1415
904 PHX-ORD 0900 1345 225 N372AA
`;

export const RAW_HI1_TEXT = `MONTH ENDING 31JUL26 AS OF 17JUL26/2151 SC-Y
PRYOR AR 01361 742840 ORD 502-CA E75E
H 812-399-2574
V 8123992574
D EXP 136.29 I EXP 0.00
GUAR 72.00 FLT TIME 672 HOURS/ 64.48 365 DAY/ 763.19
PTL TRIP TRD 0 DROP 0
BID SEL PROJ FOR: E75E 47.14 E70E 28.28
BID SEL PROJ 75.42
FLT DUTY PERIOD TIME 168 HOURS/ 41.37 672 HOURS/115.12
AVBL SK 20.47 YTD SK ACRL 0.00 SK USED MTD 0.00
LONG TERM SK AVAIL 0.00 LONG TERM SK USED MTD 0.00
SHORT TERM SICK PAYOUT ACCRUAL 21.00
SK TIME AVAIL FOR M/U 0.00
SK M/U MTD 0.00 BYPASS SK ACCRUAL - NO
TTL SK USED YTD 18.58 TTL SK USED PREV YEAR 50.53
 DD ST RMV ADD SEQ FLT FLT SKED STTL ACT GRTR GTTL
 02 1 24 0000 2400
 03 1 24 0000 2400
 04 1 24 0000 2400
 05 1 24 0000 2400
 06 1 TT 17352 -4153 2.32
 07 1 TT -4301 -4163 4.39
 08 1 TT -3572 -3862
 -3862 6.50 14.01 0.00
 06 1 TT 21649 -3453 -3453
 -3511 6.48 6.00 6.48
 07 1 TT -3707 -3428 5.11 4.15 5.11
 08 1 TT -3746 D3330 5.35 17.34 2.36 5.35 17.34
 21649 EXP TAFB 52.55 EVV 3 BIL 3
 ACT TOTAL 12.51
 09 1 24 0000 2400
 10 1 24 0000 2400
 11 1 OO 17475 -3613 2.21
 12 1 OO -3888 -4121 4.47
 13 1 OO -3807 2.15
 14 1 OO -3814 -3814
 D3711 8.59 18.22 0.00
 11 1 SH OO 18080 -3383 -3383
 -3945 5.28
 12 1 SH OO -3677 X3450 4.36
 13 1 SH OO X3520 X3783
 X3783 -3963 8.00
 14 1 SH OO -3626 1.52 19.56 0.00
SKD CHG - SEE LEG DETAIL
 11 1 RA 18080 -3383 -3383
 -3945 5.28 5.10 5.28
 12 1 RA -3677 -4254 3.59 4.24 4.28
 13 1 RA -3434 2.18 2.02 2.18
 14 1 RA D3803 -3626 3.23 15.08 1.30 3.23 15.37
 18080 EXP TAFB 77.19 MEM 3 BMI 2 DFW 2
 ACT TOTAL 13.06
 15 1 OT 21514 -3862 -3862 5.09 5.09 4.22 5.09 0.00
 21514 EXP TAFB 6.15
 ACT TOTAL 4.22
 16 1 24 0000 2400
 17 1 RA 21614 D3712 -3712
 -3827 -3827 7.27 7.27 5.04 7.27
 21614 EXP TAFB 10.29
 ACT TOTAL 5.04
 17 1 SH OT 21614 X4164 X4164 5.10 5.10 0.00
SKD CHG - SEE LEG DETAIL
 18 1 LB 25 21596 -4174 -4174 2.58 2.58 0.00
 18 1 17495 -4330 1.09
 19 1 -4328 -3491
 -3491 -4200 6.24
 20 1 -3496 -3606 4.33
 21 1 -3524 -3498
 -3498 5.17 17.23
 17495 EXP TAFB 74.07 SPI 2 HPN 2 YYZ 3
 ACT TOTAL 0.00
 22 1 24 0000 2400
 23 1 OT 21566 -4151 -4151 3.58 3.58
 21566 EXP TAFB 5.28
 ACT TOTAL 0.00
 24 1 17333 -3625 -3625
 -3712 5.33
 25 1 -4036 -3698 2.59
 26 1 -3445 -3439
 -3439 5.01 13.33
 17333 EXP TAFB 53.39 MQT 3 MLI 3
 ACT TOTAL 0.00
 27 1 TT 17894 -3812 -3812 4.45
 28 1 TT -3813 -4328 6.00 10.45
 17894 EXP TAFB 24.15 AVL 2
 ACT TOTAL 10.45
 29 1 24 0000 2400
 30 1 17270 -3446 -3446
 -4330 5.31
 31 1 -4328 -3546
 -3546 3.54 9.25
 17270 EXP TAFB 29.20 SPI 3
 ACT TOTAL 0.00
END OF DISPLAY
`;

export const RAW_N4_TEXT = "ORD E75 CA   OPEN SEQUENCES                    AS OF 27JUL/1107\n27JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\nNONE FOUND\n28JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 17357   8.52 0830 0910/30 1-2-1    VPS-CMH-\n29JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 21510   8.28 1000 1610/30 1-3      CMI-\n30JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\nNONE FOUND\n31JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 21538   1.58 0646 1737/01 1-3      XNA-\n 14002   5.05 0715 1036/02 3-2-3    XNA-TVC-\n 21550   1.21 1643 0731/02 1-3-1    CWA-CMH-\n01AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14322   8.14 0646 0842/03 1-2-1    XNA-LIT-\n 14782  12.41 1332 0842/04 1-2-2-1  ABE-COU-LIT-\n 14972  13.26 1511 1243/04 3-2-2-1  GSO-TLH-AVL-\n 15130  12.33 1829 0801/04 1-2-2-1  HPN-YYZ-COU-\n 15168  14.25 1930 1612/04 1-4-2-1  CMH-GSP-XNA-\n 15210   4.57 2058 0829/03 1/1      ALB/\n 15226  12.41 2200 1133/04 1-4/2    TVC-BUF/\n 15234  14.56 2330 1232/04 1-2-2-3  BMI-LIT-AVL-\n02AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14320  20.59 0640 1810/05 3-2-4-5  MQT-GRB-MSN-\n 06516   9.37 0659 1030/04 1-2-3    CVG-ROC-\n 14469  10.07 0709 1523/03 1-4      SYR-\n 14476   8.49 0805 0851/04 1-2-1    ROC-HPN-\n 06548   5.07 0816 1410/02 2\n 14399  14.01 0829 1539/04 1-2-3    VPS-CMH-\n 14611  16.56 1151 0043/05 1-3/3    LIT-DCA/\n 14614  13.48 1159 1929/03 3-3      CVG-\n 14439  13.53 1511 2014/04 3-2-1    AVP-AVP-\n 15146   8.53 1848 1814/04 1-2-1    GSO-SYR-\n03AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 15191  16.48 2014 1510/06 1-2-2-4  CAE-CMI-SYR-\n04AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14403   5.29 0900 0730/05 3-1      SPI-\n 14712   9.40 1321 1904/05 3-1      FAR-\n05AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14343  12.06 0800 1423/07 1-2-3    GSP-TYS-\n 14347  13.12 0805 1432/07 1-2-3    ROC-HPN-\n 14494  17.23 0806 1549/08 3-2-2-3  MSN-LIT-MAF-\n 14501  18.22 0810 2010/08 1-2-2-3  SAV-CVG-ROC-\n 14695  17.50 1320 1209/08 3-4/3    CMH-RST/\n 14953  20.27 1505 2130/08 3-2-4-1  AVP-CVG-CMH-\n 15078  18.01 1704 1939/08 3-2-4-1  PIA-TVC-SYR-\n06AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14348  13.25 0805 1428/08 1-2-3    ROC-GSP-\n 14477  17.14 0805 1259/09 3-2-2-3  GRB-AVL-ICT-\n 14514  16.39 0815 0845/09 3-2-2-1  ORF-DAY-TYS-\n 14606  16.17 1148 2015/09 3-4-2-1  CVG-LIT-PIA-\n 14451  13.15 1945 2205/08 1-4-3    CMH-SPI-\n07AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14427  13.58 1344 2137/09 3-2-1    CHA-LIT-\n 14873  18.33 1430 2030/10 3-4-2-1  CVG-LIT-EVV-\n 14932   8.08 1500 2001/08 3-1      ORF-\n 14275   4.21 1700 2205/07 2\n08AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14278   8.40 0647 1324/09 1-3      XNA-\n 14402  13.16 0854 2030/10 4-2-1    GSO-COU-\n 14255   7.29 1000 1759/08 2                          MSO\n 06500   5.52 1150 1817/08 2\n09AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14328  14.07 0655 1929/11 4/3-1    TPA/GRR-\n 14481  17.51 0805 0741/12 3-2-4-1  CMH-COU-RIC-\n 14391  14.37 0826 1239/11 3-2-3    CVG-ROC-\n 14560  17.02 0930 1530/12 1-2-2-3  DAY-ORF-TYS-\n 14659  15.48 1250 1605/11 1-4-4    CVG-CVG-\n 06500  11.18 1259 1443/11 1-2-3    SPI-MHT-\n 14922  19.24 1459 1619/12 3-4-2-1  TVC-SYR-YYZ-\n 15194  19.05 2024 2020/12 1-2-4-3  GSP-JAX-GSO-\n10AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14324  13.40 0647 1259/12 3-2-3    CVG-GSP-\n 14388  14.39 0825 1420/12 1-4-3    VPS-CMH-\n 14615   2.21 1159 0650/11 1-1      GRR-\n 06501   5.11 1324 1919/10 2\n11AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14383  12.06 0818 0546/13 3-2-1    YYZ-CLE-\n 14936  14.46 1921 2024/14 1-4-2-1  ORF-GSO-COU-\n 15170  17.57 1930 2030/14 1-2-2-3  ABE-ABE-DAY-\n12AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14351  14.11 0805 1500/14 3-2-3    SPI-MHT-\n 14370  14.56 0810 1544/14 3-2-3    CWA-MSP-\n 14391  14.37 0826 1239/14 3-2-3    CVG-ROC-\n 14260   7.11 1159 1948/12 2\n 14787  18.04 1340 1314/15 3-2-2-3  MQT-LSE-HPN-\n 14268   6.10 1458 2205/12 2\n13AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 15008  17.25 1556 1527/16 3-2/3    ATW-CAE/\n 15142  17.43 1845 2030/16 1-3-3-1  XNA-CLT-GSO-\n14AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14733  17.02 1324 1144/17 3-2-2-3  HPN-MSN-CVG-\n 15212  14.57 2059 1412/17 1/4-3    TRI/CWA-\n 14998  13.03 2300 1101/17 1-2-2-3  PIA-ROC-FAR-\n15AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14279   8.40 0647 1324/16 1-3      XNA-\n 14520  17.25 0815 0908/18 3-2-4-1  CHA-MLI-MSN-\n 14256   7.29 1000 1759/15 2                          MSO\n 06506   4.57 1304 1838/15 2\n 14814  16.32 1359 0852/18 3-2-2-1  CLE-LSE-HPN-\n 14434  12.41 1429 2205/17 3-2-1    PIA-TUL-\n 06515   8.36 1457 1623/16 2-1      BIL-\n 15002  18.49 1550 1544/18 3-2-2-3  ATW-DAY-ABE-\n 15076  15.28 2106 1420/18 1-4-2-1  TVC-SYR-YYZ-\n16AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14532  19.03 0818 1436/19 3-3/3-1  GSO-CLT/GSO-\n 14254   7.29 0954 1753/16 2                          MSO\n 14264   7.11 1208 1950/16 2\n17AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14284   8.50 0700 1114/18 3-3      BMI-\n 14344  13.49 0800 1544/19 3-2-3    GRB-MSP-\n 14358   6.22 0805 0730/18 3-1      SPI-\n18AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14409  11.33 0947 1244/20 1-2-3    MSY-BMI-\n 14261   7.11 1159 1948/18 2\n 14268   6.10 1458 2205/18 2\n19AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14362  14.28 0805 1325/21 3-2-3    SPI-MHT-\n 14394  15.25 0826 1549/21 2-2-3    CMH-MAF-\n 14942  17.42 1500 1406/22 3-2-2-3  GSO-COU-LSE-\n 15021  17.44 1615 1600/22 3-2-2-3  ROC-CMH-MSY-\n 15081  18.01 1704 1943/22 3-2-4-1  PIA-TVC-SYR-\n 15094  16.52 1708 1114/22 3-2-2-3  MLI-ICT-BMI-\n20AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14704  18.51 1320 1234/23 3-2-2-3  CMH-CVG-COU-\n 15171  19.06 1930 2134/23 1-2-2-3  ABE-HPN-YYZ-\n 06508   8.53 1938 1925/21 1-3      HPN-\n 15185  19.06 1959 2040/23 1-4-2-3  LIT-XNA-BIL-\n21AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14488  13.46 0805 0900/24 3-2/2-1  CMH-XNA/XNA-\n 14497  18.44 0806 1255/24 3-2-2-3  CHA-CMI-HPN-\n 14305   7.33 0815 1409/22 1-3      MSN-\n 14576  19.46 0945 1619/24 1-2-4-3  GSO-LIT-ABE-\n22AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14256   7.29 1000 1759/22 2                          MSO\n 14261   7.11 1159 1948/22 2\n 14755  10.49 1325 1950/23 3-1      MHT-\n 14767  18.37 1328 2030/25 3-2-4-1  TYS-SRQ-GSO-\n 15116  19.01 1729 2020/25 3-2-4-3  LSE-GSP-CMI-\n23AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14332  14.16 0655 1925/25 4/3-1    TPA/ATW-\n 14489  17.06 0805 0852/26 3-2-2-1  MHT-LSE-HPN-\n 14264   7.11 1208 1950/23 2\n24AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14294   8.46 0805 1114/25 3-3      BMI-\n 14310   8.36 1148 1324/25 1-3      XNA-\n 14717  11.07 1321 2157/25 3-4      CVG-\n 14445  14.55 1704 2205/26 3-2-3    PIA-XNA-\n 15177  12.06 1945 1234/27 1-4/3    CMH-RST/\n25AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14254   7.29 0954 1753/25 2                          MSO\n 14420  14.52 1313 2205/27 3-4/1    XNA-TUL/\n26AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14510  18.22 0810 2010/29 1-2-2-3  SAV-CVG-ROC-\n 14593  17.56 1045 1100/29 1-4-2-3  COU-XNA-TVC-\n 14838  18.52 1409 1642/29 3-2-4-1  GSP-CVG-LSE-\n 14966  19.16 1505 2135/29 3-2-4-1  AVP-CVG-LIT-\n 15081  18.01 1704 1943/29 3-2-4-1  PIA-TVC-SYR-\n 15144  17.28 1845 2024/29 1-3-3-1  XNA-CLT-GSO-\n 15174  17.18 1938 1817/29 1-2-2-3  HPN-CWA-MSP-\n27AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14254   7.29 0954 1753/27 2                          MSO\n 14410  14.14 1005 1406/29 3-2-3    MQT-COU-\n 14594  17.55 1045 1250/30 3-2-2-3  CHA-TYS-AVP-\n 14421  12.35 1313 2200/29 3-2-3    MQT-CMH-\n 14803  18.24 1344 1702/30 3-2-2-1  CHA-GSP-CMH-\n 14881   9.45 1430 2013/28 3-1      AVP-\n 15036  19.51 1629 2134/30 3-2-2-3  LSE-GSO-COU-\n28AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\nNONE FOUND\n29AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 14263   7.11 1200 1948/29 2\n30AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\nNONE FOUND\nEND\n        ** TO PICKUP ONE OF THESE SEQUENCES ENTER **\n             HT   IN YOUR PERSONAL MODE.\n";

export const RAW_HSS_17495_TEXT = `
SEQ 17495      BASE ORD  SEL  502 ORG SCH DOM E75
CAPT PRYOR AR            EMP NBR 742840
   DT EQ   FLT STA DEP   STA ARR AC FLY     GTR  GRD      ACT
SKD 18 54 4330 ORD 1300 SPI 1409    1.09
ACT 18 54 4330 ORD 1312 SPI 1424    1.12  1.12
D/P GTR  1.12        P/C  0.00 TL  1.12
HALF DAY COUNT SPI   2
              SKD TL   1.09  ACT TL   1.12
SKD ONDUTY  2.09 ODL  14.51
ACT ONDUTY  2.24 ODL  14.36
FDPT  2.09          START  1215  END  1424  ACC STA  ORD
SKD 19 54 4328 SPI 0600 ORD 0718    1.18         0.48
ACT 19 54 4328 SPI 0551 ORD 0705    1.14  1.18 0.59
SKD 19 54 3491 ORD 0806 CWA 0927    1.21         0.30
ACT 19 1A 3491 ORD 0804 CWA 0902    0.58  1.21 0.46
SKD 19 54 3491 CWA 0957 ORD 1124    1.27         1.17
ACT 19 1A 3491 CWA 0948 ORD 1106    1.18  1.27 1.30
SKD 19 54 4200 ORD 1241 HPN 1559    2.18
ACT 19 54 4200 ORD 1236 HPN 1531    1.55  2.18
D/P GTR  6.24        P/C  0.00 TL  6.24
HALF DAY COUNT HPN   2
              SKD TL   6.24  ACT TL   5.25
SKD ONDUTY  9.59 ODL  14.11
ACT ONDUTY  9.31 ODL  14.39
FDPT  9.16          START  0515  END  1431  ACC STA  ORD
SKD 20 0F 3496 HPN 0710 ORD 0851    2.41         0.54
ACT 20 0F 3496 HPN 0706 ORD 0826    2.20  2.41 1.15
SKD 20 0F 3606 ORD 0945 YYZ 1237    1.52
ACT 20 0F 3606 ORD 0941 YYZ 1218    1.37  1.52
D/P GTR  4.33        P/C  0.00 TL  4.33
HALF DAY COUNT YYZ   3
              SKD TL   4.33  ACT TL   3.57
SKD ONDUTY  6.42 ODL  17.25
ACT ONDUTY  6.23 ODL  17.44
FDPT  5.53          START  0525  END  1118  ACC STA  ORD
SKD 21 0F 3524 YYZ 0717 ORD 0827    2.10         2.03
SKD 21 0F 3498 ORD 1030 DTW 1304    1.34         0.30
SKD 21 0F 3498 DTW 1334 ORD 1407    1.33
D/P SKD  5.17        P/C  0.00 TL  5.17
              SKD TL   5.17  ACT TL   0.00
SKD ONDUTY  8.50
FDPT  8.35          START  0532  END  1407  ACC STA  ORD
SEQ EST 17.26        P/C  0.00  TL 17.26 TAFB  74.07
`;

export const RAW_N4_DFW_TEXT = "DFW E75 CA   OPEN SEQUENCES                    AS OF 27JUL/1107\n27JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\nNONE FOUND\n28JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\nNONE FOUND\n29JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 05303   9.13 0820 1735/01 1-2-2-3  CLL-FWA-MTY-\n 02059   7.40 1355 1510/01 1-2-2-5  JAN-MAF-MHK-\n 02073  13.10 1429 1126/01 5-2-2-3  CRP-CRP-HSV-\n 21572   2.19 1700 1111/30 1-1      CLL-\n 02131  13.01 1728 2145/01 3-2-2-3  BRO-CUU-CUU-\n 05439  10.07 1737 2145/31 1-2-1    CMH-GSP-\n30JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 21527   4.44 1100 0850/02 1-2-4-1  MTY-GGG-CRP-\n 21534   4.24 1613 0807/01 1-2-1    CRP-LBB-\n 02119   8.40 1701 2145/02 3-2-2-5  EVV-MEM-FWA-\n 02082   2.07 2118 1915/31 1-1      ABI-\n31JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 21537   1.30 1046 1522/01 1-3      SGF-\n 02051   1.23 1306 2150/03 1-2/4-5  CRP-CUU/GPT-\n 02052   1.04 1311 1525/03 1-2-4-3  TXK-XNA-XNA-\n 21540   1.00 1312 1104/01 1-3      SPS-\n 05268   5.42 1355 2150/31 4\n 21542   1.12 1532 1417/01 1-3      FSM-\n 21564   0.50 1648 1038/01 1-3      ACT-\n01AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 06502  13.43 0600 1616/02 2-3      BIL-\n 02516  11.40 0820 1316/03 1-2-2    FWA-GSO-\n 02551  14.23 0912 0850/04 1-2-4-1  GPT-MTY-JAN-\n 02259   6.42 1040 1918/01 2\n 02262   6.36 1100 1853/01 2\n 02663  15.06 1156 1338/04 1-3/3-1  LIT-CLT/COU-\n 02691  13.44 1212 1333/03 3-2-2    CMH-EVV-\n 02726   5.21 1226 0850/03 1-2-1    GGG-CRP-\n 03083   9.31 1429 1439/03 5-2-1    ACT-AMA-\n 03084   5.44 1429 0840/03 1-2-1    AMA-SGF-\n 03181  11.52 1507 0607/04 3-2-2-1  BHM-TXK-ACT-\n 03425   9.37 1621 1414/03 3-2-1    GRK-HSV-\n 06528  15.32 1648 1533/04 1-4-2-5  ACT-MLU-LCH-\n 03523   8.35 1715 2333/02 3-2      ICT-\n 03557  12.20 1736 2120/03 3-2-3    LRD-CRP-\n 03705   9.13 2129 2056/03 1-2-2    EVV-SPI-\n02AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02465  15.15 0700 1853/04 3-3/2    BUF-DCA/\n 02357  12.30 0711 1554/04 1-2-3    DSM-CID-\n 02287   6.13 0820 1129/03 1-3      CLL-\n 02293   2.41 0822 0619/03 1-1      AMA-\n 06554   3.19 0835 1227/02 2\n 02442  13.32 1311 1406/04 1-4-3    TXK-BMI-\n 02870   8.18 1322 0825/04 1-4-1    LBB-AMA-\n 02877  11.13 1340 1111/04 5-2-1    ACT-SGF-\n 03141  10.46 1458 0954/04 3-2-1    AMA-SGF-\n 03532   6.24 1717 1950/03 3-1      CUU-\n 03558   8.26 1736 1419/04 3-2-1    CLL-CRP-\n 03559   8.54 1737 0844/04 1-2-1    CMH-AVL-\n03AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02359  15.23 0711 1905/05 1-2-5    DSM-CID-\n 03036  11.48 1427 2332/04 5-2      MHK-\n 03710  15.16 2247 1726/06 1-4/3    GRK-YUM/\n04AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02527  19.21 0822 1147/07 3-2-4-3  MEM-GSO-CMH-\n 06527   3.46 0835 1017/05 1-1      MTY-\n 02610  17.32 1100 1553/07 1-2-2-3  MTY-ELP-BMI-\n 02868  18.01 1312 1201/07 3-4-2-3  ABI-MAF-ACT-\n 03657  16.03 1955 1345/07 1-2-2-3  CID-LIT-ICT-\n 03678  17.57 2003 1343/07 1-4-2-3  RAP-ABI-BTR-\n05AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02532  17.45 0823 1459/08 1-2-2-3  FWA-MHK-BIS-\n 02837  19.31 1252 1540/08 3-4-2-5  SPS-CRP-FSM-\n 02858  17.24 1310 1601/08 3/2-2-3  LFT/GRK-ICT-\n 03020  17.34 1425 1147/08 3-4-2-3  AMA-SPS-LRD-\n 03187  17.26 1508 1145/08 3-2-2-3  BHM-SAV-MHK-\n 03550  17.55 1728 2148/08 3-2-4-2  EVV-LAN-CWA-\n06AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02332  13.54 0700 1329/08 3-2-3    LIT-CID-\n 02395  13.50 0835 1556/08 3-2-3    MAF-AGU-\n 02436  12.51 1236 1017/08 3-2-3    GGG-TYR-\n 02983  18.04 1406 1412/09 3-4-2-3  GRK-LCH-MAF-\n 03046  18.05 1428 1345/09 3-2-2-3  AMA-GPT-LRD-\n 03104  17.36 1440 1106/09 5-2-2-3  CLL-TRC-XNA-\n 03137  17.42 1454 1517/09 3-2-2-3  LBB-MTY-CUU-\n 03143  17.52 1458 1219/09 3-2-2-3  TRI-BHM-TXK-\n 03243  18.12 1523 1301/09 3-2-2-3  JAN-GRK-FWA-\n 03307  16.34 1550 1321/09 3-2-2-3  ATW-SGF-TUL-\n 03500  18.39 1652 2130/09 3-2-2-3  BMI-FWA-BRO-\n 03568  17.55 1748 1314/09 3-2-2-3  LRD-COU-FAR-\n 03646  18.17 1930 1652/09 1-2-2-3  CID-LIT-AGU-\n07AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02356  13.32 0710 1428/09 3-2-3    LIT-COU-\n 02388  15.05 0823 1635/09 1-2-3    FWA-MLI-\n 03215  17.01 1516 1137/10 3-2-2-3  SGF-SGF-GRK-\n 03345  17.10 1552 1115/10 3-4-2-3  LBB-MHK-XNA-\n 03534  17.14 1718 1152/10 3-4-2-3  GGG-CRP-BHM-\n08AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02373  13.36 0820 1147/10 3-2-3    JAN-AMA-\n 03618  16.32 1834 1546/11 1-2-2-5  AVL-SGF-LCH-\n09AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02316   7.19 0933 1219/10 3-3      GGG-\n 02730  18.57 1226 1712/12 5-4-2-1  BMI-RIC-BHM-\n 03038  17.58 1427 1115/12 5-4-2-3  SGF-ABI-SPS-\n 03469  18.18 1638 1652/12 1-2-2-3  MHK-BIS-AGU-\n 03545  17.00 1722 1517/12 3-2-2-3  XNA-XNA-TRC-\n10AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02836  17.13 1248 1459/13 1-4-2-3  GGG-TRI-CMI-\n 06505   3.06 1406 0738/11 1-1      LRD-\n 03052  18.36 1428 1713/13 3-2-2-3  AMA-BTR-MTY-\n 03138  18.04 1455 1704/13 3-2-2-3  ACT-MTY-CUU-\n 03192  20.28 1508 2029/13 3-2-4-1  MHK-ELP-GPT-\n 03428  18.34 1621 2150/13 3-2-2-3  COU-MSY-BHM-\n11AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02334  13.56 0700 1635/13 1-2-3    BHM-MLI-\n 02521  19.09 0820 1343/14 5-2-4-3  GRK-TYR-GRK-\n 06515  19.26 0827 1749/13 2-3-3    CVG-BOS-\n 02720  17.47 1221 1525/14 1-4-2-5  ICT-DAY-SGF-\n12AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02335  14.05 0700 1314/14 3-4-3    MLU-CRP-\n 02401  14.25 0840 1704/14 1-4-3    LRD-MAF-\n 02305   7.26 0850 1230/13 1-3      AEX-\n 06511   9.00 0910 1201/13 3-3      BHM-\n 02628  18.03 1145 1017/15 5-4-2-3  ABI-GGG-TYR-\n 02860  17.38 1310 1632/15 3/2-2-3  LFT/GRK-CUU-\n 03520  17.20 1702 1441/15 3-2-2-3  MHK-LIT-EVV-\n 03552  17.55 1728 2148/15 3-2-4-2  EVV-LAN-CWA-\n13AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02916  17.39 1353 1131/16 5-2-2-3  BRO-MAF-BRO-\n 03057  17.31 1428 1321/16 3-2-2-3  AMA-SGF-CRP-\n 06511   7.36 1440 1914/14 5-1      CLL-\n 03259  17.34 1527 1115/16 3-2-2-3  MLI-ICT-LBB-\n 03388  17.41 1611 1342/16 3-4-2-3  ABI-TYR-GGG-\n 03504  17.58 1657 1417/16 3-2-2-3  CID-MLU-TUL-\n14AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\nNONE FOUND\n15AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\nNONE FOUND\n16AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02378  12.57 0820 1538/18 1-2-3    XNA-BIL-\n 02423  14.19 1002 1726/18 3-2-3    LRD-MTY-\n17AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02593  18.42 1002 1343/20 5-2-2-3  LRD-AMA-BTR-\n 06512  13.44 1055 1737/19 4-2-1    GSO-XNA-\n 02427  14.57 1200 2148/19 5-2-2    LIT-CWA-\n 02757  19.07 1228 1517/20 5-2-2-3  JAN-GRK-CUU-\n 03262  19.52 1527 2150/20 3-2-2-3  FAR-RIC-BHM-\n 03167   8.21 1955 1553/19 1-2-1    CMI-GSP-\n 03515   8.01 2145 1203/19 1-4-1    BRO-TYR-\n18AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02538  17.52 0835 1314/21 1-4-4-3  LCH-MAF-CRP-\n 02787  18.21 1234 1504/21 5-2-2-5  AMA-XNA-MHK-\n 02815  11.39 2124 1412/21 1-2-2-1  MHK-CAE-CRP-\n19AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02529  18.13 0822 0928/22 3-4-2-1  BHM-XNA-BIS-\n 02568  19.46 0930 1332/22 3-2-2-3  LIT-HSV-SGF-\n 06518  12.01 0930 1653/21 1-3-3    GSO-CLT-\n 02601  19.10 1018 1443/22 3-2-2-3  COU-DAY-SGF-\n 02770  18.46 1230 1152/22 5-4-2-3  GGG-ABI-BHM-\n 02816  18.26 1238 1017/22 5-2-2-3  LCH-ATW-CLL-\n 02901  17.56 1342 1201/22 3-2-2-3  ECP-LBB-HRL-\n 03123  19.46 1448 1907/22 3-4-2-1  MLI-CAK-ILM-\n 03530  18.19 1716 1601/22 3-2-2-3  GPT-BTR-ICT-\n20AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02380  13.55 0820 1441/22 3-2-3    BRO-COU-\n 02788  18.14 1234 1343/23 5-4/3    MLU-JAN/\n 02798  17.37 1236 1429/23 3-2-2-1  ABI-AGU-TRC-\n 02817  18.00 1238 1419/23 5-2-2-3  GPT-TYR-GGG-\n 03506  17.41 1657 1443/23 3-2-2-3  LCH-LIT-EVV-\n21AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 06519   4.09 0940 0907/22 1-1      TRC-\n 03171  13.05 1503 0849/24 3-2-2-1  MSN-CMH-XNA-\n 06518  13.14 1626 2135/23 3-2-3    ABI-AGU-\n22AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02310   7.26 0855 1230/23 1-3      AEX-\n 02654  18.31 1155 1546/25 5-2-2-5  TYR-ABI-LCH-\n 02653  17.58 1155 1115/25 3-2-2-3  CLL-TRC-GPT-\n 02746  17.54 1227 1143/25 5-2-2-3  JAN-CRP-BTR-\n 02800  19.35 1236 0833/25 3-4-2-1  TXK-MTY-MTY-\n 03150  17.49 1458 1343/25 3-2-2-3  SGF-GSO-EVV-\n 06503   9.15 1838 1137/24 1-2-3    BTR-GRK-\n23AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02295   8.06 0822 1417/24 1-3      FSM-\n 02304   8.51 0840 1219/24 3-3      TXK-\n 02318   8.51 0933 1525/24 3-5      GGG-\n 03423  18.10 1620 1601/26 3-2-2-3  HRL-TXK-ICT-\n 03497  18.43 1648 1314/26 3-2-2-3  BIL-GRB-AVL-\n24AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02481  21.06 0700 2147/27 1-3-3-3  BHM-CLT-GSO-\n 02491  19.07 0701 1000/27 3-3-3-1  SGF-CLT-SGF-\n 02802  20.09 1236 1517/27 3-2-2-3  CLL-TRC-MTY-\n 02892  19.58 1340 2148/27 5-2-4-2  EVV-LAN-CWA-\n 03151  18.04 1458 1417/27 3-2-2-3  ECP-HRL-SPS-\n 03265  13.45 2110 1343/27 1-2-2-3  LIT-GRB-MHK-\n25AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02513  18.48 0730 2024/28 1-3-5-3  SGF-CLT-GSO-\n 02748  18.49 1227 1653/28 5/2-4    JAN/GSO-\n 03074  17.45 1428 1504/28 3-2-2-5  AMA-XNA-MHK-\n 02591  14.46 1531 1525/28 1-2-2-5  CMH-GRR-SGF-\n26AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02600  19.58 1010 1459/29 3-2-2-3  ACT-MTY-CUU-\n 02658  18.33 1155 1329/29 1-4-2-3  MLU-TRI-BIS-\n 02676  18.29 1200 0738/29 5-4-2-1  LIT-SPS-LRD-\n 02737  19.42 1226 1907/29 5-2-2-1  MHK-CAE-ILM-\n 02892  19.58 1340 2148/29 5-2-4-2  EVV-LAN-CWA-\n 02929  17.47 1353 1107/29 3-4-2-3  SPS-COU-AMA-\n 03124  18.29 1448 1321/29 3-2-2-3  MLI-ICT-CRP-\n 03152  19.07 1458 1540/29 3-2-2-5  SGF-SGF-LIT-\n 03277  17.21 1531 1229/29 1-4-2-3  CMH-DAY-SGF-\n 03398  19.36 1612 1504/29 3-4-2-5  CRP-ABI-SPS-\n 03470  18.18 1638 1709/29 1-2-2-3  MHK-BIS-AGU-\n 03577  17.04 1748 1404/29 1-4-2-3  SGF-CAE-HSV-\n27AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02367  14.58 0755 1147/29 5-2-3    ABI-CID-\n 02290  15.04 0820 1556/29 3-4-3    BRO-MAF-\n 02301   6.54 0825 0728/28 3-1      BHM-\n 02308   7.26 0850 1230/28 1-3      AEX-\n 02979  17.46 1357 1302/30 3-2-2-3  ECP-JAN-AMA-\n 03002  19.26 1406 1219/30 3-4-4-3  GRK-GRK-GGG-\n28AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02777  13.25 1230 1219/31 5/4-3    JAN/XNA-\n 03178  13.34 1503 1428/31 3-2-2-3  CMI-TRC-BTR-\n 03692   9.41 2044 1704/31 1-2-2-3  COU-MSY-CUU-\n29AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\nNONE FOUND\n30AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS\n 02253   5.35 0935 1551/30 2\n***************************************************************\nDFW E75 CA   CREWED SEQUENCES POSTED FOR DROP  AS OF 27JUL/1107\n27JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 05254   4.43 0600 1113/27 2                                   *\n28JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 21514   2.56 2205 1530/29 1-1      LFT-\n 05894  17.50 1315 1440/31 1-4-2-3  GCK-AMA-LEX-\n30JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 21503   2.58 1306 1635/30 2\n 05718   9.57 1214 1342/02 5-2-2-3  BTR-LBB-BRO-\n 02089   7.49 1516 1441/02 3-2-2-3  CMI-ABE-COU-\n31JUL DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 21532   3.27 1621 2030/31 2\n01AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 02252   5.37 0930 1604/01 2\n 06515   4.48 0940 1458/01 2\n03AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 06525   6.20 0821 1333/04 1-3      CRP-\n11AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 02915   8.12 1353 1958/12 3-3      SPS-\n14AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 06501   2.39 0822 1131/14 2\n15AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 03148  18.04 1458 1219/18 3-4-2-3  SGF-CRP-TXK-\n17AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 06513  11.50 1430 1037/19 2-2-3    GSO-CLL-\n20AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 02253   5.35 0935 1606/20 2\n21AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 02253   5.35 0935 1606/21 2\n27AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 02391  14.41 0823 1704/29 1-2-3    FWA-COU-\n30AUG DOM\nSEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB\n 02876   2.28 1325 1707/02 1-2-2-3  TRI-BIS-AGU-\nEND\n        ** TO PICKUP ONE OF THESE SEQUENCES ENTER **\n             HT   IN YOUR PERSONAL MODE.\n";

export const MOCK_VACATIONS: VacationPeriod[] = [
  {
    id: "vac-aug-01-05",
    startDate: "2026-08-01",
    endDate: "2026-08-05",
    code: "VC",
    description: "Scheduled Vacation Block (01AUG26 to 05AUG26)",
  },
];

// August 2026 Mock Sequences with full duty periods and flight legs
export const MOCK_AUG_SEQUENCES: SequenceTrip[] = [

  {
    id: "aug-15156",
    sequenceNumber: "15156",
    startDate: "2026-08-06",
    endDate: "2026-08-09",
    base: "ORD",
    equipment: "E75",
    totalBlockMinutes: 840,
    totalCreditMinutes: 1200, // 20.00h (4 days guarantee)
    layoverCities: ["MSP", "DSM", "MSN"],
    colorTag: "rose",
    statusTag: "DROP",
    isDropped: true,
    dropReason: "DTS Overlap — Touches Vacation Window (Aug 01 - Aug 07)",

    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: "0800",
        releaseTime: "1530",
        dutyMinutes: 450,
        legs: [
          { flightNumber: "AA4210", depAirport: "ORD", arrAirport: "MSP", depTime: "0845", arrTime: "1015", blockMinutes: 90, tailNumber: "N401AA" },
          { flightNumber: "AA4211", depAirport: "MSP", arrAirport: "ORD", depTime: "1115", arrTime: "1245", blockMinutes: 90, tailNumber: "N401AA" },
        ],
        layoverCity: "MSP",
        layoverHotelInfo: "InterContinental Minneapolis-St. Paul Airport (612-725-0400)",
      },
      {
        dayIndex: 1,
        reportTime: "0830",
        releaseTime: "1600",
        dutyMinutes: 450,
        legs: [
          { flightNumber: "AA3314", depAirport: "MSP", arrAirport: "DSM", depTime: "0915", arrTime: "1030", blockMinutes: 75, tailNumber: "N405AA" },
          { flightNumber: "AA3315", depAirport: "DSM", arrAirport: "ORD", depTime: "1145", arrTime: "1300", blockMinutes: 75, tailNumber: "N405AA" },
        ],
        layoverCity: "DSM",
        layoverHotelInfo: "Des Moines Marriott Downtown (515-245-5500)",
      },
      {
        dayIndex: 2,
        reportTime: "0900",
        releaseTime: "1630",
        dutyMinutes: 450,
        legs: [
          { flightNumber: "AA4480", depAirport: "DSM", arrAirport: "MSN", depTime: "0945", arrTime: "1100", blockMinutes: 75, tailNumber: "N412AA" },
          { flightNumber: "AA4481", depAirport: "MSN", arrAirport: "ORD", depTime: "1215", arrTime: "1330", blockMinutes: 75, tailNumber: "N412AA" },
        ],
        layoverCity: "MSN",
        layoverHotelInfo: "The Edgewater Hotel Madison (608-535-8200)",
      },
      {
        dayIndex: 3,
        reportTime: "0830",
        releaseTime: "1330",
        dutyMinutes: 300,
        legs: [
          { flightNumber: "AA4500", depAirport: "MSN", arrAirport: "ORD", depTime: "0915", arrTime: "1030", blockMinutes: 75, tailNumber: "N412AA" },
        ],
        layoverCity: "",
        layoverHotelInfo: "",
      },
    ],
  },
  {
    id: "aug-14731",
    sequenceNumber: "14731",
    startDate: "2026-08-13",
    endDate: "2026-08-16",
    base: "ORD",
    equipment: "E75",
    totalBlockMinutes: 1042,
    totalCreditMinutes: 1042, // 17.22h (17h 13m)
    layoverCities: ["FAR", "CMI", "CLE"],
    colorTag: "cyan",
    statusTag: "SKD",
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: "1239",
        releaseTime: "2312",
        dutyMinutes: 633,
        legs: [
          { flightNumber: "AA3602", depAirport: "ORD", arrAirport: "YUL", depTime: "1324", arrTime: "1650", blockMinutes: 146, tailNumber: "N360AA" },
          { flightNumber: "AA3602", depAirport: "YUL", arrAirport: "ORD", depTime: "1734", arrTime: "1919", blockMinutes: 105, tailNumber: "N360AA" },
          { flightNumber: "AA3377", depAirport: "ORD", arrAirport: "FAR", depTime: "2105", arrTime: "2312", blockMinutes: 127, tailNumber: "N360AA" },
        ],
        layoverCity: "FAR",
        layoverHotelInfo: "Radisson Blu Hotel Fargo (701-232-7300)",
      },
      {
        dayIndex: 1,
        reportTime: "1141",
        releaseTime: "2028",
        dutyMinutes: 527,
        legs: [
          { flightNumber: "AA3449", depAirport: "FAR", arrAirport: "ORD", depTime: "1226", arrTime: "1432", blockMinutes: 126, tailNumber: "N344AA" },
          { flightNumber: "AA3484", depAirport: "ORD", arrAirport: "CMI", depTime: "1521", arrTime: "1624", blockMinutes: 63, tailNumber: "N344AA" },
          { flightNumber: "AA3484", depAirport: "CMI", arrAirport: "ORD", depTime: "1654", arrTime: "1829", blockMinutes: 95, tailNumber: "N344AA" },
          { flightNumber: "AA3694", depAirport: "ORD", arrAirport: "CMI", depTime: "1922", arrTime: "2028", blockMinutes: 66, tailNumber: "N344AA" },
        ],
        layoverCity: "CMI",
        layoverHotelInfo: "I Hotel & Conference Center Champaign (217-819-5000)",
      },
      {
        dayIndex: 2,
        reportTime: "1056",
        releaseTime: "1624",
        dutyMinutes: 328,
        legs: [
          { flightNumber: "AA3492", depAirport: "CMI", arrAirport: "ORD", depTime: "1141", arrTime: "1255", blockMinutes: 74, tailNumber: "N349AA" },
          { flightNumber: "AA3749", depAirport: "ORD", arrAirport: "CLE", depTime: "1340", arrTime: "1609", blockMinutes: 89, tailNumber: "N349AA" },
        ],
        layoverCity: "CLE",
        layoverHotelInfo: "Hilton Cleveland Downtown (216-413-5000)",
      },
      {
        dayIndex: 3,
        reportTime: "0430",
        releaseTime: "0601",
        dutyMinutes: 91,
        legs: [
          { flightNumber: "AA3356", depAirport: "CLE", arrAirport: "ORD", depTime: "0515", arrTime: "0546", blockMinutes: 91, tailNumber: "N335AA" },
        ],
        layoverCity: "",
        layoverHotelInfo: "",
      },
    ],
  },
  {
    id: "aug-14962",
    sequenceNumber: "14962",
    startDate: "2026-08-20",
    endDate: "2026-08-23",
    base: "ORD",
    equipment: "E75",
    totalBlockMinutes: 1349,
    totalCreditMinutes: 1349, // 22.29h (22h 17m)
    layoverCities: ["RIC", "FSM", "MAF"],
    colorTag: "sky",
    statusTag: "SKD",
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: "1420",
        releaseTime: "0021",
        dutyMinutes: 601,
        legs: [
          { flightNumber: "AA4145", depAirport: "ORD", arrAirport: "GSP", depTime: "1505", arrTime: "1804", blockMinutes: 119, tailNumber: "N414AA" },
          { flightNumber: "AA4145", depAirport: "GSP", arrAirport: "ORD", depTime: "1834", arrTime: "2004", blockMinutes: 150, tailNumber: "N414AA" },
          { flightNumber: "AA3811", depAirport: "ORD", arrAirport: "RIC", depTime: "2052", arrTime: "0006", blockMinutes: 134, tailNumber: "N414AA" },
        ],
        layoverCity: "RIC",
        layoverHotelInfo: "Hilton Richmond Downtown (804-344-7000)",
      },
      {
        dayIndex: 1,
        reportTime: "1058",
        releaseTime: "1700",
        dutyMinutes: 362,
        legs: [
          { flightNumber: "AA3778", depAirport: "RIC", arrAirport: "DFW", depTime: "1143", arrTime: "1402", blockMinutes: 199, tailNumber: "N377AA" },
          { flightNumber: "AA3859", depAirport: "DFW", arrAirport: "FSM", depTime: "1532", arrTime: "1645", blockMinutes: 73, tailNumber: "N377AA" },
        ],
        layoverCity: "FSM",
        layoverHotelInfo: "Courtyard Fort Smith (479-783-2100)",
      },
      {
        dayIndex: 2,
        reportTime: "0515",
        releaseTime: "1406",
        dutyMinutes: 531,
        legs: [
          { flightNumber: "AA4179", depAirport: "FSM", arrAirport: "DFW", depTime: "0600", arrTime: "0720", blockMinutes: 80, tailNumber: "N417AA" },
          { flightNumber: "AA3873", depAirport: "DFW", arrAirport: "GRK", depTime: "0829", arrTime: "0929", blockMinutes: 60, tailNumber: "N417AA" },
          { flightNumber: "AA3873", depAirport: "GRK", arrAirport: "DFW", depTime: "0959", arrTime: "1110", blockMinutes: 71, tailNumber: "N417AA" },
          { flightNumber: "AA3512", depAirport: "DFW", arrAirport: "MAF", depTime: "1233", arrTime: "1351", blockMinutes: 78, tailNumber: "N417AA" },
        ],
        layoverCity: "MAF",
        layoverHotelInfo: "DoubleTree by Hilton Midland Plaza (432-683-6131)",
      },
      {
        dayIndex: 3,
        reportTime: "0715",
        releaseTime: "1604",
        dutyMinutes: 529,
        legs: [
          { flightNumber: "AA3352", depAirport: "MAF", arrAirport: "DFW", depTime: "0800", arrTime: "0925", blockMinutes: 85, tailNumber: "N335AA" },
          { flightNumber: "AA3689", depAirport: "DFW", arrAirport: "RAP", depTime: "1018", arrTime: "1149", blockMinutes: 151, tailNumber: "N335AA" },
          { flightNumber: "AA3573", depAirport: "RAP", arrAirport: "ORD", depTime: "1220", arrTime: "1549", blockMinutes: 149, tailNumber: "N335AA" },
        ],
        layoverCity: "",
        layoverHotelInfo: "",
      },
    ],
  },
  {
    id: "aug-15101",
    sequenceNumber: "15101",
    startDate: "2026-08-27",
    endDate: "2026-08-30",
    base: "ORD",
    equipment: "E75",
    totalBlockMinutes: 976,
    totalCreditMinutes: 976, // 16.26h (16h 16m)
    layoverCities: ["SPI", "MLI", "GSO"],
    colorTag: "emerald",
    statusTag: "SKD",
    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: "1623",
        releaseTime: "0027",
        dutyMinutes: 484,
        legs: [
          { flightNumber: "AA3626", depAirport: "ORD", arrAirport: "SGF", depTime: "1708", arrTime: "1853", blockMinutes: 105, tailNumber: "N362AA" },
          { flightNumber: "AA3594", depAirport: "SGF", arrAirport: "ORD", depTime: "2004", arrTime: "2200", blockMinutes: 116, tailNumber: "N362AA" },
          { flightNumber: "AA3771", depAirport: "ORD", arrAirport: "SPI", depTime: "2305", arrTime: "0012", blockMinutes: 67, tailNumber: "N362AA" },
        ],
        layoverCity: "SPI",
        layoverHotelInfo: "President Abraham Lincoln Springfield - DoubleTree (217-544-8800)",
      },
      {
        dayIndex: 1,
        reportTime: "1406",
        releaseTime: "1826",
        dutyMinutes: 260,
        legs: [
          { flightNumber: "AA4330", depAirport: "SPI", arrAirport: "ORD", depTime: "1451", arrTime: "1609", blockMinutes: 78, tailNumber: "N433AA" },
          { flightNumber: "AA3559", depAirport: "ORD", arrAirport: "MLI", depTime: "1700", arrTime: "1811", blockMinutes: 71, tailNumber: "N433AA" },
        ],
        layoverCity: "MLI",
        layoverHotelInfo: "Radisson Quad City Plaza Moline (309-764-1000)",
      },
      {
        dayIndex: 2,
        reportTime: "0515",
        releaseTime: "1301",
        dutyMinutes: 466,
        legs: [
          { flightNumber: "AA3708", depAirport: "MLI", arrAirport: "ORD", depTime: "0600", arrTime: "0719", blockMinutes: 79, tailNumber: "N370AA" },
          { flightNumber: "AA4144", depAirport: "ORD", arrAirport: "GSO", depTime: "0945", arrTime: "1246", blockMinutes: 121, tailNumber: "N370AA" },
        ],
        layoverCity: "GSO",
        layoverHotelInfo: "Proximity Hotel Greensboro (336-379-8200)",
      },
      {
        dayIndex: 3,
        reportTime: "0704",
        releaseTime: "1458",
        dutyMinutes: 474,
        legs: [
          { flightNumber: "AA3673", depAirport: "GSO", arrAirport: "ORD", depTime: "0749", arrTime: "0910", blockMinutes: 141, tailNumber: "N367AA" },
          { flightNumber: "AA3552", depAirport: "ORD", arrAirport: "MSP", depTime: "1045", arrTime: "1227", blockMinutes: 102, tailNumber: "N367AA" },
          { flightNumber: "AA3552", depAirport: "MSP", arrAirport: "ORD", depTime: "1257", arrTime: "1443", blockMinutes: 106, tailNumber: "N367AA" },
        ],
        layoverCity: "",
        layoverHotelInfo: "",
      },
    ],
  },
];

export const RAW_HI1_AUG_TEXT = `MONTH ENDING 30AUG26 AS OF 15AUG26/1924                    SC-Y
PRYOR AR            01361 742840 ORD  441-CA E75E
H 812-399-2574
V 8123992574
D EXP 0.00   I EXP 0.00
GUAR 72.00 FLT TIME 672 HOURS/ 47.16 365 DAY/ 749.22
PTL TRIP TRD 0 DROP 0
BID SEL PROJ FOR: E75E 49.12 E70E 23.02
BID SEL PROJ 72.14
FLT DUTY PERIOD TIME  168 HOURS/ 17.18  672 HOURS/ 83.04
AVBL SK 24.17    YTD SK ACRL 0.00      SK USED MTD 0.00
LONG TERM SK AVAIL 0.00      LONG TERM SK USED MTD 0.00
SHORT TERM SICK PAYOUT ACCRUAL 24.30
SK TIME AVAIL FOR M/U 0.00
SK M/U MTD 0.00              BYPASS SK ACCRUAL - NO
TTL SK USED YTD 18.58        TTL SK USED PREV YEAR 50.53
 DD ST RMV ADD SEQ    FLT    FLT   SKED  STTL   ACT  GRTR  GTTL
 01  1 VC      24     0000   2400
 02  1 VC      24     0000   2400
 03  1 VC      24     0000   2400
 04  1 VC      24     0000   2400
 05  1 VC      24     0000   2400
 06  1 VC      15156 -3389         2.21
 07  1 VC            -3390  -3610  4.19
 08  1 VC            -3524  X3362  4.16
 09  1 VC            X3587  X3475
                     X3340         5.01 15.57             15.57
DRP TRP  - SEE LEG DETAIL
 10  1         24     0000   2400
 11  1         24     0000   2400
 12  1         24     0000   2400
 13  1 SH      14731 -3602  -3602
                     X3377         7.18
 14  1 SH            X3449  -3484
                     -3484  -3694  5.50
 15  1 SH            -3492  -3749  2.43
 16  1 SH            -3356         1.31 17.22              0.00
SKD CHG  - SEE LEG DETAIL
 13  1     RA  14731 -3602  -3602
                     -4140         7.18        8.16  8.16
 14  1     RA        -3362         2.39        2.23  2.39
 15  1     RA        -3749         1.29        1.19  1.29
 16  1     RA        -3356         1.31 12.57  0.00  1.31
              14731 EXP TAFB  65.22 AVP  3 ORD  2 CLE  1
                                    ACT TOTAL 11.58
 17  1         24     0000   2400
 18  1         24     0000   2400
 19  1         24     0000   2400
 20  1         14962 -4145  -4145
                     -3811         6.43
 21  1               -3778  -3859  4.32
 22  1               -4179  -3873
                     -3873  -3512  4.49
 23  1               -3352  -3689
                     -3573         6.25 22.29
              14962 EXP TAFB  73.44 RIC  2 FSM  2 MAF  3
                                    ACT TOTAL  0.00
 24  1         24     0000   2400
 25  1         24     0000   2400
 26  1         24     0000   2400
 27  1         15101 -3626  -3594
                     -3771         4.48
 28  1               -4330  -3559  2.29
 29  1               -3708  -4144  3.20
 30  1               -3673  -3552
                     -3552         5.49 16.26
              15101 EXP TAFB  70.35 SPI  3 MLI  1 GSO  3
                                    ACT TOTAL  0.00
END OF DISPLAY`;

export const DEFAULT_LOGBOOK_ENTRIES: LogbookEntry[] = USER_LOGBOOK_ENTRIES;
