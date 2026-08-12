---
name: decs-integration-expert
description: Expert in the architecture, rules, and known bugs of the CrewSchedule Pro DECS terminal integration. Use this skill when interacting with DECS screen reading macros, multi-page data capture, or parsing raw aviation scheduling text (HI1, HSS).
---

# DECS Integration Expert

This skill outlines the critical patterns, invariants, and "gotchas" discovered while building the DECS automated screen-scraping integration for CrewSchedule Pro. 
**ALWAYS consult this document before modifying DECS capture macros or parsers.**

## Core Architecture

The integration has 3 distinct layers that must remain decoupled:
1. **Screen Capture & Macro Engine (`src/lib/keyboardSimEngine.ts`)**: Simulates user keystrokes into the DECS webview, waits for UI stabilization, and captures the raw text buffer.
2. **Text Parsing (`src/lib/parser.ts` & `hssParser.ts`)**: Pure functions that consume raw DECS text strings and emit typed JavaScript objects (`DutyPeriod`, `FlightLeg`, `SequenceTrip`).
3. **State Hydration (`src/store/useCrewStore.ts`)**: Merges the clean, parsed objects into the user's React state and localStorage.

---

## 🚨 Critical Rules & Known Bugs

### 1. Multi-Page Pagination: `MD` vs `Y` Commands
DECS displays long outputs across multiple pages, but different commands require different page-turn inputs.
- **HI1 (Monthly Rosters)**: Typically require `MD^` (Move Down) to paginate.
- **HSS (Sequence Details)**: Often halt at a `MORE? (ENTER Y)` prompt and require `Y^` to paginate. `MD^` is rejected on these screens.
- **Rule**: Your capture logic must dynamically inspect the bottom of the screen (e.g., `upperText.includes("MORE? (ENTER Y)")`) to determine whether to type `MD^` or `Y^`. Failing to do this results in premature timeouts and dropped days!

### 2. Overlapping Page Output & Duplicate Flights
When DECS flips to a new page, it often does not clear the screen entirely. It may reprint the header (e.g., `SEQ 14731`) or leave several lines of flights from the previous page at the top of the new page.
- **Rule for Headers**: Parsers MUST recognize when a sequence header matches the sequence currently being parsed and ignore it. Otherwise, you will split a 4-day sequence into two separate 2-day sequences!
- **Rule for Legs**: Parsers MUST rigidly deduplicate `SKD` flight legs (e.g., checking if `flightNumber`, `depAirport`, and `depTime` already exist for that `dayNum`) before adding them to the state. Failing to deduplicate causes doubled flights.

### 3. State Hydration Safety
- **Rule for Overwriting**: NEVER overwrite `sequences` or `dutyPeriods` with an empty array `[]` unless the user explicitly requested a deletion. 
- **Rule for Merging Monthly Schedules**: When a new HI1 roster is pulled (e.g. `importMonthlyHISchedule`), you must NOT blindly replace the `sequences` array. Sequences from other months (e.g. August sequences when pulling a July roster) must be preserved. You do this by extracting the `YYYY-MM` from the incoming sequences and filtering out the old sequences that belong to those specific months before merging.
- **Rule for Sequence Deduplication**: A `sequenceNumber` (e.g. `14731`) is NOT globally unique! Sequence numbers are reused every month. `deduplicateSequences` MUST use a composite key of `sequenceNumber + startDate` to prevent August trips from overwriting July trips with the same sequence number.
- **Rule for HSS Merging**: `mergeHssIntoSequence(sequenceNumber, parsedHss)` must match BOTH `sequenceNumber` and the `YYYY-MM` of the `startDate`. Matching on `sequenceNumber` alone will cause cross-month collisions where an August HSS pull overwrites a July trip's duty periods.

### 4. Smart Screen Waiting
DECS is a legacy mainframe that responds unpredictably. 
- Use the `waitForScreenChange` utility to poll the DOM for exact text diffs rather than relying on static `setTimeout` delays. 
- DECS might randomly flash an "INVALID ENTRY" warning. Make sure polling algorithms don't falsely identify small error messages as successful "next page" loads.

## Usage Checklist
When debugging DECS macro issues, check these in order:
1. Did the `keyboardSimEngine` send the right macro? (Check `decs_debug.log`)
2. Did the screen capture loop time out because it sent `MD` instead of `Y`?
3. Did the parser duplicate flights because DECS reprinted the previous page?
4. Did the parser truncate the sequence because it interpreted a reprinted `SEQ XXXXX` header as a brand new sequence?
