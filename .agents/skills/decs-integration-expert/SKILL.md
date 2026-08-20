---
name: decs-integration-expert
description: Definitive expert guide on American Airlines / American Eagle DECS, FOS, WebSabre integration, 3270 state machine mechanics, Android WebView isolation, screen-wide line parsing, autonomous captures, and data decoders.
---

# DECS & FOS Host Terminal Integration Expert Guide

This document contains the definitive architectural rules, code patterns, and troubleshooting guides for DECS, FOS, WebSabre, and 3270 terminal integration in CrewSchedule Pro.

---

## 1. WebSabre Viewport & Canvas Isolation Rules (CRITICAL)

### The Problem
WebSabre / FOS is a legacy desktop web application containing navigation headers, sidebars, banners, iframes, and toolbars surrounding a 3270 terminal `<canvas>`. On a mobile device, rendering the unmodified web page causes the WebView to zoom out into desktop overview mode, displaying unnecessary website UI and making the terminal unreadable.

### Strict Rules to Maintain Screen Isolation:
1. **Never Remove `setInterval(applyDecsIsolation, 300)`**:
   - WebSabre dynamically creates, modifies, and re-renders canvas elements during navigation.
   - Isolation MUST be re-applied periodically (`setInterval(applyDecsIsolation, 300)`) to ensure the canvas remains pinned and isolated.
2. **WebView Settings for Terminal vs. SSO**:
   - **Login / SSO URLs** (`okta`, `ping`, `saml`, `sso`, `login`): Set `setLoadWithOverviewMode(true)` and `setUseWideViewPort(true)` so the authentication form fits comfortably.
   - **Terminal URLs** (`websabre`, `webfos`, `fos`, `decs`, `sabre`, or when `<canvas>` exists): Set `setLoadWithOverviewMode(false)` and `setUseWideViewPort(false)` with `setSupportZoom(true)`.
3. **Canvas Viewport Style Overrides**:
   - The `<canvas>` element must have:
     ```css
     position: fixed !important;
     top: 0px !important;
     left: 0px !important;
     width: 100vw !important;
     min-width: 100vw !important;
     max-width: 100vw !important;
     height: 100% !important;
     max-height: 100% !important;
     object-fit: contain !important;
     margin: 0px !important;
     padding: 0px !important;
     z-index: 2147483647 !important;
     background: #000000 !important;
     ```
4. **Hiding Surrounding UI Elements**:
   - Inject a global `<style id="csp-decs-isolated-style">`:
     ```css
     html, body {
       background-color: #000000 !important;
       margin: 0 !important;
       padding: 0 !important;
       overflow: hidden !important;
       width: 100vw !important;
       height: 100vh !important;
     }
     header, nav, footer, .header, .footer, .navbar, .nav-bar, #header, #footer, #nav, #navigation, .banner, .top-bar, .menu {
       display: none !important;
       visibility: hidden !important;
       height: 0px !important;
     }
     ```
   - Walk up from the canvas element to `document.body`, setting all sibling elements at each hierarchy level to `display: none !important; visibility: hidden !important; height: 0px !important;`.
5. **Viewport Meta Tag Injection**:
   ```javascript
   var meta = document.querySelector('meta[name="viewport"]');
   if (!meta) {
     meta = document.createElement('meta');
     meta.name = 'viewport';
     document.head.appendChild(meta);
   }
   meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes';
   ```

---

## 2. 3270 Screen Reading & Screen-Wide Line Detection

### The Bug & Lesson Learned
- **Bug**: Using `st.getString().slice(r * 80, (r+1) * 80)` failed because `st.getString()` often contains `\n` or `\r\n` characters. Character slicing drifted, causing the scanner to stop prematurely around row 5–6 when encountering divider asterisks (`*****`) or header text, placing the cursor mid-screen.
- **Rule**: When analyzing the terminal screen, ALWAYS evaluate the full 24 rows across all 80 columns.

