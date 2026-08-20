# American Airlines / American Eagle DECS & FOS Master Code Reference

This document is the definitive single source of truth for all DECS terminal commands, 3270 block-mode codes, and FOS (Flight Operating System) transaction codes used in CrewSchedule Pro.

---

## 1. Master DECS Host Terminal Commands

| Command | Full Syntax | Name | Category | Description | Example |
|---|---|---|---|---|---|
| **HI1** | `HI1^` or `HI1/(EMP)^` | Current Month Schedule Roster | Schedule | Pulls current bid month's pilot monthly activity record, pairings, duty legs, credit hours, sick/vacation accrual, and TAFB. | `HI1^` |
| **HI2** | `HI2^` or `HI2/(EMP)^` | Next Month Schedule Roster | Schedule | Pulls upcoming bid month's published schedule once awards are released. | `HI2^` |
| **HI3** | `HI3/(SEQ)^` or `HI3/(SEQ)/(DATE)^` | Detailed Sequence View | Schedule | Displays pairing details including flight numbers, scheduled/actual block, report/release times, layover hotels, and crew names. | `HI3/17894/19AUG^` |
| **HSS** | `HSS/(BASE)/(DATE)/(SEQ)^` or `HSS/(SEQ)^` | Sequence Pairing Lookup | Schedule | Pulls sequence pairing details from master base schedule with full leg itineraries, duty periods, block, and TAFB. | `HSS/ORD/19AUG/17894^` |
| **HSD** | `HSD/(EMP)/(DATE)^` | Sequence Details by Employee ID | Schedule | Displays pairing information assigned to a specific crew member for a given date. | `HSD/742840/19AUG^` |
| **N6D** | `N6D/(BASE)/(DATE)/(FLEET)/(SEAT)^` | Base Reserve Pilot Roster Display | Reserve | Displays daily and monthly reserve pilot roster for a base, showing RAP1/RAP2/RSV assignments, seniority numbers, projected hours, and reverse seniority callout order. | `N6D/ORD/19AUG/E75/CA^` |
| **N4D** | `N4D/(BASE)/(DATE)/(FLEET)/(SEAT)^` | Open Time Detailed Trips Display | Open Time | Displays all open sequences available for pickup or trade with full flight legs, credit hours, and release times. | `N4D/ORD/19AUG/E75/CA^` |
| **N3D** | `N3D/(BASE)/(DATE)/(FLEET)/(SEAT)^` | Open Time Summary Display | Open Time | Condensed summary list of open pairings available in open time pot. | `N3D/ORD/19AUG/E75/CA^` |
| **HI33** | `HI33/(BASE)/(DATE)^` | Reserve Availability Grid | Reserve | Displays reserve pilot count, coverage needs, and available reserve pilots across duty periods. | `HI33/ORD/19AUG^` |
| **HI25** | `HI25/(BASE)/(DATE)^` | Reserve Standings & Callout Order | Reserve | Displays reserve pilot availability bucket standings and callout order for assignment. | `HI25/ORD/19AUG^` |
| **HIHR** | `HIHR/(START_DATE)/(END_DATE)^` | Reserve Turnback List | Reserve | Displays Reserve Turnback List for date range, showing pilots who turned back trips/assignments and from whom other pilots cannot trade/pick up/appropriate. | `HIHR/19AUG/25AUG^` |
| **HIFIT** | `HIFIT/(SEQ)/(DATE)/(AIRPORT)^` | Fit For Duty Report Sign-In | Schedule | Submits FAA / Company Fit for Duty sign-in certification for the start of a pairing. | `HIFIT/17894/19AUG/ORD^` |
| **HIY** | `HIY^` | Trip Trade Main Menu | Trade | Enters the electronic trip trade and swap system. | `HIY^` |
| **HTS** | `HIY^HT^HTS/A/(CUR_SEQ)/(CUR_DATE)^HTS/B/(DES_SEQ)/(DES_DATE)/(SEAT)^HTMD^HZ^HIN^` | Submit Pilot-to-Pilot Trip Trade | Trade | Submits an automated sequence swap between two pilots or a sequence drop request. | `HIY^HT^HTS/A/17894/19AUG^HTS/B/18201/22AUG/CA^HTMD^HZ^HIN^` |
| **HTO** | `HIY^HT^HTO/B/(SEQ)/(DATE)/(SEAT)^HTMD^HZ^HIN^` | Open Time Pickup Request | Trade | Requests automated pickup of a sequence from the open time pot. | `HIY^HT^HTO/B/17894/19AUG/CA^HTMD^HZ^HIN^` |
| **HIB** | `HIB^` or `HIB/(BASE)/(EQUIP)/(SEAT)^` | Monthly Line Bidding Screen | Bidding | Accesses PBS monthly schedule bidding options and bid preference sheets. | `HIB/ORD/E75/CA^` |
| **3BR** | `3BR/(BASE)/(FLEET)/(SEAT)/(MONTH)^` | Final Bid Award Results Summary | Bidding | Displays awarded lines, reserve lines, and award seniority cutoffs for a base and seat. | `3BR/ORD/E75/CA/AUG^` |
| **JP*** | `JP*/(FLT)/(DATE)^` or `JP*/(FLT)/(DATE)/(DEP)^` | Full Dispatch Flight Release & OFP | Preflight | Pulls operational flight plan (OFP), fuel breakdown, alternate airports, route waypoints, and dispatch remarks. | `JP*/4122/19AUG/ORD^` |
| **JPD** | `JPD/(FLT)/(DATE)^` | Short Dispatch Release Summary | Preflight | Condensed flight release with release fuel, filed altitude, estimated times, and alternates. | `JPD/4122/19AUG^` |
| **SLS*** | `SLS*/(AIRPORT)^` | Station Surface Weather & NOTAMs | Preflight | Pulls station METAR, TAF, field conditions, runway braking action reports, and field NOTAMs. | `SLS*/ORD^` |
| **RGMN** | `RGMN/(NOSE_OR_TAIL)^` | Aircraft Maintenance Status & Open MELs | Preflight | Displays open Minimum Equipment List (MEL) and Configuration Deviation List (CDL) items for an aircraft. | `RGMN/714^` |
| **FIL** | `FIL/(FLT)/(DATE)^` | Flight Status & Location | Preflight | Displays live flight status, gate arrival/departure, in-range estimates, and delay codes. | `FIL/4122/19AUG^` |
| **26AAA** | `26AAA/(DEP)/(ARR)/(DATE)^` | Airline Master Schedule Listing | Commute | Lists all scheduled flights between city pairs with equipment types, departure, and arrival times. | `26AAA/ORD/DFW/19AUG^` |
| **26B** | `26B/(FLT)/(DATE)^` | Flight Loads & Non-Rev Standby List | Commute | Displays seat availability (First/Main), authorized capacity, booked seats, and standby list priority. | `26B/4122/19AUG^` |

