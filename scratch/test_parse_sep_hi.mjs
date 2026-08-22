import { parseRawSchedule, parseMonthlyHIMetadata } from '../src/lib/parser.ts';

const sepHiText = `
MONTH ENDING 30SEP26 AS OF 21AUG26/1924 SC-Y
PRYOR AR 01361 742840 ORD 441-CA E75E
DD ST RMV ADD SEQ FLT FLT SKED STTL ACT GRTR GTTL
01 1 24 0000 2400
02 1 24 0000 2400
03 1 24 0000 2400
04 1 18061 -4246 1.50
06 1 -4198 -3977 -3409 6.42
07 1 -3474 -3390 6.25 14.57
18061 EXP TAFB 66.13 TRI 4 CWA 3
08 1 24 0000 2400
09 1 24 0000 2400
10 1 24 0000 2400
11 1 17863 -3602 -4140 7.18
12 1 -3362 2.39
13 1 -3749 1.29
14 1 -3356 1.31 12.57
17863 EXP TAFB 65.22 AVP 3 ORD 2 CLE 1
END OF DISPLAY
`;

console.log("Monthly meta:", parseMonthlyHIMetadata(sepHiText));
const seqs = parseRawSchedule(sepHiText);
console.log("Parsed sequences count:", seqs.length);
seqs.forEach((s) => {
  console.log(`Seq #${s.sequenceNumber}: startDate=${s.startDate}, endDate=${s.endDate}, credit=${s.totalCreditMinutes}m, days=${s.dutyPeriods.length}, legs=${s.dutyPeriods.map(d => d.legs.map(l => l.flightNumber).join(',')).join(' | ')}`);
});
