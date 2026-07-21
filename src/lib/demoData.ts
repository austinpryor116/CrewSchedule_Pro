import { SequenceTrip, PayRates } from "../types";

export const DEFAULT_PAY_RATES: PayRates = {
  hourlyRate: 172.5, // $/hr for a typical airline pilot/flight crew
  perDiemRate: 2.75, // $/hr for Time Away From Base
  minDailyGuaranteeMinutes: 300, // 5.0 hours minimum credit per day
  tafbHours: 0, // Calculated dynamically
};

// Generate realistic sequences for July/August 2026
export const MOCK_SEQUENCES: SequenceTrip[] = [
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
    colorTag: "indigo",
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

// Correct release time on day 2 of sequence 3
MOCK_SEQUENCES[2].dutyPeriods[1].releaseTime = "1730";
MOCK_SEQUENCES[2].dutyPeriods[1].dutyMinutes = 495; // 0915 to 1730 = 8h15m = 495m
MOCK_SEQUENCES[2].dutyPeriods[1].legs[2].blockMinutes = 75; // Total block = 165 + 75 + 75 = 315 mins.
MOCK_SEQUENCES[2].totalBlockMinutes = 150 + 65 + 60 + 165 + 75 + 75; // 590 mins (9.8 hrs)
MOCK_SEQUENCES[2].totalCreditMinutes = Math.max(150 + 65 + 60, 300) + Math.max(165 + 75 + 75, 300); // 300 + 315 = 615 mins

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
 27 1 24 0000 2400
 28 1 24 0000 2400
 29 1 24 0000 2400
 30 1 17270 -3446 -3446
 -4330 5.31
 31 1 -4328 -3546
 -3546 3.54 9.25
 17270 EXP TAFB 29.20 SPI 3
 ACT TOTAL 0.00
END OF DISPLAY
`;

export const RAW_N4_TEXT = `
ORD E75 CA   OPEN SEQUENCES             AS OF 20JUL/1655

20JUL DOM
SEQ     TIME ORIG TERM    LEGS      LAYOVER      NAV  DIVS
NONE FOUND

21JUL DOM
SEQ     TIME ORIG TERM    LEGS      LAYOVER      NAV  DIVS
 21585  0.00 0600 1400/21 2
 21586  0.00 0600 1400/21 2
 21587  0.00 0600 1400/21 2
 21588  0.00 0600 1400/21 2
 21589  0.00 0900 1700/21 2
 21590  0.00 0900 1700/21 2
 21591  0.00 0900 1700/21 2
 21592  0.00 1700 0100/22 2
 21593  0.00 1700 0100/22 2
 21594  0.00 1700 0100/22 2
 21595  0.00 1700 0100/22 2

22JUL DOM
SEQ     TIME ORIG TERM    LEGS      LAYOVER      NAV  DIVS
 17457 19.28 0805 2159/25 3-3/3-1   SYR-DCA/XNA-
 21505  2.43 1115 0735/23 1-1       GRB-
 17645 19.11 1315 1525/25 1-4-2-3   SPI-HPN-YYZ-
 18027 14.51 1700 1235/25 3-2/3     BMI-CAE/
 17996 17.15 1700 1831/25 3-4-2-1   MSY-HSV-SYR-
 17691 13.20 1954 2130/25 1-2-2-3   CMI-ICT-LIT-
 17728 13.52 2102 1604/25 1/2-3     SYR/BIL      23JUL DOM
SEQ     TIME ORIG TERM    LEGS      LAYOVER      NAV  DIVS
 21565  2.21 1310 0548/24 1-1       LAN-
 17789 19.48 1355 1234/26 3-2-2-3   CMH-GSP-SYR-
 17835 18.19 1452 1414/26 3-2-2-1   AVP-BHM-VPS-
 21578 11.06 1701 2031/25 3-2-1     PIA-AVL-
 17368 11.18 1959 2223/25 1-2-3     ABE-CAK      24JUL DOM
SEQ     TIME ORIG TERM    LEGS      LAYOVER      NAV  DIVS
 17298 15.29 0640 1829/26 3-2-3     SPI-SYR-
 18015 17.14 1659 1314/27 3-2-2-3   MSN-CWA-HPN-
 21557  3.42 1730 2142/24 2
 17542 12.12 1829 2007/27 1-2-2-1   GSO-TLH-RDU-
 21535  9.36 1859 2038/26 1-4-1     MQT-CWA      25JUL DOM
SEQ     TIME ORIG TERM    LEGS      LAYOVER      NAV  DIVS
 21535  7.45 1000 1523/26 1-3       CMI-
 17546 18.00 1143 1414/28 3-2-2-3   XNA-TVC-XNA-
 17693 19.48 1320 1604/28 3-2-4-1   ABE-CMH-SGF-
 17924 18.09 1511 1036/28 3-2-2-3   LAN-XNA-TVC-
 17987 17.55 1610 1410/28 3-2-2-3   PIA-LAN-PIA  26JUL DOM
SEQ     TIME ORIG TERM    LEGS      LAYOVER      NAV  DIVS
 17310  3.02 0659 0632/27 1-1       CVG-
 17280  2.25 0808 0716/27 1-1       PIA-
 17792 14.01 1355 0713/29 3-2-2-1   GSO-CLL-ICT-
 17866 14.36 1459 1612/29 3-2-2-1   SGF-ATW-XNA-
 17914  8.16 1508 0849/28 3/1       SYR/
27JUL DOM
SEQ     TIME ORIG TERM    LEGS      LAYOVER      NAV  DIVS
 17445 18.42 0800 1559/30 1-3/3-1   LIT-DCA/BOS-
 17391  8.37 1315 0905/29 1-4-1     SPI-SGF-
 18160  8.47 1859 1414/29 1-4-1     MQT-MSN      28JUL DOM
SEQ     TIME ORIG TERM    LEGS      LAYOVER      NAV  DIVS
 17357  8.52 0830 0910/30 1-2-1     VPS-CMH      29JUL DOM
SEQ     TIME ORIG TERM    LEGS      LAYOVER      NAV  DIVS
 21526  7.12 1630 0731/31 1-2-1     BMI-MCI      30JUL DOM
SEQ     TIME ORIG TERM    LEGS      LAYOVER      NAV  DIVS
NONE FOUND
31JUL DOM
SEQ     TIME ORIG TERM    LEGS      LAYOVER      NAV  DIVS
 14002  5.05 0715 1036/02 3-2-3     XNA-TVC      END
`;

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

export const RAW_N4_DFW_TEXT = `DFW E75 CA   OPEN SEQUENCES                    AS OF 20JUL/2211
20JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS
NONE FOUND
21JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS
 21584   0.00 1700 0100/22 2
 21605  10.50 2008 1418/23 1-2-3    TRC-AEX-
22JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS
 21590   4.55 1045 0950/23 1-1      AGU-
23JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS
 21510   9.49 1123 2021/24 5-1      CID-
24JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS
 05287   1.59 1200 0620/25 1-1      ABI-
 06343  18.17 1543 1504/27 3-2-2-5  AMA-MSY-LIT-
 06635   9.29 1543 0620/27 1-4-2-1  TXK-ICT-ABI-
 06002   4.51 2000 1915/25 1-1      LEX-
 21558  10.21 2008 1227/26 1-2-3    TRC-LCH-
 21561   8.43 2158 1949/26 1-4-1    GCK-CLL-
 21503   4.57 2211 0607/26 1-2-1    SGF-TYR-
 06668   1.58 2249 1823/25 1-1      TYR-
25JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS
 05699  18.14 1201 1218/28 5-2-2-3  GRK-HSV-ABQ-
 05823  17.19 1245 0835/28 3-2-2-1  LIT-XNA-TRC-
 06211  18.18 1507 1336/28 3-2-2-3  BMI-LIT-MLU-
 06240  19.07 1515 2118/28 1-2-3/2  CAE-LIT-DCA/
 21534  10.17 1803 1111/27 3-2-3    TXK-ACT-
26JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS
 05343   7.58 0700 0825/28 3-2-1    MLU-AMA-
 05299   6.19 0820 1141/27 1-3      CLL-
 21532   5.11 0856 1558/26 4
 06295  17.59 1528 1140/29 3-2-2-3  EVV-SGF-ABI-
27JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS
 05370  13.45 0711 2118/29 1-2/3    DSM-CID/
 06153  16.24 1452 1507/30 3/2-3    AVL/TRC-
 21554   2.15 1740 2025/27 2
 06776  11.38 2035 1259/30 1-2-2-3  MAF-SPS-LRD-
 06591   6.12 2249 1914/29 1-2-1    FSM-COU-
28JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS
 21545   7.40 1648 1510/29 1-5      LRD-
29JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS
 05303   2.14 0820 0611/30 1-1      CLL-
 05439  10.07 1737 2145/31 1-2-1    CMH-GSP-
30JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS
NONE FOUND
31JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS
NONE FOUND
***************************************************************
DFW E75 CA   CREWED SEQUENCES POSTED FOR DROP  AS OF 20JUL/2211
22JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB
 21559   4.23 1209 1702/22 2                                   *
23JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB
 05321   8.06 0913 1326/24 1-3      GPT-
24JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB
 05255   5.37 0930 1604/24 2                                   *
25JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB
 05840  10.37 2129 1419/28 1-2-2-1  EVV-TUL-CRP-
26JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB
 05254   4.43 0600 1113/26 2                                   *
27JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB
 05254   4.43 0600 1113/27 2                                   *
 21505   2.35 0821 1126/27 2
 05754  11.52 2125 1110/30 1-2-2-3  LCH-CRP-LBB-
30JUL DOM
SEQ     TIME ORIG TERM    LEGS     LAYOVER      NAV  DIVS    HB
 05718   9.57 1214 1342/02 5-2-2-3  BTR-LBB-BRO-
END
`;
