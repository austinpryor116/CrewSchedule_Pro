/**
 * CREWSCHEDULE PRO // MASTER DECS & FOS CODE REFERENCE (src/lib/decsReference.ts)
 *
 * Single Source of Truth for all American Airlines / American Eagle DECS Host Commands,
 * 3270 Control Codes, FOS Removal Codes (RMV), Addition Codes (ADD), Pay Status Codes (ST),
 * Flight Prefixes, Non-Flight Pay Credits, and Macro Builders.
 */

export interface DecsCommandMetadata {
  command: string;
  syntax: string;
  name: string;
  category: "Schedule" | "Reserve" | "OpenTime" | "Trade" | "Preflight" | "Commute" | "Navigation" | "TerminalControl";
  description: string;
  example: string;
  terminator: "^";
}

export interface FosCodeDefinition {
  code: string;
  printCode: string;
  description: string;
  category: "removal" | "addition" | "pay_status" | "flight_prefix" | "misc_credit";
  contractReference?: string;
}

// ============================================================================
// 1. MASTER DECS COMMAND DICTIONARY
// ============================================================================

export const DECS_COMMANDS: Record<string, DecsCommandMetadata> = {
  // --- Schedule & Roster Commands ---
  HI1: {
    command: "HI1",
    syntax: "HI1^ or HI1/(EMP)^ or HI1/(EMP)/(MONTH)^",
    name: "Current Month Schedule Roster",
    category: "Schedule",
    description: "Pulls current bid month's complete pilot monthly activity record, pairings, duty legs, credit hours, sick/vacation accrual, and TAFB.",
    example: "HI1^",
    terminator: "^",
  },
  HI2: {
    command: "HI2",
    syntax: "HI2^ or HI2/(EMP)^",
    name: "Next Month Schedule Roster",
    category: "Schedule",
    description: "Pulls the upcoming bid month's published schedule once awards are released.",
    example: "HI2^",
    terminator: "^",
  },
  HI3: {
    command: "HI3",
    syntax: "HI3/(SEQ)^ or HI3/(SEQ)/(DATE)^",
    name: "Detailed Sequence View by Sequence Number",
    category: "Schedule",
    description: "Displays complete pairing detail including flight numbers, scheduled/actual block, report/release times, layover hotels, and crew names.",
    example: "HI3/17894/19AUG^",
    terminator: "^",
  },
  HSS: {
    command: "HSS",
    syntax: "HSS/(BASE)/(DATE)/(SEQ)^ or HSS/(SEQ)^",
    name: "Sequence Pairing Lookup",
    category: "Schedule",
    description: "Pulls sequence pairing details from the master base schedule with full leg itineraries, duty periods, block, and TAFB.",
    example: "HSS/ORD/19AUG/17894^",
    terminator: "^",
  },
  HSD: {
    command: "HSD",
    syntax: "HSD/(EMP)/(DATE)^",
    name: "Sequence Details by Employee ID",
    category: "Schedule",
    description: "Displays pairing information assigned to a specific crew member for a given date.",
    example: "HSD/742840/19AUG^",
    terminator: "^",
  },
  HIS: {
    command: "HIS",
    syntax: "HIS/(EMP)^",
    name: "Trip Report Sign-In",
    category: "Schedule",
    description: "Signs in pilot for assigned sequence duty period.",
    example: "HIS/742840^",
    terminator: "^",
  },
  BSO: {
    command: "BSO",
    syntax: "BSO^",
    name: "Terminal Sign Out",
    category: "TerminalControl",
    description: "Signs out of current DECS / WebSabre agent session.",
    example: "BSO^",
    terminator: "^",
  },

  // --- Reserve & Open Time Commands ---
  N6D: {
    command: "N6D",
    syntax: "N6D/(BASE)/(DATE)/(FLEET)/(SEAT)^",
    name: "Base Reserve Pilot Roster Display",
    category: "Reserve",
    description: "Displays the daily and monthly reserve pilot roster for a base, showing RAP1/RAP2/RSV assignments, seniority numbers, projected hours, and reverse seniority callout order.",
    example: "N6D/ORD/19AUG/E75/CA^",
    terminator: "^",
  },
  N4D: {
    command: "N4D",
    syntax: "N4D/(BASE)/(EQUIPMENT)/(SEAT)/(STARTDATE)/(ENDDATE)^",
    name: "Open Time Detailed Trips Display",
    category: "OpenTime",
    description: "Displays all open sequences available for pickup or trade with full flight legs, credit hours, and release times.",
    example: "N4D/ORD/E75/CA/19AUG/25AUG^",
    terminator: "^",
  },
  N3D: {
    command: "N3D",
    syntax: "N3D/(BASE)/(DATE)/(FLEET)/(SEAT)^",
    name: "Open Time Summary Display",
    category: "OpenTime",
    description: "Condensed summary list of open pairings available in open time.",
    example: "N3D/ORD/19AUG/E75/CA^",
    terminator: "^",
  },
  HI33: {
    command: "HI33",
    syntax: "HI33/(BASE)/(DATE)^",
    name: "Reserve Availability Grid",
    category: "Reserve",
    description: "Displays reserve pilot count, coverage needs, and available reserve pilots across duty periods.",
    example: "HI33/ORD/19AUG^",
    terminator: "^",
  },
  HI25: {
    command: "HI25",
    syntax: "HI25/(BASE)/(DATE)^",
    name: "Reserve Standings & Callout Order",
    category: "Reserve",
    description: "Displays reserve pilot availability bucket standings and callout order for assignment.",
    example: "HI25/ORD/19AUG^",
    terminator: "^",
  },
  HI31: {
    command: "HI31",
    syntax: "HI31^2^(RAPS)^Y^X^",
    name: "Reserve Proffer Submission",
    category: "Reserve",
    description: "Submits daily reserve proffer preferences for RAP periods.",
    example: "HI31^2^RAP1 RAP2^Y^X^",
    terminator: "^",
  },
  HIHR: {
    command: "HIHR",
    syntax: "HIHR/(DATE)/(DATE)^",
    name: "Reserve Turnback List",
    category: "Reserve",
    description: "Displays the Reserve Turnback List for a specified date range, showing pilots on the list who have turned back trips or reserve assignments and from whom other pilots cannot trade/pick up/appropriate.",
    example: "HIHR/19AUG/25AUG^",
    terminator: "^",
  },

  // --- Trip Trading & Bidding ---
  HIFIT: {
    command: "HIFIT",
    syntax: "HIFIT/(SEQ)/(DATE)/(AIRPORT)^",
    name: "Fit For Duty Report Sign-In",
    category: "Schedule",
    description: "Submits FAA / Company Fit for Duty sign-in certification for the start of a pairing.",
    example: "HIFIT/17894/19AUG/ORD^",
    terminator: "^",
  },
  HIY: {
    command: "HIY",
    syntax: "HIY^",
    name: "Trip Trade Main Menu",
    category: "Trade",
    description: "Enters the electronic trip trade and swap system.",
    example: "HIY^",
    terminator: "^",
  },
  HTS: {
    command: "HTS",
    syntax: "HIY^HT^HTS/A/(CUR_SEQ)/(CUR_DATE)^HTS/B/(DES_SEQ)/(DES_DATE)/(SEAT)^HTMD^HZ^HIN^",
    name: "Submit Pilot-to-Pilot Trip Trade",
    category: "Trade",
    description: "Submits an automated sequence swap between two pilots or a sequence drop request.",
    example: "HIY^HT^HTS/A/17894/19AUG^HTS/B/18201/22AUG/CA^HTMD^HZ^HIN^",
    terminator: "^",
  },
  HTO: {
    command: "HTO",
    syntax: "HIY^HT^HTO/B/(SEQ)/(DATE)/(SEAT)^HTMD^HZ^HIN^",
    name: "Open Time Pickup Request",
    category: "Trade",
    description: "Requests automated pickup of a sequence from the open time pot.",
    example: "HIY^HT^HTO/B/17894/19AUG/CA^HTMD^HZ^HIN^",
    terminator: "^",
  },
  HIB: {
    command: "HIB",
    syntax: "HIB^ or HIB/(BASE)/(EQUIP)/(SEAT)^",
    name: "Monthly Line Bidding Screen",
    category: "Trade",
    description: "Accesses PBS monthly schedule bidding options and bid preference sheets.",
    example: "HIB/ORD/E75/CA^",
    terminator: "^",
  },
  "3BR": {
    command: "3BR",
    syntax: "3BR/(BASE)/(FLEET)/(SEAT)/(MONTH)^",
    name: "Final Bid Award Results Summary",
    category: "Trade",
    description: "Displays awarded lines, reserve lines, and award seniority cutoffs for a base and seat.",
    example: "3BR/ORD/E75/CA/AUG^",
    terminator: "^",
  },

  // --- Preflight, Dispatch & Weather ---
  "JP*": {
    command: "JP*",
    syntax: "JP*/(FLT)/(DATE)^ or JP*/(FLT)/(DATE)/(DEP)^",
    name: "Full Dispatch Flight Release & OFP",
    category: "Preflight",
    description: "Pulls operational flight plan (OFP), fuel breakdown, alternate airports, route waypoints, and dispatch remarks.",
    example: "JP*/4122/19AUG/ORD^",
    terminator: "^",
  },
  JPD: {
    command: "JPD",
    syntax: "JPD/(FLT)/(DATE)^",
    name: "Short Dispatch Release Summary",
    category: "Preflight",
    description: "Condensed flight release with release fuel, filed altitude, estimated times, and alternates.",
    example: "JPD/4122/19AUG^",
    terminator: "^",
  },
  "SLS*": {
    command: "SLS*",
    syntax: "SLS*/(AIRPORT)^",
    name: "Station Surface Weather & NOTAMs",
    category: "Preflight",
    description: "Pulls station METAR, TAF, field conditions, runway braking action reports, and field NOTAMs.",
    example: "SLS*/ORD^",
    terminator: "^",
  },
  RGMN: {
    command: "RGMN",
    syntax: "RGMN/(NOSE_OR_TAIL)^",
    name: "Aircraft Maintenance Status & Open MELs",
    category: "Preflight",
    description: "Displays open Minimum Equipment List (MEL) and Configuration Deviation List (CDL) items for an aircraft.",
    example: "RGMN/714^",
    terminator: "^",
  },
  FIL: {
    command: "FIL",
    syntax: "FIL/(FLT)/(DATE)^",
    name: "Flight Status & Location",
    category: "Preflight",
    description: "Displays live flight status, gate arrival/departure, in-range estimates, and delay codes.",
    example: "FIL/4122/19AUG^",
    terminator: "^",
  },

  // --- Commute & Pass Travel ---
  "26AAA": {
    command: "26AAA",
    syntax: "26AAA/(DEP)/(ARR)/(DATE)^",
    name: "Airline Master Schedule Listing",
    category: "Commute",
    description: "Lists all scheduled flights between city pairs with equipment types, departure, and arrival times.",
    example: "26AAA/ORD/DFW/19AUG^",
    terminator: "^",
  },
  "26B": {
    command: "26B",
    syntax: "26B/(FLT)/(DATE)^",
    name: "Flight Loads & Non-Rev Standby List",
    category: "Commute",
    description: "Displays seat availability (First/Main), authorized capacity, booked seats, and standby list priority.",
    example: "26B/4122/19AUG^",
    terminator: "^",
  },
  RF200: {
    command: "RF 200",
    syntax: "RF 200(STATION) HTL^",
    name: "Commuter Hotel Request",
    category: "Commute",
    description: "Requests contractual commuter hotel booking for assigned base or station.",
    example: "RF 200DFW HTL^",
    terminator: "^",
  },

  // --- Terminal Navigation & Cursor Controls ---
  MD: {
    command: "MD",
    syntax: "MD^",
    name: "Move Down (Next Page)",
    category: "Navigation",
    description: "Paginates forward to the next screen of multi-page displays.",
    example: "MD^",
    terminator: "^",
  },
  MU: {
    command: "MU",
    syntax: "MU^",
    name: "Move Up (Previous Page)",
    category: "Navigation",
    description: "Paginates backward to the previous screen of multi-page displays.",
    example: "MU^",
    terminator: "^",
  },
  Y: {
    command: "Y",
    syntax: "Y^",
    name: "More / Yes Confirmation",
    category: "Navigation",
    description: "Responds affirmatively to terminal prompt MORE? (ENTER Y) or confirmation dialogs.",
    example: "Y^",
    terminator: "^",
  },
  CTRL_HOME: {
    command: "CTRL_HOME",
    syntax: "CTRL_HOME",
    name: "Terminal Home (0, 0)",
    category: "TerminalControl",
    description: "Resets the 3270 cursor and Start-of-Message (SOM) pointer back to Row 0, Column 0.",
    example: "CTRL_HOME",
    terminator: "^",
  },
  SHIFT_DELETE: {
    command: "SHIFT_DELETE",
    syntax: "SHIFT_DELETE",
    name: "Clear Page (Erase Buffer)",
    category: "TerminalControl",
    description: "Clears the 3270 screen character buffer and resets cursor to (0, 0).",
    example: "SHIFT_DELETE",
    terminator: "^",
  },
  SHIFT_ENTER: {
    command: "SHIFT_ENTER",
    syntax: "SHIFT_ENTER",
    name: "Line Down (Advance SOM)",
    category: "TerminalControl",
    description: "Advances the cursor and SOM down 1 row below the current line without executing a command.",
    example: "SHIFT_ENTER",
    terminator: "^",
  },
};

