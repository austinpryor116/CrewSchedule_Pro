const regex = /^(SKD|ACT)\s+(\d{1,2})\s+([\w]{2})\s+(\d+)\s+([A-Z]{3})\s+(\d{4})(?:[#\*\+]?)\s+([A-Z]{3})\s+(\d{4})(?:[#\*\+]?)\s*(?:\d{1,2}\s+)?(?:(RA|OT)\s+)?([\d\.]+)\s*([A-Z]{2})?(?:\s+([\d\.]+))?(?:\s+([\d\.]+))?/;

const lines = [
  "SKD 24 54 3625 ORD 0800 LIT 0959 1.59 0.30",
  "SKD 12 MQ 3453 DFW 2350 ORD 01501 2.00 0.40", // Wait, if there is no space between 0150 and 1, \d{4} matches 0150, then \d{1,2} won't match 1 because \d{1,2} requires a space after it! Let's just make the space optional? No, if we make the space optional, it might bleed.
  "SKD 12 MQ 3453 DFW 2350 ORD 0150 1 2.00 0.40",
  "SKD 12 MQ 3453 DFW 2350 ORD 0150# 2.00 0.40",
  "SKD 12 MQ 3453 DFW 2350 ORD 0150* 2.00 0.40",
  "SKD 17 54 3712 ORD 1317 MQT 1548 OT 1.31MQ 0.33",
  "SKD 28 54 2740 ORD 1400 DFW 1600 2.20DH 0.40",
  "SKD 24 54 3695 DFW 2350 ORD 0150 25 2.50 0.30", // Matches arrival day 25
  "SKD 24 54 3695 DFW 2350 ORD 015025 2.50 0.30" // Matches arrival day 25 without space
];

for(const line of lines) {
  const match = line.match(regex);
  if(match) {
    console.log(`Line: ${line}`);
    console.log(`  flyStr: ${match[10]}`);
    console.log(`  deadheadCode: ${match[11]}`);
  } else {
    console.log(`Line FAILED: ${line}`);
  }
}
