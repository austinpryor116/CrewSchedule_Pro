import fs from 'fs';

// 1. Update src/lib/demoData.ts
let demoData = fs.readFileSync('src/lib/demoData.ts', 'utf8');

// Ensure import of USER_LIVE_SEQUENCES and USER_LOGBOOK_ENTRIES
if (!demoData.includes('USER_LIVE_SEQUENCES')) {
  demoData = `import { USER_LIVE_SEQUENCES, USER_LOGBOOK_ENTRIES } from "./userScheduleData";\n` + demoData;
}

// Replace MOCK_SEQUENCES definition
demoData = demoData.replace(
  /export const MOCK_SEQUENCES:\s*SequenceTrip\[\]\s*=\s*\[[\s\S]*?\];\n\nexport const RAW_DEMO_TEXT/m,
  `export const MOCK_SEQUENCES: SequenceTrip[] = USER_LIVE_SEQUENCES;\n\nexport const RAW_DEMO_TEXT`
);

// Replace DEFAULT_LOGBOOK_ENTRIES definition
demoData = demoData.replace(
  /export const DEFAULT_LOGBOOK_ENTRIES:\s*(?:import\("\.\.\/types"\)\.)?LogbookEntry\[\]\s*=\s*\[[\s\S]*?\];/m,
  `export const DEFAULT_LOGBOOK_ENTRIES: LogbookEntry[] = USER_LOGBOOK_ENTRIES;`
);

// Also remove duplicate MOCK_AUG_SEQUENCES if needed or keep it intact
fs.writeFileSync('src/lib/demoData.ts', demoData, 'utf8');
console.log('Updated src/lib/demoData.ts!');

// 2. Update src/store/useCrewStore.ts
let storeContent = fs.readFileSync('src/store/useCrewStore.ts', 'utf8');

if (!storeContent.includes('USER_LIVE_SEQUENCES')) {
  storeContent = storeContent.replace(
    `import { DEFAULT_PAY_RATES, DEFAULT_LOGBOOK_ENTRIES } from "../lib/demoData";`,
    `import { DEFAULT_PAY_RATES, DEFAULT_LOGBOOK_ENTRIES } from "../lib/demoData";\nimport { USER_LIVE_SEQUENCES, USER_LOGBOOK_ENTRIES } from "../lib/userScheduleData";`
  );
}

// Update DEFAULT_USER_PROFILE
storeContent = storeContent.replace(
  /export const DEFAULT_USER_PROFILE:\s*UserProfile\s*=\s*\{[\s\S]*?\};/m,
  `export const DEFAULT_USER_PROFILE: UserProfile = {
  name: "Austin Pryor",
  employeeId: "742840",
  seniorityNumber: "01361",
  base: "ORD",
  equipment: "E175",
  crewRole: "CA",
  hireDate: "2015-08-15",
  email: "austin.pryor@envoyair.com",
  phone: "(812) 399-2574",
  theme: "light",
  notificationsEnabled: true,
  syncCalendar: true,
  autoSyncEnabled: true,
  timezoneDisplay: "LOCAL",
};`
);

// Update hydrate() to fallback to USER_LIVE_SEQUENCES and USER_LOGBOOK_ENTRIES
storeContent = storeContent.replace(
  `let sanitizedSeqs = storedSeqs ? deduplicateSequences(JSON.parse(storedSeqs)) : [];`,
  `let sanitizedSeqs = storedSeqs ? deduplicateSequences(JSON.parse(storedSeqs)) : [];
      if (!sanitizedSeqs || sanitizedSeqs.length === 0) {
        sanitizedSeqs = USER_LIVE_SEQUENCES;
      }`
);

storeContent = storeContent.replace(
  `if (!parsedLogbook || parsedLogbook.length === 0) {
        parsedLogbook = DEFAULT_LOGBOOK_ENTRIES;
      }`,
  `if (!parsedLogbook || parsedLogbook.length === 0) {
        parsedLogbook = USER_LOGBOOK_ENTRIES;
      }`
);

fs.writeFileSync('src/store/useCrewStore.ts', storeContent, 'utf8');
console.log('Updated src/store/useCrewStore.ts!');