// ============================================================================
// 2. FOS PAY STATUS CODES (ST 1-17)
// ============================================================================

export const FOS_PAY_STATUS_CODES: Record<string, string> = {
  "1": "Captain, Lineholder, Domestic",
  "2": "Captain, Reserve, Domestic",
  "3": "Captain Lineholder on a Reserve Day, Domestic",
  "4": "First Officer, Lineholder, Domestic",
  "5": "First Officer, Reserve, Domestic",
  "6": "Management / Flight Instructor",
  "7": "First Officer Lineholder on a Reserve Day, Domestic",
  "11": "Captain, Lineholder, International",
  "12": "Captain, Reserve, International",
  "13": "Captain Lineholder on a Reserve Day, International",
  "14": "First Officer, Lineholder, International",
  "15": "First Officer, Reserve, International",
  "17": "First Officer Lineholder on a Reserve Day, International",
};

// ============================================================================
// 3. FOS FLIGHT PREFIXES
// ============================================================================

export const FOS_FLIGHT_PREFIXES: Record<string, { type: "normal" | "deadhead" | "cancelled" | "removed" | "oal_deadhead"; description: string }> = {
  "-": { type: "normal", description: "Normal operating flight leg" },
  "D": { type: "deadhead", description: "Company Deadhead leg" },
  "C": { type: "cancelled", description: "Cancelled flight (protected pay)" },
  "X": { type: "removed", description: "Flight removed from sequence" },
  "*": { type: "oal_deadhead", description: "Other Airline (OAL) Deadhead" },
};

