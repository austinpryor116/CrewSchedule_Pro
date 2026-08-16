---
name: decs-integration-expert
description: Expert in the architecture, rules, schemas, and decoding of American Airlines / American Eagle DECS & FOS host terminal integration. Covers HI1, HI2, HSS, N4 open time, 3270 macros, and comprehensive FOS code lookups.
---

# DECS & FOS Integration Expert Reference

This document provides the definitive specification for the American Airlines / American Eagle FOS (Flight Operating System) / WebSabre / DECS host terminal, based on official Flight Operations display guides and bid code manuals.

---

## 1. HI1 Detailed Monthly Activity Record Layout

### Header Block (Lines 1–15)
- `(1) MONTH ENDING 31MAY00`: Contractual month end date.
- `(2) AS OF 21MAR04`: Display query date (DDMMMYY).
- `(3) /0927`: Query 24h clock time.
- `(4) CKA / CKA-SUPL`: Check Airman or Supplemental Check Airman designation.
- `(5) INTL`: International bid award flag.
- `(6) SC-Y / SC-N`: Sick Self-Clear Indicator (`Y` = Yes, `N` = No).
- `(7) HOLLANDAISE JJ`: Crewmember Name.
- `(8) 2601`: Seniority number within partition (e.g. `NA`, `MQ`).
- `(9) 23456 / 742840`: Crewmember Employee ID number.
- `(10) DFW / ORD / MIA`: Permanent / Temporary Crew Base.
- `(11) 301-CA / 301-FO`: Bid line award and Seat Category (`CA` = Captain, `FO` = First Officer).
- `(12) E145 / E175 / B737`: Highest equipment type in bid selection.
- `(13)-(16) H/B/T/O Phones`: Home, Business, Temporary, and Optional other contact numbers + PIN.
- `(17) TCD ISSUED / CANCELLED`: Temporary Confirmation Document (FAR Exemption 5560/5487 for lost certificate). Max 4 per rolling window.

### Cumulative Totals & Pay Accounting Block
- `(18) GTD 55.25`: Greater Time to Date (cumulative total of all legs flown, greater of scheduled vs actual).
- `(19) DEXP 182.02`: Domestic Expenses (Per Diem) to date (Hours.Minutes).
- `(20) IEXP 0.00`: International Expenses (Per Diem) to date.
- `(21) GUAR 72.00 / 75.00`: Monthly minimum guarantee (72h lineholder, 75h reserve).
- `(22) FLT TIME 42.55`: Accrued actual flight time to date for month.
- `(23) YTD TL / 12MO TL 456.12`: Accrued actual flight time for calendar year (FAR 121 Domestic / 135) or rolling 12 months (FAR 121 Flag).
- `(24) TTL ICPD 2`: International City Per Diem count of completed international layovers.
- `(25) PTL TRIP TRD`: Partial Trip Trades count.
- `(26) DROP`: Number of partial trips dropped.
- `(27) BID SEL PROJ FOR [EQ]`: Bid selection projection split by aircraft equipment.
- `(28) BID SEL PROJ 79.58`: Total printed bid package value (before changes).
- `(29) ACT/SKD PROJ 67.46`: Projected total flight time (actual flown + scheduled remaining) for Part 121 100-hour monthly limit.
- `(30) YTD / 12M 228.37`: Actual YTD time + scheduled remaining time.

### Sick Accrual & Bank Tracking
- `(31) AVBL SK 000`: Available Sick Time.
- `(32) YTD SK ACRL`: Sick Accrual Year-to-Date.
- `(33) SK USED MTD`: Sick Used Month-to-Date.
- `(34) LONG TERM SK AVAIL`: Long Term Sick Available bank (HH.MM).
- `(35) LONG TERM SK USED MTD`: Long Term Sick Used this month.
- `(36) ELIGIBLE FOR LONG TERM SICK`: Authorized to use LTS bank.
- `(37) SHORT TERM SICK PAYOUT ACCRUAL`: Hours eligible for year-end cash/401(k) rollover payout (>100h / >200h).
- `(38) SK TIME AVAIL FOR M/U`: Sick fly-back make-up time available.

---

## 2. Activity Table Columns `(39)`–`(54)`

