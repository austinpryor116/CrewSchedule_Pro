import { parseHI1Schedule, calculateSequenceCbaCredit } from "./src/lib/parser";

const sampleHI1Text = `
 01  1 VC      24     0000   2400                              ‡
 02  1 VC      24     0000   2400
 04  1 VC      24     0000   2400
 05  1 VC      24     0000   2400
 07F 1 VC            -3390  -3610  4.19
 08J 1 VC            -3524  X3362  4.16
                     X3340         5.01 15.57             15.57
DRP TRP  - SEE LEG DETAIL
 11  1         24     0000   2400
 12  1         24     0000   2400
 13T 1 14962         -3377         7.18
 14F 1               -3449  -3484
 15J 1               -3492  -3749  2.43
 16S 1               -3356         1.31 17.22
                                    ACT TOTAL  0.00LE  2
 17  1         24     0000   2400                              ‡
 18  1         24     0000   2400                              ‡
 19  1         24     0000   2400
 20T 1 14962         -3811         6.43
 21F 1               -3778  -3859  4.32
                     -3873  -3512  4.49
 23S 1               -3356  -3689
              14962 EXP TAFB  73.44 RIC  2 FSM  2 MAF  3
                                    ACT TOTAL  0.00
 25  1         24     0000   2400
 26  1         24     0000   2400
 27T 1 15101         -3771         4.48
 28F 1               -4330  -3559  2.29
 30S 1               -3673  -3552  3.20
                     -3552         5.49 16.26
                                    ACT TOTAL  0.00SO  3
END OF DISPLAY
`;

console.log("--- TESTING PARSER ON COMPLETE HI1 ROSTER ---");
const sequences = parseHI1Schedule(sampleHI1Text);

console.log(`Parsed ${sequences.length} sequence(s):`);
sequences.forEach((seq) => {
  const creditMins = calculateSequenceCbaCredit(seq, 300);
  const creditHrs = (creditMins / 60).toFixed(2);
  console.log(`Seq #${seq.sequenceNumber}: ${seq.startDate} to ${seq.endDate} | Duty Periods: ${seq.dutyPeriods.length} | Block: ${(seq.totalBlockMinutes/60).toFixed(2)} hrs | Credit: ${creditHrs} hrs`);
});

const seq14962 = sequences.find(s => s.sequenceNumber === "14962");
if (seq14962) {
  const creditMins = calculateSequenceCbaCredit(seq14962, 300);
  console.log(`\nSeq 14962 Verification: Credit = ${(creditMins / 60).toFixed(2)} hrs (Expected ~22.29 hrs)`);
} else {
  console.log("\nERROR: Seq 14962 was NOT found!");
}

const seq15101 = sequences.find(s => s.sequenceNumber === "15101");
if (seq15101) {
  console.log(`Seq 15101 Verification: Found on ${seq15101.startDate}!`);
} else {
  console.log("\nERROR: Seq 15101 on the 27th was NOT found!");
}