// ============================================================================
// 4. FOS REMOVAL CODES (RMV)
// ============================================================================

export const FOS_REMOVAL_CODES: Record<string, { printCode: string; description: string }> = {
  "VC": { printCode: "VACATION", description: "Scheduled Vacation" },
  "V6": { printCode: "VACDAY", description: "Single Vacation Day" },
  "VX": { printCode: "VACNOFLY", description: "Vacation (No Fly Status)" },
  "CV": { printCode: "CXLD VAC", description: "Cancelled Vacation" },
  "SK": { printCode: "SICK", description: "Paid Sick Leave" },
  "SX": { printCode: "UNPDSICK", description: "Unpaid Sick" },
  "US": { printCode: "UNPDSICK", description: "Unpaid Sick Leave" },
  "SC": { printCode: "SK CALIF", description: "California Sick Leave" },
  "SF": { printCode: "SKINTFAM", description: "Sick in Family" },
  "IF": { printCode: "INTFAML", description: "Intermittent Family Leave" },
  "FP": { printCode: "FATG PD", description: "Fatigue Removal (Paid)" },
  "FT": { printCode: "FATG", description: "Fatigue Removal (Unpaid/Standard)" },
  "CL": { printCode: "CL", description: "Company Closeout / Removal" },
  "SD": { printCode: "SEQDROP", description: "Sequence Dropped" },
  "DT": { printCode: "DRP TRP", description: "Dropped Trip" },
  "DV": { printCode: "DRP RSV", description: "Dropped Reserve Day" },
  "GA": { printCode: "GIVEAWAY", description: "Trip Giveaway / Trade" },
  "OE": { printCode: "OPT EXCH", description: "Option Exchange / Trade" },
  "SW": { printCode: "SKED WIRE", description: "Schedule Wire Change" },
  "SH": { printCode: "SKD CHG", description: "Schedule Change Removal" },
  "XX": { printCode: "CXDRMVL", description: "Cancelled Sequence Removal" },
  "XL": { printCode: "CXDNOREV", description: "Cancelled - No Revision" },
  "XR": { printCode: "CXDRMVL", description: "Cancelled Removal" },
  "DP": { printCode: "DISPD", description: "Displaced by Check Airman / Management" },
  "PD": { printCode: "DISPD", description: "Displaced" },
  "CH": { printCode: "CHG OVR", description: "Changeover Removal" },
  "AC": { printCode: "ACREFUSED", description: "Aircraft Refused" },
  "TO": { printCode: "TIMEDOUT", description: "FAR 117 / Duty Timed Out" },
  "EM": { printCode: "ACTOFGOD", description: "Act of God / Weather Emergency" },
  "CP": { printCode: "COMMUTER", description: "Commuter Policy Removal" },
  "30": { printCode: "30 HRS", description: "FAR 30 Hours in 7 Days Mandatory Rest" },
  "7D": { printCode: "7 DAYS", description: "7 Consecutive Days Mandatory Rest" },
  "V1": { printCode: "12 IN 24", description: "FAR 121.471 12 in 24 Rest Removal" },
  "V2": { printCode: "20 IN 48", description: "FAR 121.471 20 in 48 Rest Removal" },
  "V3": { printCode: "24 IN 72", description: "FAR 121.471 24 in 72 Rest Removal" },
  "V8": { printCode: "PART 121", description: "FAR Part 121 Legality Removal" },
  "TR": { printCode: "TRNG", description: "Training Removal" },
  "TF": { printCode: "FLT TRNG", description: "Flight Training" },
  "TG": { printCode: "GRND TRN", description: "Ground Training" },
  "ST": { printCode: "SIM TRNG", description: "Simulator Training" },
  "T1": { printCode: "SPL TRG", description: "Special Training Module 1" },
  "T2": { printCode: "SPL TRG", description: "Special Training Module 2" },
  "T3": { printCode: "SPL TRG", description: "Special Training Module 3" },
  "0G": { printCode: "INIT GS", description: "Initial Ground School" },
  "AG": { printCode: "TRANS GS", description: "Transition Ground School" },
  "UG": { printCode: "UPGRD GS", description: "Upgrade Ground School" },
  "RG": { printCode: "RECUR GS", description: "Recurrent Ground School" },
  "AI": { printCode: "AWTGIOE", description: "Awaiting Initial Operating Experience (IOE)" },
  "AQ": { printCode: "AWTGREQL", description: "Awaiting Requalification" },
  "BR": { printCode: "BEREAVMT", description: "Bereavement Leave" },
  "BU": { printCode: "BRUNPAID", description: "Bereavement Unpaid" },
  "JD": { printCode: "JD", description: "Jury Duty" },
  "ML": { printCode: "MIL LOA", description: "Military Leave of Absence" },
  "MR": { printCode: "MIL RQST", description: "Military Request" },
  "FC": { printCode: "FMLA", description: "Family Medical Leave Act" },
  "F6": { printCode: "FMLA V6", description: "FMLA Vacation Day" },
  "PL": { printCode: "PLOA", description: "Personal Leave of Absence" },
  "PE": { printCode: "PELOA", description: "Personal Emergency LOA" },
  "SL": { printCode: "SLOA", description: "Sick Leave of Absence" },
  "JI": { printCode: "IOD LOA", description: "Injury on Duty LOA" },
  "IS": { printCode: "INJURYSK", description: "Injury Sick Leave" },
  "MV": { printCode: "MV DAY", description: "Moving Day" },
  "UM": { printCode: "UNPD MV", description: "Unpaid Moving Day" },
  "WP": { printCode: "WITNESSP", description: "Company Witness (Paid)" },
  "WU": { printCode: "WITNESSU", description: "Witness (Unpaid)" },
  "AS": { printCode: "ASAP", description: "ASAP Program Removal" },
  "SP": { printCode: "SAFTYPRGM", description: "Safety Program Removal" },
  "MC": { printCode: "MISCON", description: "Misconnection" },
  "MT": { printCode: "MISSEDTRIP", description: "Missed Trip" },
  "LR": { printCode: "RPT LATE", description: "Report Late" },
  "LT": { printCode: "LATE4TR", description: "Late for Trip" },
  "MA": { printCode: "MISDASMT", description: "Missed Assignment" },
  "SS": { printCode: "SUSPEND", description: "Suspended" },
  "RL": { printCode: "RELEASED", description: "Released from Duty" },
};