---

## 2. 3270 Terminal Control Keys

| Key / Command | Action | Behavior |
|---|---|---|
| **MD** | Move Down | Paginates forward to the next page of multi-page displays. |
| **MU** | Move Up | Paginates backward to the previous page of multi-page displays. |
| **Y** | Confirm / More | Responds affirmatively to terminal prompt `MORE? (ENTER Y)`. |
| **SHIFT_ENTER** | Line Down | Advances the cursor and Start-of-Message (SOM) pointer down 1 row. |
| **CTRL_HOME** | Terminal Home | Resets cursor and Start-of-Message (SOM) pointer to `(0, 0)`. |
| **SHIFT_DELETE** | Clear Page | Clears the 3270 screen buffer and resets cursor to `(0, 0)`. |

---

## 3. FOS Removal Codes (RMV)

| Code | Print Code | Description | Contractual / Operational Meaning |
|---|---|---|---|
| **VC** | VACATION | Scheduled Vacation | Full scheduled vacation block |
| **V6** | VACDAY | Single Vacation Day | Single contractually designated vacation day |
| **VX** | VACNOFLY | Vacation (No Fly Status) | Vacation block with no flying permitted |
| **CV** | CXLD VAC | Cancelled Vacation | Previously awarded vacation cancelled |
| **SK** | SICK | Paid Sick Leave | Paid sick leave charged to pilot's bank |
| **SX** | UNPDSICK | Unpaid Sick | Sick leave taken without remaining sick bank |
| **US** | UNPDSICK | Unpaid Sick Leave | Unpaid sick removal |
| **SC** | SK CALIF | California Sick Leave | Mandated California state sick leave |
| **SF** | SKINTFAM | Sick in Family | Sick leave for family member care |
| **IF** | INTFAML | Intermittent Family Leave | Intermittent FMLA absence |
| **FP** | FATG PD | Fatigue Removal (Paid) | Fatigue safety report with pay protection |
| **FT** | FATG | Fatigue Removal (Unpaid) | Standard fatigue removal |
| **CL** | CL | Company Closeout | Schedule closed out for admin/ops reasons |
| **SD** | SEQDROP | Sequence Dropped | Sequence dropped via trade board or management |
| **DT** | DRP TRP | Dropped Trip | Trip dropped from schedule |
| **DV** | DRP RSV | Dropped Reserve Day | Reserve availability day dropped |
| **GA** | GIVEAWAY | Trip Giveaway | Sequence transferred to another crew member |
| **OE** | OPT EXCH | Option Exchange | Sequence exchanged in PBS / option window |
| **SW** | SKED WIRE | Schedule Wire Change | Schedule modification communicated via teletype wire |
| **SH** | SKD CHG | Schedule Change Removal | Flight cancellation or schedule retiming removal |
| **XX** | CXDRMVL | Cancelled Sequence Removal | Flight cancellation removal with pay protection |
| **XL** | CXDNOREV | Cancelled - No Revision | Cancelled without reroute assignment |
| **XR** | CXDRMVL | Cancelled Removal | Cancelled flight removal |
| **DP** | DISPD | Displaced | Pilot displaced by Check Airman or Management |
| **PD** | DISPD | Displaced Assignment | Displaced flying |
| **CH** | CHG OVR | Changeover Removal | Equipment or base changeover removal |
| **AC** | ACREFUSED | Aircraft Refused | Aircraft safety refusal |
| **TO** | TIMEDOUT | FAR 117 Timed Out | Pilot exceeded maximum FDP or flight time limit |
| **EM** | ACTOFGOD | Act of God / Emergency | Severe weather or airport closure |
| **CP** | COMMUTER | Commuter Policy Removal | Invoked contractual commuter policy protection |
| **30** | 30 HRS | 30 Hours in 7 Days Rest | FAR Part 121 / 117 mandatory rest removal |
| **7D** | 7 DAYS | 7 Consecutive Days Rest | Contractual 7 consecutive days mandatory rest |
| **V1** | 12 IN 24 | 12 in 24 Rest Removal | FAR 121.471 legality removal |
| **V2** | 20 IN 48 | 20 in 48 Rest Removal | FAR 121.471 legality removal |
| **V3** | 24 IN 72 | 24 in 72 Rest Removal | FAR 121.471 legality removal |
| **V8** | PART 121 | FAR Part 121 Removal | FAR Part 121 general legality removal |
| **TR** | TRNG | Training Removal | Ground or simulator training removal |
| **TF** | FLT TRNG | Flight Training | In-flight training module removal |
| **TG** | GRND TRN | Ground Training | Ground school class removal |
| **ST** | SIM TRNG | Simulator Training | Simulator recurrent or qualification module |
| **0G** | INIT GS | Initial Ground School | New hire initial ground school |
| **AG** | TRANS GS | Transition Ground School | Equipment transition ground school |
| **UG** | UPGRD GS | Upgrade Ground School | Captain upgrade ground school |
| **RG** | RECUR GS | Recurrent Ground School | Annual recurrent ground school |
| **AI** | AWTGIOE | Awaiting IOE | Awaiting Initial Operating Experience assignment |
| **AQ** | AWTGREQL | Awaiting Requalification | Awaiting requalification training |
| **BR** | BEREAVMT | Bereavement Leave | Paid contractual bereavement leave |
| **BU** | BRUNPAID | Bereavement Unpaid | Unpaid bereavement leave |
| **JD** | JD | Jury Duty | Civic jury duty leave |
| **ML** | MIL LOA | Military Leave | Active duty or reserve military duty |
| **MR** | MIL RQST | Military Request | Military drill or service request |
| **FC** | FMLA | Family Medical Leave Act | Protected federal FMLA leave |
| **PL** | PLOA | Personal Leave | Approved personal leave of absence |
| **SL** | SLOA | Sick Leave of Absence | Extended sick leave of absence |
| **JI** | IOD LOA | Injury on Duty | Worker's compensation / on-duty injury leave |
| **MV** | MV DAY | Moving Day | Contractual relocation moving day |
| **WP** | WITNESSP | Company Witness | Court appearance on behalf of company (Paid) |
| **AS** | ASAP | ASAP Program | Aviation Safety Action Program meeting |
| **SP** | SAFTYPRGM | Safety Program | Safety committee assignment |
| **MC** | MISCON | Misconnection | Downline flight misconnection |
| **MT** | MISSEDTRIP | Missed Trip | Missed pairing assignment |
| **LR** | RPT LATE | Report Late | Late check-in for pairing |
| **MA** | MISDASMT | Missed Assignment | Missed reserve assignment callout |
| **RL** | RELEASED | Released from Duty | Released early from pairing or reserve duty |