### Correct Algorithm: `findLastLineAcrossEntireScreen()`
```javascript
window.findLastLineAcrossEntireScreen = function() {
  var st = window.sabreTerm;
  var numCols = 80;
  var numRows = 24;
  if (st && st.screen && st.screen.size) {
    if (st.screen.size.x) numCols = st.screen.size.x;
    if (st.screen.size.y) numRows = st.screen.size.y;
  }

  var screenLines = [];
  if (st && st.screen) {
    if (Array.isArray(st.screen.lines) && st.screen.lines.length > 0) {
      for (var i = 0; i < st.screen.lines.length; i++) {
        var rowObj = st.screen.lines[i];
        if (typeof rowObj === 'string') {
          screenLines.push(rowObj);
        } else if (rowObj && typeof rowObj.text === 'string') {
          screenLines.push(rowObj.text);
        } else if (rowObj && typeof rowObj.getString === 'function') {
          screenLines.push(rowObj.getString());
        }
      }
    } else if (typeof st.screen.getLineText === 'function') {
      for (var r = 0; r < numRows; r++) {
        screenLines.push(st.screen.getLineText(r) || '');
      }
    } else if (typeof st.screen.getLine === 'function') {
      for (var r2 = 0; r2 < numRows; r2++) {
        var lObj = st.screen.getLine(r2);
        screenLines.push(typeof lObj === 'string' ? lObj : (lObj && lObj.text ? lObj.text : ''));
      }
    }
  }

  if (screenLines.length === 0 && st && typeof st.getString === 'function') {
    var raw = st.getString() || '';
    if (raw.includes('\n')) {
      screenLines = raw.split(/\r?\n/);
    } else {
      for (var c = 0; c < numRows; c++) {
        screenLines.push(raw.slice(c * numCols, (c + 1) * numCols));
      }
    }
  }

  var lastRowWithText = 0;
  for (var rowIdx = 0; rowIdx < screenLines.length && rowIdx < numRows; rowIdx++) {
    var line = screenLines[rowIdx] || '';
    var clean = line.replace(/[\u0000\s]/g, '').trim();
    if (clean.length > 0) {
      lastRowWithText = rowIdx;
    }
  }

  var nextRow = lastRowWithText + 1;
  if (nextRow >= numRows) {
    nextRow = numRows - 1;
  }
  return { lastRowWithText: lastRowWithText, nextRow: nextRow, totalRows: numRows, totalCols: numCols };
};
```

---

## 3. Cursor & Start of Message (SOM) Manipulation

### 3270 Block Mode Rule
- In 3270 block mode, typing `MD` (or entering a command) while the cursor is inside an active text row causes a `‡FORMAT‡` error or overwrites existing data fields.
- **Rule**: ALWAYS place the cursor on the blank row immediately below the last line of text before typing `MD` or sending autonomous commands.

### Correct Algorithm: `positionCursorBelowLastLine()`
```javascript
window.positionCursorBelowLastLine = function() {
  var res = window.findLastLineAcrossEntireScreen();
  var targetRow = res.nextRow;
  var st = window.sabreTerm;
  if (st && st.screen) {
    var scr = st.screen;
    try {
      if (typeof scr.setCursor === 'function') scr.setCursor(0, targetRow);
      if (typeof scr.setSOM === 'function') scr.setSOM(0, targetRow);
      if (typeof scr.setCurrentLineCurrentColumn === 'function') scr.setCurrentLineCurrentColumn(0, targetRow);
      scr.currentLine = targetRow;
      scr.currentColumn = 0;
      if (typeof scr.showLineNumber === 'function') scr.showLineNumber();
    } catch(e) {}
  }
  // Dispatch synthetic mouse/pointer event on canvas
  var canvas = document.querySelector('canvas');
  if (canvas) {
    var rect = canvas.getBoundingClientRect();
    var cellH = rect.height / res.totalRows;
    var clickX = rect.left + 10;
    var clickY = rect.top + (targetRow * cellH) + (cellH / 2);
    var evOpts = { clientX: clickX, clientY: clickY, bubbles: true, cancelable: true };
    canvas.dispatchEvent(new MouseEvent('mousedown', evOpts));
    canvas.dispatchEvent(new MouseEvent('mouseup', evOpts));
    canvas.dispatchEvent(new MouseEvent('click', evOpts));
  }
  return targetRow;
};
```

---

## 4. Keystroke Emulation & Control Keys

### Keystroke Protocol
- Standard characters: Send ASCII char codes to `window.sabreTerm.keyPressed(code)`.
- `^` (Caret) represents `Enter` (KeyCode 13).
- Trailing Enter: If a command does not end with `/` or `^`, append KeyCode 13 (`st.keyPressed(13)`).
- Special Keys:
  - `SHIFT_ENTER` / `NEWLINE`: Advances cursor to `currentLine + 1` without sending data.
  - `CTRL_HOME` / `HOME`: Calls `st.home()`, `scr.setCursor(0,0)`, and resets SOM to `(0,0)`.
  - `SHIFT_DELETE` / `CLEAR` / `CLEAR_PAGE`: Calls `st.clearScreen()` / `scr.eraseScreen()`, clears input fields, and resets cursor to `(0,0)`.
  - `MD`: Calls `positionCursorBelowLastLine()`, sleeps 350ms, then types `M`, `D`, `Enter`.

---

## 5. Autonomous Multi-Page Capture Engines

### Protocol for HI1 / HI2 & HSS: `runAutonomousHiCapture(command)`
1. Position cursor below last line with `window.positionCursorBelowLastLine()`.
2. Type command (e.g. `HI1^`, `HSS 14731/15AUG/ORD^`).
3. Poll for screen change against initial screen (timeout ~4 seconds).
4. Wait for screen stability (`waitUntilStable(800)`).
5. Check if display is complete:
   - Check tokens: `BOTTOM OF`, `NO MORE DATA`, `END OF DISP`, `END F DISP`, `END OF SCROL`, `COMMAND COMPLETE`.
   - If screen shows `MORE? (ENTER Y)`, send `Y^` instead of `MD^`.