// ============================================================================
// 5. FOS ADDITION CODES (ADD)
// ============================================================================

export const FOS_ADD_CODES: Record<string, { printCode: string; description: string }> = {
  "TF": { printCode: "TRNGFLT", description: "Training Flight Addition" },
  "EX": { printCode: "EXTENDED", description: "Extended Duty / Sequence Extension" },
  "RE": { printCode: "REPO", description: "Repositioning Flight" },
  "CE": { printCode: "CHG EQP", description: "Change of Equipment" },
  "JM": { printCode: "JUN MAN", description: "Junior Manned Assignment" },
  "DP": { printCode: "DISPD", description: "Displaced Assignment" },
  "CH": { printCode: "CHG OVR", description: "Changeover Addition" },
  "TR": { printCode: "TRNG", description: "Training Assignment" },
  "TY": { printCode: "TDY", description: "Temporary Duty Assignment" },
  "RA": { printCode: "RA", description: "Regular Assignment / Sequence Added" },
  "JP": { printCode: "JMEXPAY", description: "Junior Available / Extension Premium Pay" },
  "LT": { printCode: "LOT", description: "Lock Out / Open Time Award" },
  "BO": { printCode: "BIDOPEN", description: "Bid Open Time Trip Award" },
  "SH": { printCode: "SKD CHG", description: "Schedule Change Addition" },
  "MX": { printCode: "TST FLT", description: "Test Flight" },
  "FR": { printCode: "MX FERRY", description: "Maintenance Ferry Flight" },
  "SL": { printCode: "SPVDLNFL", description: "Supervised Line Flying" },
  "MA": { printCode: "NEW ASMT", description: "New Flight Assignment" },
  "MU": { printCode: "MAKE UP", description: "Make-Up Flying" },
  "OT": { printCode: "OVERTIME", description: "Overtime Flying Assignment" },
  "AR": { printCode: "CA AS FO", description: "Captain Flying in FO Seat" },
  "RF": { printCode: "RESERVE", description: "Reserve Availability / Assignment Addition" },
  "SM": { printCode: "SK MKUP", description: "Sick Make-Up Flying" },
  "TT": { printCode: "TT", description: "Trip Trade Addition" },
  "R1": { printCode: "RSV SLF", description: "Reserve Supervised Line Flying" },
  "LM": { printCode: "LOTRSV", description: "Lock Out Open Time for Reserve" },
  "SF": { printCode: "SUPFLY", description: "Supplemental Flying" },
  "CS": { printCode: "CRSKACCT", description: "Credit Sick Account" },
  "AV": { printCode: "AVAIL", description: "Available for Duty" },
  "OE": { printCode: "OPT EXCH", description: "Option Exchange Addition" },
  "SB": { printCode: "STANDBY", description: "Airport Standby Reserve Assignment" },
  "LI": { printCode: "LINECKTC", description: "Line Check Training Center Instructor" },
  "IN": { printCode: "IOEINSTR", description: "Initial Operating Experience Instructor" },
  "LX": { printCode: "LCSTUDNT", description: "Line Check Student" },
  "LC": { printCode: "LINECK", description: "Line Check Flight" },
  "IT": { printCode: "IOEINST", description: "IOE Instructor Flight" },
  "IE": { printCode: "IOE", description: "Initial Operating Experience" },
  "SW": { printCode: "SKEDWIRE", description: "Schedule Wire Addition" },
  "LR": { printCode: "NEWASGN", description: "New Assignment Addition" },
  "SD": { printCode: "SEQDROP", description: "Sequence Drop Adjustment" },
  "OO": { printCode: "TTOPTIME", description: "Trip Trade Open Time" },
};

