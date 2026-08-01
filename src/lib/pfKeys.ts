import { PFKeyMacroBuilder as BaseBuilder } from "./decsDictionary";

/**
 * PFKeyMacroBuilder - DECS Terminal Chained Command Macro Generator
 * Delimits sequential inputs with `^E` (ENTER key token).
 */
export class PFKeyMacroBuilder extends BaseBuilder {
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

