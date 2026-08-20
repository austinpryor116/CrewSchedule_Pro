const fs = require('fs');

const seqs = JSON.parse(fs.readFileSync('scratch/generated_sequences.json', 'utf8'));
const openSeqs = JSON.parse(fs.readFileSync('scratch/generated_open_sequences.json', 'utf8'));

// Format layoverDescription for openSeqs
openSeqs.forEach(ot => {
  if (ot.layoverDescription) {
    ot.layoverDescription = ot.layoverDescription.replace(/\/+/g, ' / ').replace(/-+/g, ' • ').replace(/•\s*$/, '').trim();
    if (!ot.layoverDescription || ot.layoverDescription === '—') {
      ot.layoverDescription = 'Day Turn';
    }
  }
});

const fileContent = `// Auto-generated real schedule & logbook data from Austin Pryor's live HI1, HI2, and HSS files
import { SequenceTrip, LogbookEntry, VacationPeriod, OpenSequence } from "../types";

export const USER_LIVE_VACATIONS: VacationPeriod[] = [
  {
    id: "vac-2026-08-01-2026-08-07",
    startDate: "2026-08-01",
    endDate: "2026-08-07",
    code: "VC",
    description: "Scheduled Vacation Block (01AUG26 to 07AUG26)",
    creditHours: 35.0,
  }
];

export const USER_LIVE_SEQUENCES: SequenceTrip[] = ${JSON.stringify(seqs, null, 2)};

export const USER_LOGBOOK_ENTRIES: LogbookEntry[] = [
  {
    id: "log-20260813-3602",
    date: "2026-08-13",
    flightNumber: "AA3602",
    tailNumber: "N360AA",
    aircraftType: "E75E",
    depAirport: "ORD",
    arrAirport: "YUL",
    outTime: "1320",
    inTime: "1644",
    blockMinutes: 144,
    nightMinutes: 0,
    instrumentMinutes: 25,
    crossCountryMinutes: 144,
    picMinutes: 144,
    sicMinutes: 0,
    dualReceivedMinutes: 0,
    landingsDay: 1,
    landingsNight: 0,
    approaches: 1,
    remarks: "Regular assignment (RA) leg 1 ORD-YUL",
    isAutoFilled: true,
    sourceSequenceNumber: "14731",
    createdAt: "2026-08-15T19:24:00.000Z",
  },
  {
    id: "log-20260723-4151-1",
    date: "2026-07-23",
    flightNumber: "AA4151",
    tailNumber: "N415AA",
    aircraftType: "E75E",
    depAirport: "ORD",
    arrAirport: "MHK",
    outTime: "1428",
    inTime: "1606",
    blockMinutes: 98,
    nightMinutes: 0,
    instrumentMinutes: 15,
    crossCountryMinutes: 98,
    picMinutes: 98,
    sicMinutes: 0,
    dualReceivedMinutes: 0,
    landingsDay: 1,
    landingsNight: 0,
    approaches: 1,
    remarks: "ORD-MHK on-time actual block 1.6h",
    isAutoFilled: true,
    sourceSequenceNumber: "21566",
    createdAt: "2026-07-23T19:24:00.000Z",
  },
  {
    id: "log-20260723-4151-2",
    date: "2026-07-23",
    flightNumber: "AA4151",
    tailNumber: "N415AA",
    aircraftType: "E75E",
    depAirport: "MHK",
    arrAirport: "ORD",
    outTime: "1650",
    inTime: "1836",
    blockMinutes: 106,
    nightMinutes: 0,
    instrumentMinutes: 20,
    crossCountryMinutes: 106,
    picMinutes: 106,
    sicMinutes: 0,
    dualReceivedMinutes: 0,
    landingsDay: 1,
    landingsNight: 0,
    approaches: 1,
    remarks: "MHK-ORD actual block 1.8h",
    isAutoFilled: true,
    sourceSequenceNumber: "21566",
    createdAt: "2026-07-23T19:24:00.000Z",
  },
  {
    id: "log-20260706-3453-1",
    date: "2026-07-06",
    flightNumber: "AA3453",
    tailNumber: "N345AA",
    aircraftType: "E75E",
    depAirport: "ORD",
    arrAirport: "PVD",
    outTime: "0924",
    inTime: "1217",
    blockMinutes: 113,
    nightMinutes: 0,
    instrumentMinutes: 20,
    crossCountryMinutes: 113,
    picMinutes: 113,
    sicMinutes: 0,
    dualReceivedMinutes: 0,
    landingsDay: 1,
    landingsNight: 0,
    approaches: 1,
    remarks: "Seq 21649 Leg 1 ORD-PVD",
    isAutoFilled: true,
    sourceSequenceNumber: "21649",
    createdAt: "2026-07-06T19:24:00.000Z",
  },
  {
    id: "log-20260706-3453-2",
    date: "2026-07-06",
    flightNumber: "AA3453",
    tailNumber: "N345AA",
    aircraftType: "E75E",
    depAirport: "PVD",
    arrAirport: "ORD",
    outTime: "1302",
    inTime: "1428",
    blockMinutes: 146,
    nightMinutes: 0,
    instrumentMinutes: 20,
    crossCountryMinutes: 146,
    picMinutes: 146,
    sicMinutes: 0,
    dualReceivedMinutes: 0,
    landingsDay: 1,
    landingsNight: 0,
    approaches: 1,
    remarks: "Seq 21649 Leg 2 PVD-ORD",
    isAutoFilled: true,
    sourceSequenceNumber: "21649",
    createdAt: "2026-07-06T19:24:00.000Z",
  },
  {
    id: "log-20260706-3511",
    date: "2026-07-06",
    flightNumber: "AA3511",
    tailNumber: "N351AA",
    aircraftType: "E75E",
    depAirport: "ORD",
    arrAirport: "EVV",
    outTime: "1731",
    inTime: "1827",
    blockMinutes: 56,
    nightMinutes: 0,
    instrumentMinutes: 10,
    crossCountryMinutes: 56,
    picMinutes: 56,
    sicMinutes: 0,
    dualReceivedMinutes: 0,
    landingsDay: 1,
    landingsNight: 0,
    approaches: 1,
    remarks: "Seq 21649 Leg 3 ORD-EVV Layover",
    isAutoFilled: true,
    sourceSequenceNumber: "21649",
    createdAt: "2026-07-06T19:24:00.000Z",
  }
];

export const USER_LIVE_OPEN_SEQUENCES: OpenSequence[] = ${JSON.stringify(openSeqs, null, 2)};
`;

fs.writeFileSync('src/lib/userScheduleData.ts', fileContent, 'utf8');
console.log('Successfully updated src/lib/userScheduleData.ts!');