// ============================================================================
// 6. FOS NON-FLIGHT MISCELLANEOUS PAY CREDITS
// ============================================================================

export const FOS_MISC_CREDITS: Record<string, string> = {
  "HOMSTUDY": "Home Study Training Pay (Credited to GRTR / GTTL)",
  "HOMESTUDY": "Home Study Training Pay (Credited to GRTR / GTTL)",
  "TRNGPAY": "Training Pay",
  "IOE INST": "IOE Instructor Premium Pay",
  "PERDIEM": "Domestic Expense Per Diem",
  "TPERDIEM": "Taxable Per Diem (Single-day sequence turns)",
  "ICPD PAY": "International City Per Diem Bonus",
  "SAABVGUR": "Special Assignment Above Guarantee Pay",
  "SATOWGUR": "Special Assignment Toward Guarantee Pay",
  "ADTOWGUR": "Additional Hours Toward Guarantee",
  "OTPREMCR": "Overtime Premium Credit Increase",
  "OTPREMDB": "Overtime Premium Debit",
  "JMEXPRCR": "Junior Manned / Extension Premium Credit",
  "JMEXPRDB": "Junior Manned / Extension Premium Debit",
  "PDVACADJ": "Paid Vacation Contractual Manual Adjustment",
  "SICKCRPD": "Paid Sick Credit",
  "SICKUNPD": "Unpaid Sick Credit",
  "SKREDUCT": "Sick Reduction",
  "PRKG PAY": "Parking Expense Reimbursement",
  "TRNSPORT": "Transportation / Ground Cab Pay",
  "DRUGTEST": "Drug Testing Pay",
  "TAXITIME": "Taxi Time Credit",
  "DB BIDLN": "Debit to Bidline",
  "CR BIDLN": "Credit / Increase to Bidline",
  "TRANSNDB": "Transition Debit to Bidline",
  "TRANSNCR": "Transition Credit to Bidline",
  "FINALPAY": "Final Pay Override",
  "GUAR": "Minimum Guarantee Override",
  "PRORATED": "Prorated Guarantee for partial month",
};

