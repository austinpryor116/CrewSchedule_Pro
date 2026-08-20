import { N6DPilotRecord, N6DPilotDayStatus, N6DDailySummary, N6DReservesData } from "../types";

/**
 * Parses raw text from DECS / FOS N6D Reserves Display command.
 * Header format: ORD E75 CAPT RESERVES DISPLAY 15AUG AS OF 1718 15AUG26 DOMESTIC
 * Columns: SEN NAME 15 16 17 18 19 20 21
 */
export function parseN6DReserves(rawText: string): N6DReservesData {
  let base = "ORD";
  let equipment = "E75";
  let seat: "CAPT" | "FO" = "CAPT";
  let category = "DOMESTIC";
  let asOfDate = "15AUG26";
  let asOfTime = "1718";
  let displayDays = [15, 16, 17, 18, 19, 20, 21];

  // Header extraction
  const headerMatch = rawText.match(
    /([A-Z]{3})\s+([A-Z0-9]+)\s+([A-Z]+)\s+RESERVES DISPLAY\s+(\d{1,2}[A-Z]{3})\s+AS OF\s+(\d{4})\s+(\d{1,2}[A-Z]{3}\d{2})/i
  );
  if (headerMatch) {
    base = headerMatch[1].toUpperCase();
    equipment = headerMatch[2].toUpperCase();
    seat = headerMatch[3].toUpperCase().includes("FO") ? "FO" : "CAPT";
    asOfTime = headerMatch[5];
    asOfDate = headerMatch[6].toUpperCase();
  }

  const catMatch = rawText.match(/\b(DOMESTIC|INTERNATIONAL|INTL)\b/i);
  if (catMatch) {
    category = catMatch[1].toUpperCase();
  }

  // Days header extraction
  const daysMatch = rawText.match(
    /SEN\s+NAME\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/i
  );
  if (daysMatch) {
    displayDays = [
      parseInt(daysMatch[1], 10),
      parseInt(daysMatch[2], 10),
      parseInt(daysMatch[3], 10),
      parseInt(daysMatch[4], 10),
      parseInt(daysMatch[5], 10),
      parseInt(daysMatch[6], 10),
      parseInt(daysMatch[7], 10),
    ];
  }

  // Strip page headers and pagination artifacts
  let cleaned = rawText.replace(/=== PAGE \d+ ===\s*/gi, "");
  cleaned = cleaned.replace(/[A-Z]{3}\s+[A-Z0-9]+\s+[A-Z]+\s+RESERVES DISPLAY.*?\n/gi, "");
  cleaned = cleaned.replace(/DOMESTIC.*?\n/gi, "");
  cleaned = cleaned.replace(/SEN\s+NAME.*?\n/gi, "");

  const rawBlocks = cleaned
    .split(/-{20,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const pilots: N6DPilotRecord[] = [];
  const dailySummaries: N6DDailySummary[] = [];
  const colStarts = [18, 24, 30, 36, 42, 48, 54];

  for (const b of rawBlocks) {
    // Check if this is the summary footer block
    if (b.includes("TOTAL AVAILABLE") || b.includes("AVAILABLE RSVS")) {
      const totM = b.match(/TOTAL AVAILABLE\s+([\d\s]+)/i);
      const rap1M = b.match(/RAP1\s+([\d\s]+)/i);
      const rap2M = b.match(/RAP2\s+([\d\s]+)/i);
      const othM = b.match(/OTHERS\s+([\d\s]+)/i);

      const tots = totM ? totM[1].trim().split(/\s+/).map((n) => parseInt(n, 10)) : [];
      const r1s = rap1M ? rap1M[1].trim().split(/\s+/).map((n) => parseInt(n, 10)) : [];
      const r2s = rap2M ? rap2M[1].trim().split(/\s+/).map((n) => parseInt(n, 10)) : [];
      const oths = othM ? othM[1].trim().split(/\s+/).map((n) => parseInt(n, 10)) : [];

      displayDays.forEach((d, idx) => {
        dailySummaries.push({
          day: d,
          totalAvailable: tots[idx] ?? 0,
          rap1Count: r1s[idx] ?? 0,
          rap2Count: r2s[idx] ?? 0,
          othersCount: oths[idx] ?? 0,
        });
      });
      continue;
    }

    const lines = b.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.length > 0);
    if (lines.length === 0) continue;

    // Seniority & Name
    const senMatch = b.match(/(\d{4})\s+([A-Z\s\-\.\/\']+?)(?:\s{2,}|\s+(?=\d{2}|\b[A-Z0-9]{4,}\b|\n|$))/i);
    const scMatch = b.match(/SC\s+(\d{6})/i);
    const projMatch = b.match(/PROJ\s+([\d\.]+)/i);
    const gtdMatch = b.match(/GTD\s+([\d\.]+)/i);
    const actMatch = b.match(/ACT\/SKD\s+([\d\.]+)/i);

    let sen = "0000";
    let name = "UNKNOWN";

    if (senMatch) {
      sen = senMatch[1];
      name = senMatch[2].split(/\r?\n/)[0].trim();
      name = name.replace(/\s+SC$/i, "").replace(/\s+\d{4,}$/, "").trim();
    } else if (lines[0] && /^\d{4}/.test(lines[0])) {
      const parts = lines[0].split(/\s+/);
      sen = parts[0];
      name = parts.slice(1).join(" ").trim();
    }

    // Skip non-pilot rows
    if (sen === "0000" && !scMatch) continue;

    const employeeId = scMatch ? scMatch[1] : "";
    const projHours = projMatch ? parseFloat(projMatch[1]) : 0;
    const gtdHours = gtdMatch ? parseFloat(gtdMatch[1]) : 0;
    const actSkdHours = actMatch ? parseFloat(actMatch[1]) : 0;

    // Extract Day Columns
    const daysStatus: Record<number, N6DPilotDayStatus> = {};

    displayDays.forEach((d, idx) => {
      const colStart = colStarts[idx] ?? (18 + idx * 6);
      const colEnd = colStart + 6;

      const tokens: string[] = [];
      lines.forEach((line) => {
        if (line.length > colStart) {
          const chunk = line.substring(colStart, Math.min(line.length, colEnd)).trim();
          if (chunk) {
            tokens.push(chunk);
          }
        }
      });

      let status: N6DPilotDayStatus["status"] = "OFF";
      let rapType: N6DPilotDayStatus["rapType"] = undefined;
      let rapWindow: string | undefined = undefined;
      let sequenceNumber: string | undefined = undefined;
      let code: string | undefined = undefined;
      let isAvailable = false;

      const tokenStr = tokens.join(" ");

      if (tokens.some((t) => t === "24" || t === "RD")) {
        status = "OFF";
        code = tokens.includes("24") ? "24" : "RD";
        isAvailable = false;
      } else if (tokens.includes("SK")) {
        status = "SK";
        code = "SK";
        isAvailable = false;
      } else if (
        tokens.some((t) =>
          ["VC", "V6", "VX", "PW", "BK", "UM", "MV", "NR", "TG", "TD", "CQ", "TRFF", "7D", "5G"].includes(t)
        )
      ) {
        status = "OTHER";
        code = tokens.find((t) =>
          ["VC", "V6", "VX", "PW", "BK", "UM", "MV", "NR", "TG", "TD", "CQ", "TRFF", "7D", "5G"].includes(t)
        );
        isAvailable = false;
      } else if (tokens.some((t) => t.includes("R04") || t.includes("1800"))) {
        status = "RAP";
        rapType = "RAP1";
        rapWindow = "0400-1800";
        code = "R0400";
        isAvailable = true;
      } else if (tokens.some((t) => t.includes("R12") || t.includes("2359"))) {
        status = "RAP";
        rapType = "RAP2";
        rapWindow = "1200-2359";
        code = "R1200";
        isAvailable = true;
      } else if (
        tokens.includes("SB") ||
        tokenStr.includes("STANDBY") ||
        (tokenStr.includes("0100") && tokenStr.includes("1700"))
      ) {
        status = "SB";
        rapType = "STANDBY";
        rapWindow = "0100-1700";
        code = "SB";
        isAvailable = true;
      } else if (tokens.includes("FLY") || tokens.some((t) => /^\d{5}$/.test(t))) {
        status = "FLY";
        const seqs = tokens.filter((t) => /^\d{5}$/.test(t));
        sequenceNumber = seqs[0];
        code = sequenceNumber ? `SEQ ${sequenceNumber}` : "FLY";
        isAvailable = false;
      } else if (tokens.length === 0) {
        // Empty on a reserve sheet indicates Available / Unassigned Reserve day
        status = "RAP";
        code = "RSV";
        isAvailable = true;
      } else {
        status = "OTHER";
        code = tokenStr;
        isAvailable = false;
      }

      daysStatus[d] = {
        day: d,
        status,
        rapType,
        rapWindow,
        sequenceNumber,
        code,
        rawText: tokenStr,
        isAvailable,
      };
    });

    pilots.push({
      seniority: sen,
      seniorityNum: parseInt(sen, 10) || 9999,
      name,
      employeeId,
      projHours,
      gtdHours,
      actSkdHours,
      days: daysStatus,
      rawBlock: b,
    });
  }

  // Deduplicate and merge pilot records across multi-page captures
  const uniquePilotsMap = new Map<string, N6DPilotRecord>();
  pilots.forEach((p) => {
    const key = p.employeeId ? `emp-${p.employeeId}` : `sen-${p.seniority}`;
    if (!uniquePilotsMap.has(key)) {
      uniquePilotsMap.set(key, p);
    } else {
      const existing = uniquePilotsMap.get(key)!;
      uniquePilotsMap.set(key, {
        ...existing,
        ...p,
        days: { ...existing.days, ...p.days },
      });
    }
  });

  const finalPilots = Array.from(uniquePilotsMap.values());
  finalPilots.sort((a, b) => a.seniorityNum - b.seniorityNum);

  return {
    base,
    equipment,
    seat,
    category,
    asOfDate,
    asOfTime,
    displayDays,
    pilots: finalPilots,
    dailySummaries,
    rawText,
    importedAt: new Date().toISOString(),
  };
}

/**
 * Raw default text from ORD E75 CAPT Reserves Display (15AUG26).
 */
export const DEFAULT_N6D_RAW_TEXT = `ORD    E75   CAPT  RESERVES DISPLAY  15AUG AS OF 1718  15AUG26
DOMESTIC
SEN  NAME         15    16    17    18    19    20    21
0565 REDITSCH CL
SC 211885
   PROJ  72.15    SK    SK    SK    SK    24    24    24
    GTD  50.38
 ACT/SKD 31.03
    ---------------------------------------------------
0737 JUAREZ-VILLAG      06742             06558
SC 255771         FLY                     06558       R1200
   PROJ  37.21                      24    OT    24    2359E
    GTD  28.51
 ACT/SKD 38.48
    ---------------------------------------------------
0845 KIDD MJ
SC 716366                     R0400
   PROJ  31.32    24    24    1800E
    GTD  31.32
 ACT/SKD 26.58
    ---------------------------------------------------
1080 SUNEKAER TB        06548
SC 261018         FLY
   PROJ  41.28                            24    24    24
    GTD  24.02
 ACT/SKD 31.21
    ---------------------------------------------------
1216 PATEL AR     06656 0100  0100  0100  06533
SC 799753         06656 1700  1700  1700  06533
   PROJ  46.41          SB    SB                      24
    GTD  15.59
 ACT/SKD 25.00
    ---------------------------------------------------
1558 RAAHAUGE AP
SC 713674
   PROJ  00.00    BK    BK    BK    BK    BK    BK
    GTD  00.00
 ACT/SKD 00.00
    ---------------------------------------------------
1624 O LAUGHLIN JD
SC 857026
   PROJ  70.12    PW    PW    PW    PW    PW    PW    24
    GTD  46.48
 ACT/SKD  8.59
    ---------------------------------------------------
1684 NICHOLSON BP             06572
SC 863770         06572 FLY
   PROJ  43.48                      24    24    24
    GTD  34.40
 ACT/SKD 33.07
    ---------------------------------------------------
1713 BOESE CM
SC 862680                     R1200
   PROJ  40.48    24    24    2359E
    GTD  40.48
 ACT/SKD 31.07
    ---------------------------------------------------
1843 LUBBA A      06714
SC 877552         1700
   PROJ  74.48          UM    UM    MV    24    24    RD
    GTD  43.36
 ACT/SKD 37.38
    ---------------------------------------------------
1867 STEVENS JR RD            06563
SC 877554         06563 06563
   PROJ  77.14    NR    NR    NR    24                NR
    GTD  40.15
 ACT/SKD 68.26
    ---------------------------------------------------
1868 WOOD CN
SC 877534                           R1200
   PROJ  41.19    24    24    24    2359E
    GTD  21.49
 ACT/SKD 17.56
    ---------------------------------------------------
1880 BYKER JD           15142
SC 841094         FLY
   PROJ  53.13    NR    NR          24    24    24    24
    GTD  35.29
 ACT/SKD 35.41
    ---------------------------------------------------
1881 WHITE GB
SC 841109                     R1200
   PROJ  35.20    24    24    2359E
    GTD  35.20
 ACT/SKD 27.40
    ---------------------------------------------------
1885 SEROCKI TD   06614
SC 322039                                 R0400
   PROJ  30.47          24    24    24    1800E
    GTD  30.47
 ACT/SKD 25.32
    ---------------------------------------------------
1886 PUKAZHENTHI S
SC 716994
   PROJ  86.27    TD    5G    5G    CQ    CQ    CQ    24
    GTD  42.36
 ACT/SKD 33.15
    ---------------------------------------------------
1937 WOO JC
SC 397381         FLY                                 R1200
   PROJ  39.13                RD    24    24    24    2359E
    GTD  22.33
 ACT/SKD 34.35
    ---------------------------------------------------
1938 HEINONEN TJ                                15021
SC 856335                                 15021       R1200
   PROJ  45.00    SK    SK    SK    24    OT    OT    2359E
    GTD  29.24
 ACT/SKD 25.59
    ---------------------------------------------------
1939 BALDWIN AM
SC 856789                     R1200
   PROJ  33.01    24    24    2359E
    GTD  29.07
 ACT/SKD 20.31
    ---------------------------------------------------
1940 EVERHART AG  06575                   06544
SC 876241         06575             R1200 06544
   PROJ  44.31          24    24    2359E
    GTD  34.06
 ACT/SKD 40.38
    ---------------------------------------------------
1941 SCOTT BR
SC 881242                     R0400
   PROJ  72.26    24    24    1800E                   24
    GTD  45.08
 ACT/SKD 38.01
    ---------------------------------------------------
2010 RODRIGUEZ P
SC 889127
   PROJ  65.14    VC    VC    VC    VC    VC    VC    VC
    GTD  37.56
 ACT/SKD 26.23
    ---------------------------------------------------
2015 JOHNS IV TD
SC 889112
   PROJ  58.45    24    24                            24
    GTD  31.27
 ACT/SKD 24.58
    ---------------------------------------------------
2018 KOLACEK KL   06576       14304
SC 889107               14304
   PROJ  58.33                      24    24    24
    GTD  31.14
 ACT/SKD 20.33
    ---------------------------------------------------
2023 GARCIA DL          06632
SC 889111         06632             R0400
   PROJ  38.11    OT    OT    24    1800E
    GTD  38.11
 ACT/SKD 47.24
    ---------------------------------------------------
2024 WILSON TB                06584
SC 889132         FLY   FLY                           R0400
   PROJ  44.51                      24    24    24    1800E
    GTD  27.17
 ACT/SKD 34.21
    ---------------------------------------------------
2028 SU C                                 06535
SC 891967                           R1200 06535
   PROJ  48.06    24    24    24    2359E
    GTD  26.06
 ACT/SKD 24.49
    ---------------------------------------------------
2062 MARKHAM JL   06647
SC 891970         1700                    R0400
   PROJ  27.36          24    24    24    1800E
    GTD  27.36
 ACT/SKD 20.08
    ---------------------------------------------------
2063 LENOCH MF                      06571
SC 891977         06571 FLY   FLY
   PROJ  51.49                                  24    24
    GTD  33.08
 ACT/SKD 56.34
    ---------------------------------------------------
2065 YOUNG JD     06643
SC 891988         0600
   PROJ  76.53          24    24    24    TD    TG    TRFF
    GTD  41.47
 ACT/SKD 34.33
    ---------------------------------------------------
2066 MCLEAN II WC             14474 06538
SC 892568         FLY   FLY         06538
   PROJ  64.40                            24    24    24
    GTD  47.50
 ACT/SKD 46.06
    ---------------------------------------------------
2069 REITZ C                  14732
SC 891824         FLY   FLY
   PROJ  37.12                      24    24    24
    GTD  37.12
 ACT/SKD 23.00
    ---------------------------------------------------
2107 CHOI J       0100  06605 06578
SC 857355         06605 06578
   PROJ  36.25    SB                      24    24    24
    GTD  33.56
 ACT/SKD 36.16
    ---------------------------------------------------
2108 JACKSON JM   06577                   14532
SC 858135               14532 FLY   FLY
   PROJ  74.18                                  24    24
    GTD  41.34
 ACT/SKD 36.49
    ---------------------------------------------------
2109 EMER NA      06631
SC 879792         0600
   PROJ  49.35          24    24    24    24    24    24
    GTD  49.35
 ACT/SKD 41.06
    ---------------------------------------------------
2110 GHAFFARI V   06541             06546
SC 895968               06546 FLY
   PROJ  36.20    OT                            24    24
    GTD  11.53
 ACT/SKD 19.35
    ---------------------------------------------------
2113 HERN CW      0601  0601  06600       06548
SC 896922         06600 FLY   06600       06548
   PROJ  48.06          FLY   FLY
    GTD  30.26
 ACT/SKD 32.27
    ---------------------------------------------------
2180 BRIDEN JR GK 06579 1700
SC 900823         06579 0900
   PROJ  35.02          SB                      24    24
    GTD  31.08
 ACT/SKD 38.35
    ---------------------------------------------------
2185 KRAUSE ED          1400
SC 900824               0600
   PROJ  41.27    24    SB                RD    24    24
    GTD  37.33
 ACT/SKD 23.21
    ---------------------------------------------------
2199 PHAM AP            1400
SC 899940               0600                          R0400
   PROJ  40.57    RD    SB          24    24    24    1800E
    GTD  29.15
 ACT/SKD 23.54
    ---------------------------------------------------
2208 SEBRANEK LA        1400                          06528
SC 899848               0600                          06528
   PROJ  57.57    24    SB                      7D    OT
    GTD  30.39
 ACT/SKD 28.21
    ---------------------------------------------------
2211 SHELTON NS
SC 899954                           R1200
   PROJ  51.29    24    24    24    2359E
    GTD  26.59
 ACT/SKD 35.44
    ---------------------------------------------------
2215 SMITH JE           1400        14238
SC 908398               0600  14238
   PROJ  34.29    24    SB    FLY   FLY         24    24
    GTD  20.00
 ACT/SKD 27.42
    ---------------------------------------------------
2217 AYALA DP
SC 908399                                 R0400
   PROJ  71.07    24    24    24    24    1800E
    GTD  16.31
 ACT/SKD  4.18
    ---------------------------------------------------
2218 PARSONS JR TL      1400        06604
SC 908400               0600        06604
   PROJ  48.06    24    SB    24    FLY         24    24
    GTD  28.06
 ACT/SKD 43.22
    ---------------------------------------------------
2221 GRANTHAM TK
SC 908386                                       R0400
   PROJ  41.28    24    24    24    24    24    1800E
    GTD  41.28
 ACT/SKD  9.07
    ---------------------------------------------------
TOTAL AVAILABLE   0000  0000  0020  0025  0032  0035  0038
AVAILABLE RSVS
RAP1              0000  0000  0003  0004  0005  0005  0004
RAP2              0000  0000  0000  0000  0000  0001  0000
OTHERS            0000  0000  0004  0003  0004  0000  0003
`;

export const DEFAULT_N6D_DATA: N6DReservesData = parseN6DReserves(DEFAULT_N6D_RAW_TEXT);