| Col | Header | Description | Notes |
|:---|:---|:---|:---|
| **(39)** | `DD` | Calendar Day | 1 to 31 |
| **(40)** | `ST` | Pay Status Code | See Pay Status table below |
| **(41)** | `RMV` | Reason Code for Removal | E.g., `VC`, `SK`, `FP`, `FT`, `CL`, `SD` |
| **(42)** | `ADD` | Reason Code for Addition | E.g., `TF`, `RA`, `SH`, `MU`, `OT`, `RF` |
| **(43)** | `SEQ` | Sequence Number or Activity | Sequence # (e.g. `14731`), `HOMSTUDY`, `S/B`, `RAP`, `DO` |
| **(44)** | `FLT` | Flight Numbers & Prefixes | Prefix defines leg type (`-`, `D`, `C`, `*XX`, `X`) |
| **(45)** | `SKED` | Scheduled Flight Time & Duty Credit | For duty period (HH.MM) |
| **(46)** | `STTL` | Sequence Scheduled Total | Total scheduled flight time & credit for sequence |
| **(47)** | `ACT` | Actual Flight Time | Flown time for duty period legs |
| **(48)** | `GRTR` | Greater Time (Duty Period) | Leg-by-leg greater of actual vs scheduled |
| **(49)** | `GTTL` | Greater Total (Sequence) | Leg-by-leg greater total for sequence |
| **(50)** | `EXP TAFB` | Time Away From Base Expenses | Multi-day per diem. Shows `Taxable` for 1-day turns |
| **(51)** | `*` | Continuity Indicator | E.g. `*4113` indicates sequence fails continuity |
| **(52)** | Misc | Misc Credit Codes | E.g. `HOMSTUDY`, `IOE`, `DR`, `RS` with pay in `GRTR`/`GTTL` |
| **(53)** | `RAP` / `S/B` | Reserve Availability Period | E.g. `RAP 1400 2200`, `S/B 1400 2200` |
| **(54)** | `MISC EXP` | Half Day Station Expenses | Historical per diem counts |

---

## 3. Pay Status Codes `(Col ST)`

- `1`: Captain, Lineholder, Domestic
- `2`: Captain, Reserve, Domestic
- `3`: Captain Lineholder on a Reserve Day, Domestic
- `4`: First Officer, Lineholder, Domestic
- `5`: First Officer, Reserve, Domestic
- `6`: Management / Instructor
- `7`: First Officer Lineholder on a Reserve Day, Domestic
- `11`: Captain, Lineholder, International
- `12`: Captain, Reserve, International
- `13`: Captain Lineholder on a Reserve Day, International
- `14`: First Officer, Lineholder, International
- `15`: First Officer, Reserve, International
- `17`: First Officer Lineholder on a Reserve Day, International

---

## 4. Flight Number Prefix Identifiers

- `-` (Dash, e.g. `-1340`): Normal operating flight leg.
- `D` (Deadhead, e.g. `D452`): Company Deadhead.
- `C` (Cancelled, e.g. `C2114`): Cancelled flight (protected pay).
- `*XX` (OAL Deadhead, e.g. `*UA234`, `*DL112`): Other Airline Deadhead.
- `X` (Removed, e.g. `X1509`): Flight removed from sequence.

---

## 5. FOS Removal Codes `(Col RMV)`