// ============================================================================
// 7. STRONGLY TYPED MACRO BUILDER
// ============================================================================

export class DecsMacroBuilder {
  /**
   * Generates Base Reserve List Display Command (N6D)
   * Syntax: N6D/(BASE)/(DATE)/(FLEET)/(SEAT)^
   * Example: N6D/ORD//E75/CA^ or N6D/ORD/19AUG/E75/CA^
   */
  static n6dReserveList(base: string = "ORD", date: string = "", seat: string = "CA", fleet: string = "E75"): string {
    const cleanBase = (base || "ORD").trim().toUpperCase();
    let cleanDate = (date || "").trim().toUpperCase();
    if (!cleanDate) {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      cleanDate = `${day}${months[now.getMonth()]}`;
    }
    const cleanSeat = (seat || "CA").trim().toUpperCase();
    const cleanFleet = (fleet || "E75").trim().toUpperCase();
    return `N6D/${cleanBase}/${cleanDate}/${cleanFleet}/${cleanSeat}^`;
  }

  /**
   * Alias for reserveList backward compatibility
   */
  static reserveList(base: string = "ORD", date: string = "", seat: string = "CA"): string {
    return DecsMacroBuilder.n6dReserveList(base, date, seat, "E75");
  }

  /**
   * Generates Monthly HI Schedule Command
   * Returns 'HI1^' for current month, 'HI2^' for next month.
   */
  static hiSchedule(monthType: "CURRENT" | "NEXT" = "CURRENT", empId?: string): string {
    const cmd = monthType === "NEXT" ? "HI2" : "HI1";
    return empId ? `${cmd}/${empId.trim()}^` : `${cmd}^`;
  }