---

## 4. FOS Addition Codes (ADD)

| Code | Print Code | Description |
|---|---|---|
| **RA** | RA | Regular Assignment Added |
| **TF** | TRNGFLT | Training Flight Added |
| **EX** | EXTENDED | Extended Duty / Sequence Extension |
| **RE** | REPO | Repositioning Flight Leg |
| **CE** | CHG EQP | Change of Equipment Addition |
| **JM** | JUN MAN | Junior Manned Flight Assignment |
| **JP** | JMEXPAY | Junior Available / Extension Premium Pay |
| **LT** | LOT | Lock Out / Open Time Award |
| **BO** | BIDOPEN | Bid Open Time Trip Award |
| **SH** | SKD CHG | Schedule Change Addition |
| **MX** | TST FLT | Maintenance Test Flight |
| **FR** | MX FERRY | Maintenance Ferry Flight |
| **SL** | SPVDLNFL | Supervised Line Flying |
| **MA** | NEW ASMT | New Flight Assignment |
| **MU** | MAKE UP | Make-Up Flying Assignment |
| **OT** | OVERTIME | Overtime Flying Assignment |
| **AR** | CA AS FO | Captain Flying in First Officer Seat |
| **RF** | RESERVE | Reserve Availability Addition |
| **SM** | SK MKUP | Sick Make-Up Flying |
| **TT** | TT | Trip Trade Sequence Addition |
| **R1** | RSV SLF | Reserve Supervised Line Flying |
| **LM** | LOTRSV | Lock Out Open Time for Reserve |
| **SF** | SUPFLY | Supplemental Flying |
| **AV** | AVAIL | Available for Duty |
| **OE** | OPT EXCH | Option Exchange Addition |
| **SB** | STANDBY | Airport Standby Reserve Assignment |
| **LI** | LINECKTC | Line Check Training Center Instructor |
| **IN** | IOEINSTR | Initial Operating Experience Instructor |
| **LC** | LINECK | Line Check Flight |
| **IT** | IOEINST | IOE Instructor Flight |
| **IE** | IOE | Initial Operating Experience Flying |
| **SW** | SKEDWIRE | Schedule Wire Addition |
| **OO** | TTOPTIME | Trip Trade from Open Time |

