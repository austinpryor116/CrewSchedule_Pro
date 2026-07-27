/**
 * PFKeyMacroBuilder - DECS Terminal Chained Command Macro Generator
 * Delimits sequential inputs with `^E` (ENTER key token).
 */

export class PFKeyMacroBuilder {
  /**
   * Generates Fit for Duty sign-in string
   * Command: HIFIT/(sequence)/(date)/(airport)
   */
  static fitForDuty(sequenceNum: string, dateDDMMM: string, depAirport: string): string {
    const cleanSeq = sequenceNum.trim().toUpperCase();
    const cleanDate = dateDDMMM.trim().toUpperCase();
    const cleanDep = depAirport.trim().toUpperCase();
    return `HIFIT/${cleanSeq}/${cleanDate}/${cleanDep}`;
  }

  /**
   * Generates Trip Sign-In command string
   * Command: HIS/(empId)
   */
  static tripSignIn(empId: string): string {
    return `HIS/${empId.trim()}`;
  }

  /**
   * Generates Reserve Proffer submission macro
   * Command: HI31^E2^E(rapList.join(' '))^EY^EX^E
   */
  static profferReserve(rapList: string[]): string {
    const raps = rapList.map((r) => r.trim().toUpperCase()).join(" ");
    return `HI31^E2^E${raps}^EY^EX^E`;
  }

  /**
   * Generates Trip Trade macro string between two sequences
   * Command: HIY^EHT^EHTS/A/(currentSeq)/(currentDate)^EHTS/B/(desiredSeq)/(desiredDate)/(seat)^EHTMD^EHZ^EHIN^E
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
   * Command: HIY^EHT^EHTO/B/(desiredSeq)/(date)/(seat)^EHTMD^EHZ^EHIN^E
   */
  static openTimePickup(desiredSeq: string, date: string, seat: string = "CA"): string {
    const dSeq = desiredSeq.trim().toUpperCase();
    const dDate = date.trim().toUpperCase();
    const sSeat = seat.trim().toUpperCase();
    return `HIY^EHT^EHTO/B/${dSeq}/${dDate}/${sSeat}^EHTMD^EHZ^EHIN^E`;
  }

  /**
   * Generates Commuter Hotel Request macro
   * Command: RF 200(station) HTL^E
   */
  static commuterHotel(station: string): string {
    const stn = station.trim().toUpperCase();
    return `RF 200${stn} HTL^E`;
  }

  /**
   * Generates Sign Out command string
   * Command: BSO^E
   */
  static signOut(): string {
    return "BSO^E";
  }
}