  /**
   * Alias for pullSchedule backward compatibility
   */
  static pullSchedule(monthType: "CURRENT" | "NEXT" = "CURRENT"): string {
    return DecsMacroBuilder.hiSchedule(monthType);
  }

  /**
   * Generates Sequence Pairing Lookup Command (HSS)
   * Syntax: HSS/(BASE)/(DATE)/(SEQ)^ or HSS/(SEQ)^
   */
  static hssSequence(seq: string, date: string = "", base: string = "ORD"): string {
    const cleanSeq = seq.trim().toUpperCase();
    const cleanDate = date.trim().toUpperCase();
    const cleanBase = base.trim().toUpperCase();
    if (cleanBase && cleanDate) {
      return `HSS/${cleanBase}/${cleanDate}/${cleanSeq}^`;
    }
    return `HSS/${cleanSeq}^`;
  }

  /**
   * Generates Fit For Duty Sign-In Command (HIFIT)
   */
  static fitForDuty(seq: string, date: string, airport: string): string {
    return `HIFIT/${seq.trim().toUpperCase()}/${date.trim().toUpperCase()}/${airport.trim().toUpperCase()}^`;
  }

  /**
   * Generates Trip Sign-In Command (HIS)
   */
  static tripSignIn(empId: string): string {
    return `HIS/${empId.trim()}^`;
  }

