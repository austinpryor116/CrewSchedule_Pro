import { PFKeyMacroBuilder as BaseBuilder } from "./decsDictionary";

/**
 * PFKeyMacroBuilder - DECS Terminal Chained Command Macro Generator
 * Delimits sequential inputs with `^E` (ENTER key token).
 */
export class PFKeyMacroBuilder extends BaseBuilder {
  /**
   * Generates Trip Sign-In command string
   * Command: HIS/(empId)^
   */
  static tripSignIn(empId: string): string {
    return `HIS/${empId.trim()}^`;
  }

  /**
   * Generates Reserve Proffer submission macro
   * Command: HI31^2^(rapList.join(' '))^Y^X^
   */
  static profferReserve(rapList: string[]): string {
    const raps = rapList.map((r) => r.trim().toUpperCase()).join(" ");
    return `HI31^2^${raps}^Y^X^`;
  }

  /**
   * Generates Commuter Hotel Request macro
   * Command: RF 200(station) HTL^
   */
  static commuterHotel(station: string): string {
    const stn = station.trim().toUpperCase();
    return `RF 200${stn} HTL^`;
  }

  /**
   * Generates Sign Out command string
   * Command: BSO^
   */
  static signOut(): string {
    return "BSO^";
  }
}