---

## 5. FOS Pay Status Codes (ST)

| ST Code | Rank & Role | Flight Category |
|---|---|---|
| **1** | Captain, Lineholder | Domestic |
| **2** | Captain, Reserve | Domestic |
| **3** | Captain Lineholder on Reserve Day | Domestic |
| **4** | First Officer, Lineholder | Domestic |
| **5** | First Officer, Reserve | Domestic |
| **6** | Management / Flight Instructor | All |
| **7** | First Officer Lineholder on Reserve Day | Domestic |
| **11** | Captain, Lineholder | International |
| **12** | Captain, Reserve | International |
| **13** | Captain Lineholder on Reserve Day | International |
| **14** | First Officer, Lineholder | International |
| **15** | First Officer, Reserve | International |
| **17** | First Officer Lineholder on Reserve Day | International |

---

## 6. FOS Flight Prefixes

| Prefix | Type | Meaning | Pay Protected? |
|---|---|---|---|
| `-` | Normal | Normal scheduled revenue flight leg | Yes |
| `D` | Deadhead | Company deadhead repositioning flight | Yes |
| `C` | Cancelled | Cancelled flight leg (schedule change / weather) | Yes (100% Pay Protected) |
| `X` | Removed | Removed flight leg | Subject to contract rules |
| `*` | OAL Deadhead | Other Airline (OAL) commercial deadhead | Yes |