  /**
   * Generates Reserve Proffer submission macro (HI31)
   */
  static profferReserve(rapList: string[]): string {
    const raps = rapList.map((r) => r.trim().toUpperCase()).join(" ");
    return `HI31^2^${raps}^Y^X^`;
  }

  /**
   * Generates Reserve Turnback List Command (HIHR)
   * Syntax: HIHR/(START_DATE)/(END_DATE)^
   * Example: HIHR/19AUG/25AUG^
   */
  static hihrTurnbackList(startDate: string, endDate: string = ""): string {
    const start = startDate.trim().toUpperCase();
    const end = (endDate || startDate).trim().toUpperCase();
    return `HIHR/${start}/${end}^`;
  }

  /**
   * Generates Commuter Hotel Request macro (RF 200)
   */
  static commuterHotel(station: string): string {
    const stn = station.trim().toUpperCase();
    return `RF 200${stn} HTL^`;
  }

  /**
   * Generates Sign Out command string (BSO)
   */
  static signOut(): string {
    return "BSO^";
  }

  /**
   * Generates Trip Trade macro string
   */
  static tripTrade(
    currentSeq: string,
    currentDate: string,
    desiredSeq: string,
    desiredDate: string,
    seat: string = "CA"
  ): string {
    const cSeq = currentSeq.trim().toUpperCase();
    const cDate = currentDate.trim().toUpperCase();
    const dSeq = desiredSeq.trim().toUpperCase();
    const dDate = desiredDate.trim().toUpperCase();
    const sSeat = seat.trim().toUpperCase();
    return `HIY^HT^HTS/A/${cSeq}/${cDate}^HTS/B/${dSeq}/${dDate}/${sSeat}^HTMD^HZ^HIN^`;
  }

  /**
   * Generates Open Time Pickup macro string
   */
  static openTimePickup(desiredSeq: string, date: string, seat: string = "CA"): string {
    const dSeq = desiredSeq.trim().toUpperCase();
    const dDate = date.trim().toUpperCase();
    const sSeat = seat.trim().toUpperCase();
    return `HIY^HT^HTO/B/${dSeq}/${dDate}/${sSeat}^HTMD^HZ^HIN^`;
  }

  /**
   * Generates Open Time Listing Command (N4D)
   */
  static openTime(base: string = "ORD", startDate: string = "", endDate: string = "", seat: string = "CA", fleet: string = "E75"): string {
    const sDate = startDate.trim().toUpperCase();
    const eDate = (endDate || startDate).trim().toUpperCase();
    return `N4D/${base.trim().toUpperCase()}/${fleet.trim().toUpperCase()}/${seat.trim().toUpperCase()}/${sDate}/${eDate}^`;
  }

  /**
   * Generates 1-Tap Login Macro Command
   */
  static decsLogin(empId: string = "742840", pass: string = "sara202"): string {
    return `//MQ^BSIP${empId.trim().toUpperCase()}^${pass.trim().toUpperCase()}^`;
  }
}

// Backward compatibility alias for PFKeyMacroBuilder
export const PFKeyMacroBuilder = DecsMacroBuilder;

// ============================================================================
// 8. HELPER LOOKUP FUNCTIONS
// ============================================================================

export function getFosPayStatusDescription(code: string | number): string {
  return FOS_PAY_STATUS_CODES[String(code).trim()] || `Status Code ${code}`;
}
export const getFosPayStatus = getFosPayStatusDescription;

export function getFosRemovalInfo(code: string): { printCode: string; description: string } {
  const clean = code.trim().toUpperCase();
  return FOS_REMOVAL_CODES[clean] || { printCode: clean, description: `Removal Code ${clean}` };
}
export const getFosRemovalDescription = getFosRemovalInfo;

export function getFosAddInfo(code: string): { printCode: string; description: string } {
  const clean = code.trim().toUpperCase();
  return FOS_ADD_CODES[clean] || { printCode: clean, description: `Add Code ${clean}` };
}
export const getFosAddDescription = getFosAddInfo;

export function getFosMiscCreditDescription(code: string): string {
  const clean = code.trim().toUpperCase();
  return FOS_MISC_CREDITS[clean] || clean;
}
export const getFosMiscCredit = getFosMiscCreditDescription;
