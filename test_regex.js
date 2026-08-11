const tests = [
  '06 1 VC 15156 -3389 2.21',
  '09 1 VC X3587 X3475',
  '13 1 14731 -3602 -3602',
  '06 1 N1234 -3389',
  '09 1 VC D1234 -3389'
];

const reg1 = /(?:DRP\s+)?\b(\d{1,2})[a-z]?\s+1\s+(?:([A-Z]{2,4})\s+)?([A-Z]?\d{4,6})\b/i;
const reg2 = /(?:DRP\s+)?\b(\d{1,2})[a-z]?\s+1\s+(?:([A-Z]{2,4})\s+)?(?![DX-])([A-Z]?\d{4,6})\b/i;

console.log("OLD REGEX:");
for (const t of tests) {
  const m = t.match(reg1);
  console.log(t, "=>", m ? m[3] : "null");
}

console.log("\nNEW REGEX:");
for (const t of tests) {
  const m = t.match(reg2);
  console.log(t, "=>", m ? m[3] : "null");
}
