/**
 * DECS COMMAND & PF KEY DICTIONARY (src/lib/decsDictionary.ts)
 * Strongly typed utility class PFKeyMacroBuilder returning formatted macro strings for DECS operations.
 */

export class PFKeyMacroBuilder {
  /**
   * Generates Fit for Duty sign-in macro string
   * Command: HIFIT/${seq}/${date}/${airport}
   */
  static fitForDuty(seq: string, date: string, airport: string): string {
    const cleanSeq = seq.trim().toUpperCase();
    const cleanDate = date.trim().toUpperCase();
    const cleanAirport = airport.trim().toUpperCase();
    return `HIFIT/${cleanSeq}/${cleanDate}/${cleanAirport}`;
  }

  /**
   * Generates Trip Trade macro string
   * Command: HIY^EHT^EHTS/A/${currentSeq}/${currentDate}^EHTS/B/${desiredSeq}/${desiredDate}/${seat}^EHTMD^EHZ^EHIN^E
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
    return `HIY^EHT^EHTS/A/${cSeq}/${cDate}^EHTS/B/${dSeq}/${dDate}/${sSeat}^EHTMD^EHZ^EHIN^E`;
  }

  /**
   * Generates Open Time Pickup macro string
   * Command: HIY^EHT^EHTO/B/${desiredSeq}/${date}/${seat}^EHTMD^EHZ^EHIN^E
   */
  static openTimePickup(desiredSeq: string, date: string, seat: string = "CA"): string {
    const dSeq = desiredSeq.trim().toUpperCase();
    const dDate = date.trim().toUpperCase();
    const sSeat = seat.trim().toUpperCase();
    return `HIY^EHT^EHTO/B/${dSeq}/${dDate}/${sSeat}^EHTMD^EHZ^EHIN^E`;
  }

  /**
   * Generates Monthly Schedule Pull command
   * Returns 'HI1' for 'CURRENT' month, 'HI2' for 'NEXT' month.
   */
  static pullSchedule(monthType: "CURRENT" | "NEXT" = "CURRENT"): string {
    return monthType === "NEXT" ? "HI2" : "HI1";
  }
}
