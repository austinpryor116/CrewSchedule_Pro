/**
 * ICLOUD CALENDAR & DISPLAY COLOR TEST SUITE (src/lib/testIcloudParser.ts)
 * Verifies parsing of iCloud webcal:// feeds, untitled events, RRULE recurrences,
 * and real-time display color updates in Zustand store.
 */

import { parseIcsText, fetchRemoteIcsFeed } from "./icalExporter";
import { useCrewStore } from "../store/useCrewStore";

async function runIcloudTest() {
  console.log("===============================================================");
  console.log("🍏 ICLOUD CALENDAR & COLOR PICKER TEST");
  console.log("===============================================================\n");

  let total = 0;
  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    total++;
    if (condition) {
      console.log(`✅ TEST ${total}: [PASS] ${name}`);
      if (detail) console.log(`   └─ ${detail}`);
      passed++;
    } else {
      console.error(`❌ TEST ${total}: [FAIL] ${name}`);
      if (detail) console.error(`   └─ ${detail}`);
      failed++;
    }
  }

  // 1. TEST ICLOUD ICS PARSING (WITH TZID, UNTITLED EVENT, RRULE)
  console.log("--- 1. Testing iCloud VEVENT Parsing with Parameters & Recurrence ---");

  const sampleIcloudIcs = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Apple Inc.//Mac OS X 10.15.7//EN
X-WR-CALNAME:iCloud Personal Schedule
BEGIN:VEVENT
UID:icloud-12345
DTSTART;TZID=America/Chicago:20260813T140000
DTEND;TZID=America/Chicago:20260813T160000
SUMMARY:Doctor Appointment
LOCATION:Medical Center Suite 400
END:VEVENT
BEGIN:VEVENT
UID:icloud-67890
DTSTART;VALUE=DATE:20260815
DTEND;VALUE=DATE:20260816
RRULE:FREQ=WEEKLY;UNTIL=20261001
SUMMARY:Weekly Standup
END:VEVENT
BEGIN:VEVENT
UID:icloud-untitled
DTSTART:20260820T090000Z
DTEND:20260820T100000Z
END:VEVENT
END:VCALENDAR
`;

  const parsedEvents = parseIcsText(sampleIcloudIcs, "cal-icloud-test", "teal");

  assert("Parsed iCloud event count > 0", parsedEvents.length > 0, `Total parsed events: ${parsedEvents.length}`);

  const docEvent = parsedEvents.find((e) => e.title === "Doctor Appointment");
  assert(
    "Parsed iCloud timed event Doctor Appointment (2026-08-13)",
    !!docEvent && docEvent.startDate === "2026-08-13" && docEvent.startTime === "14:00",
    `StartDate: ${docEvent?.startDate}, StartTime: ${docEvent?.startTime}`
  );

  const weeklyEvents = parsedEvents.filter((e) => e.title === "Weekly Standup");
  assert(
    "Expanded RRULE weekly recurring events for iCloud (count >= 5)",
    weeklyEvents.length >= 5,
    `Expanded instances: ${weeklyEvents.length}`
  );

  const untitledEvent = parsedEvents.find((e) => e.startDate === "2026-08-20");
  assert(
    "Handled untitled event fallback title ('Personal Calendar Event')",
    !!untitledEvent && untitledEvent.title === "Personal Calendar Event",
    `Title: '${untitledEvent?.title}'`
  );

  // 2. TEST STORE COLOR UPDATES
  console.log("\n--- 2. Testing Store updateSubscribedCalendarColor ---");

  useCrewStore.getState().addSubscribedCalendar({
    id: "cal-icloud-test",
    name: "iCloud Schedule",
    color: "teal",
    enabled: true,
    eventsCount: parsedEvents.length,
  }, parsedEvents);

  const initialEvt = useCrewStore.getState().personalEvents.find((e) => e.calendarId === "cal-icloud-test");
  assert("Initial event color is 'teal'", initialEvt?.color === "teal");

  // Change color to "rose"
  useCrewStore.getState().updateSubscribedCalendarColor("cal-icloud-test", "rose");

  const updatedCal = useCrewStore.getState().subscribedCalendars.find((c) => c.id === "cal-icloud-test");
  const updatedEvt = useCrewStore.getState().personalEvents.find((e) => e.calendarId === "cal-icloud-test");

  assert("Updated calendar feed color is 'rose'", updatedCal?.color === "rose");
  assert("Updated personal event color is 'rose'", updatedEvt?.color === "rose");

  console.log("\n===============================================================");
  console.log(`📊 FINAL TEST RESULTS: ${passed}/${total} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) process.exit(1);
}

runIcloudTest().catch((err) => {
  console.error("iCloud parser test error:", err);
  process.exit(1);
});
