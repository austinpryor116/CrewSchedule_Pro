/**
 * DECS COMMAND & PF KEY DICTIONARY (src/lib/decsDictionary.ts)
 * Strongly typed utility class PFKeyMacroBuilder returning formatted macro strings for DECS operations.
 */

export class PFKeyMacroBuilder {
  /**
   * Generates Fit for Duty sign-in macro string
   * Command: HIFIT/${seq}/${date}/${airport}^
   */
  static fitForDuty(seq: string, date: string, airport: string): string {
    const cleanSeq = seq.trim().toUpperCase();
    const cleanDate = date.trim().toUpperCase();
    const cleanAirport = airport.trim().toUpperCase();
    return `HIFIT/${cleanSeq}/${cleanDate}/${cleanAirport}^`;
  }

  /**
   * Generates Trip Trade macro string
   * Command: HIY^HT^HTS/A/${currentSeq}/${currentDate}^HTS/B/${desiredSeq}/${desiredDate}/${seat}^HTMD^HZ^HIN^
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
   * Command: HIY^HT^HTO/B/${desiredSeq}/${date}/${seat}^HTMD^HZ^HIN^
   */
  static openTimePickup(desiredSeq: string, date: string, seat: string = "CA"): string {
    const dSeq = desiredSeq.trim().toUpperCase();
    const dDate = date.trim().toUpperCase();
    const sSeat = seat.trim().toUpperCase();
    return `HIY^HT^HTO/B/${dSeq}/${dDate}/${sSeat}^HTMD^HZ^HIN^`;
  }

  /**
   * Generates Monthly Schedule Pull command
   * Returns 'HI1^' for 'CURRENT' month, 'HI2^' for 'NEXT' month.
   */
  static pullSchedule(monthType: "CURRENT" | "NEXT" = "CURRENT"): string {
    return monthType === "NEXT" ? "HI2^" : "HI1^";
  }

  /**
   * Generates DECS Quick Action Login Macro
   * Command: //mq^bsip${empId}^${pass}^
   */
  static decsLogin(empId: string = "742840", pass: string = "sara202"): string {
    const cleanId = empId.trim().toUpperCase();
    const cleanPass = pass.trim().toUpperCase();
    return `//MQ^BSIP${cleanId}^${cleanPass}^`;
  }
}
