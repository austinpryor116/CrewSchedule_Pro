# DECS Integration Architecture

This document outlines the architecture for interacting with the legacy DECS terminal in CrewSchedule Pro. Due to the asynchronous, screen-based nature of mainframe terminals, this integration relies on several strict patterns to prevent data loss or duplicate parsing.

## 1. Interaction Flow

The interaction between the user interface and DECS is managed through three primary layers:

1.  **Macro Engine & Screen Capture (`src/lib/keyboardSimEngine.ts`)**:
    *   This layer is responsible for simulating user keystrokes in the DECS webview.
    *   It uses `typeMacroOnDecsScreen` to dispatch characters one by one.
    *   It uses `waitForScreenChange` to intelligently poll the DOM for screen updates after hitting `Enter`, rather than relying on brittle, hardcoded delays.
    *   It handles multi-page outputs using `captureMultiPageDecsText`.

2.  **Text Parsers (`src/lib/parser.ts` & `src/lib/hssParser.ts`)**:
    *   This layer consists of pure functions that take raw DECS text strings and convert them into structured TypeScript objects (`SequenceTrip`, `DutyPeriod`, `FlightLeg`).
    *   `parseHI1Schedule`: Parses the high-level monthly calendar.
    *   `parseHssSchedule`: Parses the granular details of a specific sequence.

3.  **State Management (`src/store/useCrewStore.ts`)**:
    *   This layer merges the parsed objects into the application's Zustand store and persists them to localStorage.
    *   `mergeHssIntoSequence`: The critical function for hydrating a calendar sequence with its detailed duty periods.

## 2. Multi-Page Navigation (The `MD` vs `Y` Problem)

When pulling data that exceeds one screen, DECS behaves inconsistently depending on the command executed:

*   **HI1 Commands**: DECS typically displays the first page and requires the `MD` (Move Down) macro to fetch the next page.
*   **HSS Commands**: DECS often halts at the bottom of the first page with a `MORE? (ENTER Y)` or `MORE (Y/N)` prompt. In this state, it will **reject** the `MD` command.

**Implementation**: The `captureMultiPageDecsText` function dynamically scans the bottom of the screen. If it detects a `Y/N` prompt, it sends `Y^`. Otherwise, it defaults to `MD^`.

## 3. Parsing and Deduplication Rules

A common side-effect of DECS multi-page outputs is that it will overlap the screen. When moving to page 2, DECS might reprint the sequence header or the last few flight legs from page 1.

To prevent duplicated data:
*   **Headers**: `parseHssSchedule` tracks the current sequence being parsed. If it encounters a duplicate `SEQ XXXXX` header for the exact same sequence, it ignores it instead of splitting the sequence in half.
*   **Legs**: Before pushing an `SKD` flight leg into a duty period, the parser **must** deduplicate. It checks the `dayData.legs` array for an existing leg with the identical `flightNumber`, `depAirport`, and `depTime`.

## 4. Debugging

If sequences are failing to load or are duplicating flights:
1.  Check the `decs_debug.log` to see the raw text output captured from the webview.
2.  Verify whether DECS output an unexpected error message (e.g., "INVALID ENTRY") that tricked the screen wait logic into thinking the page successfully flipped.
3.  Ensure your macro is formatted correctly (e.g., `HSS/CA/14731/13AUG^`) with the trailing `^` representing the Enter key.