| Code | Print Code | Description |
|:---|:---|:---|
| `VC` | `VACATION` | Scheduled Vacation |
| `V6` | `VACDAY` | Single Vacation Day |
| `VX` | `VACNOFLY` | Vacation (No Fly) |
| `CV` | `CXLD VAC` | Cancelled Vacation |
| `SK` | `SICK` | Paid Sick Leave |
| `SX` | `UNPDSICK` | Unpaid Sick |
| `US` | `UNPDSICK` | Unpaid Sick Leave |
| `SC` | `SK CALIF` | California Sick Leave |
| `SF` | `SKINTFAM` | Sick in Family |
| `IF` | `INTFAML` | Intermittent Family Leave |
| `FP` | `FATG PD` | Fatigue Removal (Paid) |
| `FT` | `FATG` | Fatigue Removal |
| `CL` | `CL` | Closeout / Company Removal |
| `SD` | `SEQDROP` | Sequence Dropped |
| `DT` | `DRP TRP` | Dropped Trip |
| `DV` | `DRP RSV` | Dropped Reserve Day |
| `GA` | `GIVEAWAY` | Trip Giveaway / Trade |
| `OE` | `OPT EXCH` | Option Exchange / Trade |
| `SW` | `SKED WIRE` | Schedule Wire Change |
| `SH` | `SKD CHG` | Schedule Change |
| `XX` | `CXDRMVL` | Cancelled Sequence Removal |
| `XL` | `CXDNOREV` | Cancelled - No Revision |
| `XR` | `CXDRMVL` | Cancelled Removal |
| `DP` | `DISPD` | Displaced by Check Airman / Management |
| `PD` | `DISPD` | Displaced |
| `CH` | `CHG OVR` | Changeover |
| `AC` | `ACREFUSED`| Aircraft Refused |
| `TO` | `TIMEDOUT` | FAR 117 / Duty Timed Out |
| `EM` | `ACTOFGOD` | Act of God / Emergency |
| `CP` | `COMMUTER` | Commuter Policy Removal |
| `30` | `30 HRS` | FAR 30 Hours in 7 Days Rest |
| `7D` | `7 DAYS` | 7 Consecutive Days Rest |
| `V1` | `12 IN 24` | FAR 121.471 12 in 24 Rest |
| `V2` | `20 IN 48` | FAR 121.471 20 in 48 Rest |
| `V3` | `24 IN 72` | FAR 121.471 24 in 72 Rest |
| `V8` | `PART 121` | FAR Part 121 Legality Removal |
| `TR` | `TRNG` | Training Removal |
| `TF` | `FLT TRNG`| Flight Training |
| `TG` | `GRND TRN` | Ground Training |
| `ST` | `SIM TRNG` | Simulator Training |
| `T1`/`T2`/`T3` | `SPL TRG` | Special Training |
| `0G` | `INIT GS` | Initial Ground School |
| `AG` | `TRANS GS` | Transition Ground School |
| `UG` | `UPGRD GS` | Upgrade Ground School |
| `RG` | `RECUR GS` | Recurrent Ground School |
| `AI` | `AWTGIOE` | Awaiting IOE |
| `AQ` | `AWTGREQL`| Awaiting Requalification |
| `BR` | `BEREAVMT` | Bereavement Leave |
| `BU` | `BRUNPAID` | Bereavement Unpaid |
| `JD` | `JD` | Jury Duty |
| `ML` | `MIL LOA` | Military Leave of Absence |
| `MR` | `MIL RQST` | Military Request |
| `FC` | `FMLA` | Family Medical Leave Act |
| `F6` | `FMLA V6` | FMLA Vacation Day |
| `PL` | `PLOA` | Personal Leave of Absence |
| `PE` | `PELOA` | Personal Emergency LOA |
| `SL` | `SLOA` | Sick Leave of Absence |
| `JI` | `IOD LOA` | Injury on Duty LOA |
| `IS` | `INJURYSK` | Injury Sick Leave |
| `MV` | `MV DAY` | Moving Day |
| `UM` | `UNPD MV` | Unpaid Moving Day |
| `WP` | `WITNESSP` | Company Witness (Paid) |
| `WU` | `WITNESSU` | Witness (Unpaid) |
| `AS` | `ASAP` | ASAP Program Removal |
| `SP` | `SAFTYPRGM`| Safety Program Removal |
| `MC` | `MISCON` | Misconnection |
| `MT` | `MISSEDTRIP`| Missed Trip |
| `LR` | `RPT LATE` | Report Late |
| `LT` | `LATE4TR` | Late for Trip |
| `MA` | `MISDASMT` | Missed Assignment |
| `SS` | `SUSPEND` | Suspended |
| `RL` | `RELEASED`| Released from Duty |

---

## 6. FOS Add Codes `(Col ADD)`

