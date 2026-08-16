/**
 * FOS (Flight Operating System) & DECS Code Dictionary
 * Sourced directly from official American Airlines / American Eagle Flight Operations Manuals:
 * - DOC_FLIGHT_AEPILOTS_FOS_Display_Guide_hi_info.pdf
 * - DOC_FltOps_BIDINFO_FOSCODES.pdf
 */

export interface FosCodeInfo {
  code: string;
  printCode: string;
  description: string;
  category: "removal" | "addition" | "misc_credit" | "pay_status" | "flight_prefix";
}

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

export const FOS_FLIGHT_PREFIXES: Record<string, { type: "normal" | "deadhead" | "cancelled" | "removed" | "oal_deadhead"; description: string }> = {
  "-": { type: "normal", description: "Normal operating flight leg" },
  "D": { type: "deadhead", description: "Company Deadhead leg" },
  "C": { type: "cancelled", description: "Cancelled flight (protected pay)" },
  "X": { type: "removed", description: "Flight removed from sequence" },
  "*": { type: "oal_deadhead", description: "Other Airline (OAL) Deadhead" },
};

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

export const FOS_MISC_CREDITS: Record<string, string> = {
  "HOMSTUDY": "Home Study Training Pay (Credited to GRTR / GTTL)",
  "HOMESTUDY": "Home Study Training Pay (Credited to GRTR / GTTL)",
  "TRNGPAY": "Training Pay",
  "IOE INST": "IOE Instructor Premium Pay",
  "PERDIEM": "Domestic Expense Per Diem",
  "TPERDIEM": "Taxable Per Diem (Single-day sequence turns)",
  "ICPD PAY": "International City Per Diem Bonus (Completed intl layover)",
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

/**
 * Returns human-readable description for a Pay Status code
 */
export function getFosPayStatus(code: string | number): string {
  return FOS_PAY_STATUS_CODES[String(code).trim()] || `Status Code ${code}`;
}

/**
 * Returns description for an RMV code
 */
export function getFosRemovalDescription(code: string): { printCode: string; description: string } {
  const clean = code.trim().toUpperCase();
  return FOS_REMOVAL_CODES[clean] || { printCode: clean, description: `Removal Code ${clean}` };
}

/**
 * Returns description for an ADD code
 */
export function getFosAddDescription(code: string): { printCode: string; description: string } {
  const clean = code.trim().toUpperCase();
  return FOS_ADD_CODES[clean] || { printCode: clean, description: `Add Code ${clean}` };
}

/**
 * Returns description for a Misc Credit code
 */
export function getFosMiscCredit(code: string): string {
  const clean = code.trim().toUpperCase();
  return FOS_MISC_CREDITS[clean] || clean;
}