6. For each subsequent page (up to 30 pages max):
   - Position cursor below last line.
   - Send `MD^`.
   - Poll for content change. If no change, retry once after 1000ms.
   - If still no change or end-of-scroll detected, terminate pagination.
7. Concatenate all pages with `\n` and pass to native Android bridge (`window.AndroidPortal.onHiCaptureComplete`).

### Protocol for N6D Reserve Roster: `runAutonomousN6DCapture(command)`
1. Position cursor below last line.
2. Type `N6D/(BASE)/(DATE)/E75/(SEAT)^`.
3. Wait for `RESERVES DISPLAY` screen.
4. Check termination markers: `OTHERS`, `TOTAL AVAILABLE` + `AVAILABLE RSVS`, `BOTTOM OF`, `END OF DISP`, `NO MORE DATA`.
5. Page turn using `MD` with `positionCursorBelowLastLine()`.
6. When complete, dispatch to `AndroidPortal.onHiCaptureComplete` with `pages.length`.

---

## 6. DECS / FOS Layout Specifications & Code Dictionaries

### HI1 Monthly Activity Record Layout
- **Header Block**: Contract Month, Date As Of, Crewmember Name, Seniority, Employee ID, Crew Base, Bid Line, Equipment (`E175`, `E145`, `B737`), Phone Contacts.
- **Pay Accounting Block**: `GTD` (Greater Time to Date), `DEXP` (Domestic Per Diem), `IEXP` (International Per Diem), `GUAR` (Guarantee, 72h line / 75h reserve), `FLT TIME` (Actual flown), `ACT/SKD PROJ` (100h monthly limit projection), `YTD TL` (Year-to-date total).
- **Sick Banks**: `AVBL SK`, `YTD SK ACRL`, `SK USED MTD`, `LONG TERM SK AVAIL`, `SHORT TERM SICK PAYOUT ACCRUAL`.
- **Activity Table Columns**:
  - `(39) DD`: Day of month (1–31)
  - `(40) ST`: Pay Status Code (`1`=CA Dom, `2`=CA RSV, `4`=FO Dom, `5`=FO RSV, `11`=CA Intl, `14`=FO Intl)
  - `(41) RMV`: Removal code (`VC`, `SK`, `FP`, `FT`, `CL`, `SD`, `DT`, `GA`, `SW`, `SH`, `30`, `7D`, `V1`, `TR`, `ML`)
  - `(42) ADD`: Addition code (`TF`, `EX`, `RE`, `JM`, `DP`, `RA`, `JP`, `LT`, `BO`, `SH`, `MU`, `OT`, `RF`, `SB`, `LC`, `IE`)
  - `(43) SEQ`: Sequence # (e.g. `14731`), or activity code (`HOMSTUDY`, `S/B`, `RAP`, `DO`)
  - `(44) FLT`: Flight numbers with prefix (`-`=Operate, `D`=Deadhead, `C`=Cancelled, `*XX`=OAL Deadhead, `X`=Removed)
  - `(45) SKED`: Scheduled flight time
  - `(46) STTL`: Scheduled sequence total
  - `(47) ACT`: Actual flight time
  - `(48) GRTR`: Greater time for duty period
  - `(49) GTTL`: Greater total for sequence
  - `(50) EXP TAFB`: Time Away From Base per diem

### N6D Reserve Roster Columns
- Header: `[BASE] [EQP] [SEAT] RESERVES DISPLAY [DATE] AS OF [TIME] [DATE] [CATEGORY]`
- Pilot Row: `SEN NAME [DAY 1] [DAY 2] [DAY 3] [DAY 4] [DAY 5] [DAY 6] [DAY 7]`
- Status Tokens:
  - `24` / `RD`: Scheduled off day
  - `RAP1` (e.g. 05:00–17:00) / `RAP2` (e.g. 14:00–02:00): Reserve Availability Period
  - `SB` / `S/B`: Airport Standby
  - `[SEQ#]` (e.g. `14731`): Assigned flight sequence
  - `VC` / `SK` / `LOA`: Vacation, sick, or leave
- Reverse Seniority Callout: Highest seniority number (lowest relative seniority) is called first within each available RAP window.

---

## 7. Checklist for Modifying DECS / WebView Code

Before saving changes to `MainActivity.java` or terminal integration files:
- [ ] Is `setInterval(applyDecsIsolation, 300)` present in `isolateAndFitDecsCanvas()`?
- [ ] Are `setLoadWithOverviewMode(false)` and `setUseWideViewPort(false)` set for terminal pages?
- [ ] Does line detection scan all rows `0..23` without fixed character slicing?
- [ ] Is `positionCursorBelowLastLine()` called before any `MD` or macro command?
- [ ] Are non-terminal website wrappers (`header`, `nav`, `footer`, `navbar`) hidden via `#csp-decs-isolated-style`?
- [ ] Does the build compile without warnings and install cleanly on the Android device?