| Code | Print Code | Description |
|:---|:---|:---|
| `TF` | `TRNGFLT` | Training Flight Addition |
| `EX` | `EXTENDED` | Extended Duty / Sequence Extension |
| `RE` | `REPO` | Repositioning Flight |
| `CE` | `CHG EQP` | Change of Equipment |
| `JM` | `JUN MAN` | Junior Manned Assignment |
| `DP` | `DISPD` | Displaced Assignment |
| `CH` | `CHG OVR` | Changeover Addition |
| `TR` | `TRNG` | Training Assignment |
| `TY` | `TDY` | Temporary Duty Assignment |
| `RA` | `RA` | Regular Assignment / Sequence Added |
| `JP` | `JMEXPAY` | Junior Available / Extension Premium Pay |
| `LT` | `LOT` | Lock Out / Open Time Award |
| `BO` | `BIDOPEN` | Bid Open Time Trip Award |
| `SH` | `SKD CHG` | Schedule Change Addition |
| `MX` | `TST FLT` | Test Flight |
| `FR` | `MX FERRY`| Maintenance Ferry Flight |
| `SL` | `SPVDLNFL`| Supervised Line Flying |
| `MA` | `NEW ASMT`| New Flight Assignment |
| `MU` | `MAKE UP` | Make-Up Flying |
| `OT` | `OVERTIME`| Overtime Flying Assignment |
| `AR` | `CA AS FO`| Captain Flying in FO Seat |
| `RF` | `RESERVE` | Reserve Availability / Assignment Addition |
| `SM` | `SK MKUP` | Sick Make-Up Flying |
| `TT` | `TT` | Trip Trade Addition |
| `R1` | `RSV SLF` | Reserve Supervised Line Flying |
| `LM` | `LOTRSV` | Lock Out Open Time for Reserve |
| `SF` | `SUPFLY` | Supplemental Flying |
| `CS` | `CRSKACCT`| Credit Sick Account |
| `AV` | `AVAIL` | Available for Duty |
| `OE` | `OPT EXCH`| Option Exchange Addition |
| `SB` | `STANDBY` | Airport Standby Reserve Assignment |
| `LI` | `LINECKTC`| Line Check Training Center Instructor |
| `IN` | `IOEINSTR`| Initial Operating Experience Instructor |
| `LX` | `LCSTUDNT`| Line Check Student |
| `LC` | `LINECK` | Line Check Flight |
| `IT` | `IOEINST` | IOE Instructor Flight |
| `IE` | `IOE` | Initial Operating Experience |
| `SW` | `SKEDWIRE`| Schedule Wire Addition |
| `LR` | `NEWASGN` | New Assignment Addition |
| `SD` | `SEQDROP` | Sequence Drop Adjustment |
| `OO` | `TTOPTIME`| Trip Trade Open Time |

---

## 7. FOS Misc. Payroll & Credit Codes `(Col SEQ / Misc)`

- `HOMSTUDY` / `HOMESTUDY`: Home Study Pay Credit (credited to `GRTR` / `GTTL`).
- `TRNGPAY`: Training Pay.
- `IOE INST`: IOE Instructor Premium Pay.
- `PERDIEM`: Domestic Expense Per Diem calculation.
- `TPERDIEM`: Taxable Per Diem (single-day turns).
- `ICPD PAY`: International City Per Diem overnight bonus.
- `SAABVGUR`: Special Assignment Above Guarantee Pay.
- `SATOWGUR`: Special Assignment Toward Guarantee Pay.
- `ADTOWGUR`: Additional Hours Toward Guarantee.
- `OTPREMCR`: Overtime Premium Credit.
- `OTPREMDB`: Overtime Premium Debit.
- `JMEXPRCR`: Junior Manned / Extension Premium Credit.
- `JMEXPRDB`: Junior Manned / Extension Premium Debit.
- `PDVACADJ`: Paid Vacation Adjustment (Manual adjustment to vacation pay).
- `SICKCRPD`: Paid Sick Credit.
- `SICKUNPD`: Unpaid Sick Credit.
- `SKREDUCT`: Sick Reduction.
- `PRKG PAY`: Parking Reimbursement ($$).
- `TRNSPORT`: Transportation / Cab Pay.
- `DRUGTEST`: Drug Testing Pay.
- `TAXITIME`: Taxi Time Credit.
- `DB BIDLN`: Debit to Bidline.
- `CR BIDLN`: Credit / Increase to Bidline.
- `TRANSNDB`: Transition Debit to Bidline.
- `TRANSNCR`: Transition Credit to Bidline.
- `FINALPAY`: Final Pay Override.
- `GUAR`: Minimum Guarantee Override.
- `PRORATED`: Prorated Guarantee for partial month.

---

## 8. Screen Navigation & 3270 State Machine Rules

1. **Clean Row Pagination (`MD`)**:
   - In 3270 block mode, typing `MD` while cursor is in an active text row causes `‡FORMAT‡` error.
   - Always drop cursor to `scr.currentLine + 1` with `scr.setSOM(0, nextRow)` before sending `MD`.
2. **Page Completion Detection**:
   - Look for `BOTTOM OF`, `NO MORE DATA`, `END OF DISP`, `END OF SCROL`, `LAST PAGE`, `NO MORE SCROLL`.
   - On sequence detail screens (`HSS`), handle `MORE? (ENTER Y)` by typing `Y` rather than `MD`.
3. **Sign-In Auto-Fill**:
   - `BSIP[ID]` command displays `BASIC AGENT SIGN-IN`.
   - DECS natively places the cursor in the `CURRENT PASSCODE` box at column 17 of row 1. Keystrokes must be passed directly to `st.keyPressed` without moving the cursor away to the `<` characters in the ID/Suffix fields.
