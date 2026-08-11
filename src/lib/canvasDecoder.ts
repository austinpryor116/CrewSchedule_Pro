/**
 * CANVAS BUFFER DECODER (src/lib/canvasDecoder.ts)
 * Parses captured 2D CanvasBuffer JSON array into a flat monospaced string matching WebSabre terminal screen layout.
 */

export interface CanvasCharacterAttributes {
  blink?: boolean;
  reverse?: boolean;
  color?: string;
  font?: string;
  [key: string]: any;
}

export interface CanvasCharacter {
  chr: string;
  CR?: boolean;
  x?: number;
  y?: number;
  col?: number;
  row?: number;
  attr?: CanvasCharacterAttributes;
}

export type CanvasBuffer = CanvasCharacter[][];

export class CanvasBufferDecoder {
  /**
   * Decodes captured 2D CanvasBuffer into a formatted monospaced terminal output string.
   * - Appends `chr` if present, or `" "` if missing.
   * - Appends `\n` newline when `CR: true` or at end of row.
   * - Trims trailing whitespace on rows.
   */
  static decode(buffer: CanvasBuffer): string {
    if (!buffer || !Array.isArray(buffer) || buffer.length === 0) {
      return "";
    }

    const lines: string[] = [];

    for (let r = 0; r < buffer.length; r++) {
      const row = buffer[r];
      if (!row || !Array.isArray(row)) {
        continue;
      }

      let lineStr = "";
      let hasCharInRow = false;
      let hasCR = false;

      const maxCol = row.length;

      for (let c = 0; c < maxCol; c++) {
        const charObj = row[c];

        if (charObj && typeof charObj.chr === "string" && charObj.chr !== "\x00" && charObj.chr !== "\u0000" && charObj.chr.charCodeAt(0) !== 0) {
          lineStr += charObj.chr;
          hasCharInRow = true;
          if (charObj.CR) {
            hasCR = true;
          }
        } else {
          lineStr += " ";
        }
      }

      // Trim trailing whitespace on row
      const trimmedLine = lineStr.replace(/\s+$/, "");

      if (trimmedLine.length > 0 || hasCharInRow || hasCR) {
        lines.push(trimmedLine);
      }
    }

    // Join all rows into flat monospaced string matching visual terminal
    return lines.join("\n").trim();
  }
}
