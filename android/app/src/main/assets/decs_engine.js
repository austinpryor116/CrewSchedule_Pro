/**
 * DECS Terminal Isolation, 3270 State Machine & Screen Capture Engine
 * Sourced directly from .agents/skills/decs-integration-expert/SKILL.md
 *
 * Standalone asset injected into the WebSabre WebView by MainActivity.
 * All logic runs directly inside the WebView context with full access to window.sabreTerm.
 */

(function () {
  console.log('[DECS_ENGINE] Initializing DECS Terminal Engine v3.2 (Down 1 Full Line SOM Positioning)...');

  /**
   * Section 1: DOM & Viewport Isolation
   */
  function applyDecsIsolation() {
    var canvas = document.querySelector('canvas');
    if (!canvas) return;

    var styleId = 'csp-decs-isolated-style';
    var style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      style.textContent =
        'html, body {' +
        '  background-color: #000000 !important;' +
        '  margin: 0 !important;' +
        '  padding: 0 !important;' +
        '  overflow: hidden !important;' +
        '  width: 100vw !important;' +
        '  height: 100vh !important;' +
        '}' +
        'canvas {' +
        '  position: fixed !important;' +
        '  top: 0px !important;' +
        '  left: 0px !important;' +
        '  width: 100vw !important;' +
        '  min-width: 100vw !important;' +
        '  max-width: 100vw !important;' +
        '  height: 100% !important;' +
        '  max-height: 100% !important;' +
        '  object-fit: contain !important;' +
        '  margin: 0px !important;' +
        '  padding: 0px !important;' +
        '  z-index: 2147483647 !important;' +
        '  background: #000000 !important;' +
        '}' +
        'header, nav, footer, .header, .footer, .navbar, .nav-bar, #header, #footer, #nav, #navigation, .banner, .top-bar, .menu {' +
        '  display: none !important;' +
        '  visibility: hidden !important;' +
        '  height: 0px !important;' +
        '  overflow: hidden !important;' +
        '}';
      document.head.appendChild(style);
    }

    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      document.head.appendChild(meta);
    }
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes';

    canvas.style.setProperty('position', 'fixed', 'important');
    canvas.style.setProperty('top', '0px', 'important');
    canvas.style.setProperty('left', '0px', 'important');
    canvas.style.setProperty('width', '100vw', 'important');
    canvas.style.setProperty('min-width', '100vw', 'important');
    canvas.style.setProperty('max-width', '100vw', 'important');
    canvas.style.setProperty('height', '100%', 'important');
    canvas.style.setProperty('max-height', '100%', 'important');
    canvas.style.setProperty('object-fit', 'contain', 'important');
    canvas.style.setProperty('z-index', '2147483647', 'important');
    canvas.style.setProperty('background', '#000000', 'important');

    var current = canvas.parentElement;
    while (current && current !== document.body) {
      var siblings = current.parentElement ? current.parentElement.children : [];
      for (var s = 0; s < siblings.length; s++) {
        var sib = siblings[s];
        if (sib !== current && sib.tagName !== 'SCRIPT' && sib.tagName !== 'STYLE') {
          sib.style.setProperty('display', 'none', 'important');
          sib.style.setProperty('visibility', 'hidden', 'important');
          sib.style.setProperty('height', '0px', 'important');
        }
      }
      current.style.setProperty('background', '#000000', 'important');
      current.style.setProperty('margin', '0px', 'important');
      current.style.setProperty('padding', '0px', 'important');
      current.style.setProperty('width', '100%', 'important');
      current.style.setProperty('height', '100%', 'important');
      current = current.parentElement;
    }
  }

  // Initial isolation and recurring enforcement
  applyDecsIsolation();
  setInterval(applyDecsIsolation, 300);

  /**
   * Helper: Promise sleep
   */
  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Reads the active visible screen text from WebSabre terminal
   */
  function getTerminalScreenText() {
    var st = window.sabreTerm;
    if (st && typeof st.getString === 'function') {
      return st.getString() || '';
    }
    if (window.WebSabre && typeof window.WebSabre.getScreenText === 'function') {
      return window.WebSabre.getScreenText() || '';
    }
    if (document.body) {
      return document.body.innerText || '';
    }
    return '';
  }

  /**
   * Section 2: Position Cursor Below Last Line
   * Advances strictly down 1 line from where the host output finished to land on the blank row below.
   */
  window.positionCursorBelowLastLine = function () {
    var st = window.sabreTerm;
    var numRows = 24;

    if (st && st.screen) {
      var scr = st.screen;
      if (st.screen.size && st.screen.size.y) numRows = st.screen.size.y;

      var curLine = (typeof scr.currentLine === 'number') ? scr.currentLine : 0;

      // Always advance 1 line down to land cleanly on the blank row below the last line
      var targetLine = Math.min(curLine + 1, numRows - 1);

      try {
        if (typeof scr.setCursor === 'function') scr.setCursor(0, targetLine);
        if (typeof scr.setSOM === 'function') scr.setSOM(0, targetLine);
        if (typeof scr.setCurrentLineCurrentColumn === 'function') scr.setCurrentLineCurrentColumn(0, targetLine);
        scr.currentLine = targetLine;
        scr.currentColumn = 0;
        if (typeof scr.showLineNumber === 'function') scr.showLineNumber();
        console.log('[DECS_ENGINE] Advanced cursor down to SOM (0, ' + targetLine + ') from original curLine ' + curLine);
      } catch (e) {
        console.warn('[DECS_ENGINE] Error setting cursor:', e);
      }

      return targetLine;
    }
    return 0;
  };

  /**
   * Section 3: Keyboard & Command Simulation
   */
  window.sendDecsKey = function (cmd) {
    if (window.sabreTerm && window.sabreTerm.screen) {
      var st = window.sabreTerm;
      var scr = st.screen;

      // 1. Shift+Enter / Newline -> Move cursor and SOM down 1 line
      if (cmd === 'SHIFT_ENTER' || cmd === 'NEWLINE') {
        var nextRow = (scr.currentLine + 1 < scr.size.y) ? (scr.currentLine + 1) : 0;
        scr.setCursor(0, nextRow);
        scr.setSOM(0, nextRow);
        scr.setCurrentLineCurrentColumn(0, nextRow);
        scr.showLineNumber();
        return;
      }

      // 2. Ctrl+Home -> Reset terminal cursor and SOM to (0, 0)
      if (cmd === 'CTRL_HOME' || cmd === 'HOME') {
        var target = document.querySelector('canvas') || document.activeElement || document.body;
        var evOpts = { key: 'Home', code: 'Home', keyCode: 36, which: 36, ctrlKey: true, bubbles: true, cancelable: true };
        target.dispatchEvent(new KeyboardEvent('keydown', evOpts));
        target.dispatchEvent(new KeyboardEvent('keyup', evOpts));

        if (scr) {
          try {
            scr.setCursor(0, 0);
            scr.setSOM(0, 0);
            scr.setCurrentLineCurrentColumn(0, 0);
            scr.showLineNumber();
          } catch (e) {}
        }
        return;
      }

      // 3. Ctrl+Backspace -> Clear terminal screen buffer & reset SOM
      if (cmd === 'CTRL_BACKSPACE' || cmd === 'BACKSPACE' || cmd === 'SHIFT_DELETE' || cmd === 'CLEAR') {
        var target2 = document.querySelector('canvas') || document.activeElement || document.body;
        
        // Dispatch Ctrl+Backspace
        var bsOpts = { key: 'Backspace', code: 'Backspace', keyCode: 8, which: 8, ctrlKey: true, bubbles: true, cancelable: true };
        target2.dispatchEvent(new KeyboardEvent('keydown', bsOpts));
        target2.dispatchEvent(new KeyboardEvent('keyup', bsOpts));

        // Also dispatch Delete for emulator compatibility
        var delOpts = { key: 'Delete', code: 'Delete', keyCode: 46, which: 46, shiftKey: true, ctrlKey: true, bubbles: true, cancelable: true };
        target2.dispatchEvent(new KeyboardEvent('keydown', delOpts));
        target2.dispatchEvent(new KeyboardEvent('keyup', delOpts));

        if (scr) {
          try {
            if (typeof scr.clearScreen === 'function') scr.clearScreen();
            if (typeof scr.eraseEOF === 'function') scr.eraseEOF();
            scr.setCursor(0, 0);
            scr.setSOM(0, 0);
            scr.setCurrentLineCurrentColumn(0, 0);
            scr.showLineNumber();
          } catch (e) {}
        }

        var inp = document.getElementById('sabreInput') || document.querySelector('input');
        if (inp) {
          inp.value = '';
        }
        return;
      }

      // 4. Standard string input (characters + Enter)
      for (var i = 0; i < cmd.length; i++) {
        var ch = cmd[i];
        if (ch === '^') {
          st.keyPressed(13);
        } else {
          st.keyPressed(ch.charCodeAt(0));
        }
      }

      if (!cmd.endsWith('/') && !cmd.endsWith('^')) {
        st.keyPressed(13);
      }
      return;
    }

    // Fallback for DOM input if emulator object is not yet bound
    var domInput = document.getElementById('sabreInput') || document.querySelector('input');
    if (domInput) {
      domInput.value = cmd;
      domInput.dispatchEvent(new Event('input', { bubbles: true }));
      domInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      domInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }
  };

  /**
   * Normalizes screen text for comparison:
   * Strips out local command echoes (e.g. 'MD', 'Y', 'SHIFT_ENTER') so typed characters
   * are never mistakenly detected as a new page from the host.
   */
  function normalizeScreenBody(rawText) {
    if (!rawText) return '';
    var lines = rawText.split(/\r?\n/);
    var cleanLines = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].replace(/[\u0000]/g, '').trimEnd();
      var trimmed = l.trim().toUpperCase();
      // Ignore standalone typed command rows or cursor line artifacts
      if (trimmed === 'MD' || trimmed === 'Y' || trimmed.startsWith('MD^') || trimmed.startsWith('Y^') || trimmed === 'SHIFT_ENTER') {
        continue;
      }
      if (trimmed.length > 0) {
        cleanLines.push(trimmed);
      }
    }
    return cleanLines.join('\n');
  }

  /**
   * Section 4: Screen Stability & Full-Load Verification Engine
   */
  window._decsCaptureAborted = false;

  window.stopAutonomousCapture = function () {
    console.log('[DECS_ENGINE] 🛑 EMERGENCY STOP SIGNAL RECEIVED! Halting all active capture routines.');
    window._decsCaptureAborted = true;
    try {
      if (window.sabreTerm && window.sabreTerm.screen) {
        window.positionCursorBelowLastLine();
      }
    } catch (e) {}
    return true;
  };

  async function waitForScreenLoadedAndSettled(previousScreenText, maxWaitMs, minChars) {
    minChars = minChars || 30;
    maxWaitMs = maxWaitMs || 7500;
    var normPrev = normalizeScreenBody(previousScreenText);
    var startTime = Date.now();
    var lastObservedNorm = '';
    var stableCount = 0;

    // Allow host initial transmission time
    await sleep(400);

    while (Date.now() - startTime < maxWaitMs) {
      if (window._decsCaptureAborted) {
        console.log('[DECS_ENGINE] 🛑 waitForScreenLoadedAndSettled aborted by user!');
        return { success: false, text: getTerminalScreenText(), settled: false, aborted: true };
      }

      await sleep(150);

      var rawCurrent = getTerminalScreenText();
      var normCurrent = normalizeScreenBody(rawCurrent);
      var cleanLen = normCurrent.replace(/[\s]/g, '').length;

      // Must have actual content AND the normalized body must be DIFFERENT from previous page
      if (cleanLen >= minChars && normCurrent !== normPrev) {
        if (normCurrent === lastObservedNorm) {
          stableCount++;
          // Screen text has remained identical across 2 consecutive checks -> fully loaded!
          if (stableCount >= 2) {
            return { success: true, text: rawCurrent, settled: true };
          }
        } else {
          lastObservedNorm = normCurrent;
          stableCount = 1;
        }
      } else {
        stableCount = 0;
      }
    }

    // Timeout: Host did not deliver a new page
    var fallback = getTerminalScreenText();
    var fallbackNorm = normalizeScreenBody(fallback);
    var isDiff = (fallbackNorm !== normPrev) && (fallbackNorm.length >= minChars);
    return { success: isDiff, text: fallback, settled: false };
  }

  /**
   * Section 5: Autonomous Multi-Page Capture for HI1, HI2, HSS, N6D, and Generic DECS Displays
   */
  window.runAutonomousHiCapture = function (hiCommand) {
    window._decsCaptureAborted = false; // Reset abort flag on new capture
    return new Promise(function (resolve) {
      var st = window.sabreTerm;
      if (!st || !st.screen) {
        resolve({ success: false, text: '', pages: 0, error: 'WebSabre not ready' });
        return;
      }

      var isHss = hiCommand.toUpperCase().startsWith('HSS');
      var isN6d = hiCommand.toUpperCase().startsWith('N6D');
      var maxPages = isN6d ? 25 : 20;

      function isFinished(text) {
        if (!text) return false;
        var upper = text.toUpperCase();

        if (isHss && (upper.includes('TAFB') || upper.includes('TAXABLE EXP') || upper.includes('TAXABLE'))) {
          return true;
        }

        return upper.includes('BOTTOM OF') ||
               upper.includes('NO MORE DATA') ||
               upper.includes('END OF DISP') ||
               upper.includes('END F DISP') ||
               upper.includes('END OF DISPLAY') ||
               upper.includes('END OF SCROL') ||
               upper.includes('ENDOF SCROL') ||
               upper.includes('NO MORE SCROLL') ||
               upper.includes('COMMAND COMPLETE') ||
               upper.includes('LAST PAGE') ||
               upper.includes('TO PICKUP ONE OF THESE SEQUENCES') ||
               upper.includes('IN YOUR PERSONAL MODE') ||
               upper.includes('NO MORE');
      }

      (async function () {
        if (window._decsCaptureAborted) {
          resolve({ success: false, text: '', pages: 0, error: 'Aborted by user' });
          return;
        }

        var initialScreen = getTerminalScreenText();

        // 1. Position cursor below any leftover text before typing command
        window.positionCursorBelowLastLine();
        await sleep(200);

        if (window._decsCaptureAborted) {
          resolve({ success: false, text: '', pages: 0, error: 'Aborted by user' });
          return;
        }

        // 2. Send primary command
        console.log('[DECS_ENGINE] Dispatching primary command: ' + hiCommand);
        window.sendDecsKey(hiCommand);

        // 3. Wait for Page 1 to be fully loaded and settled
        var page1Result = await waitForScreenLoadedAndSettled(initialScreen, 7000, 30);
        var page1Text = page1Result.text || getTerminalScreenText();

        var pages = [page1Text];
        var lastScreen = page1Text;

        // 4. If display has more pages, page through verifying each screen
        if (!isFinished(page1Text) && !window._decsCaptureAborted) {
          for (var p = 1; p < maxPages; p++) {
            if (window._decsCaptureAborted) {
              console.log('[DECS_ENGINE] 🛑 Autonomous capture loop aborted by user on page ' + pages.length);
              break;
            }
            // Settle delay to ensure 3270 emulator keyboard buffer is uninhibited
            await sleep(400);

            // Position cursor cleanly on the row immediately below the last genuine data line
            window.positionCursorBelowLastLine();
            await sleep(200);

            var upper = (lastScreen || '').toUpperCase();
            var nextKey = (upper.includes('MORE? (ENTER Y)') || upper.includes('MORE (Y/N)') || upper.includes('MORE? (Y/N)') || upper.includes('MORE?')) ? 'Y' : 'MD';

            console.log('[DECS_ENGINE] Paging turn #' + p + ' with key: ' + nextKey);

            // Send pagination key
            window.sendDecsKey(nextKey);

            // Wait for next page to load and settle (verifying body change, not local echo)
            var nextResult = await waitForScreenLoadedAndSettled(lastScreen, 6500, 30);
            var nextText = nextResult.text;

            // If screen body did not change or timed out without new content, stop
            if (!nextResult.success || !nextText || normalizeScreenBody(nextText) === normalizeScreenBody(lastScreen)) {
              console.log('[DECS_ENGINE] Paging complete: no further pages from host. Total captured: ' + pages.length);
              break;
            }

            pages.push(nextText);
            lastScreen = nextText;

            if (isFinished(nextText)) {
              console.log('[DECS_ENGINE] End marker reached on page ' + (p + 1) + '. Total captured: ' + pages.length);
              break;
            }
          }
        }

        var combinedText = pages.join('\n');
        console.log('[DECS_ENGINE] Capture complete. Total pages: ' + pages.length + ', Total characters: ' + combinedText.length);
        if (window.AndroidPortal && window.AndroidPortal.onHiCaptureComplete) {
          window.AndroidPortal.onHiCaptureComplete(hiCommand, combinedText, pages.length);
        }

        resolve({ success: true, text: combinedText, pages: pages.length });
      })();
    });
  };

  /**
   * Section 6: Autonomous Multi-Page Capture for N6D Reserve Roster
   */
  window.runAutonomousN6DCapture = function (n6dCommand) {
    return window.runAutonomousHiCapture(n6dCommand);
  };

  /**
   * Section 7: HSS Single & Batch Captures
   */
  window.captureSingleHssFully = function (hssCommand) {
    return window.runAutonomousHiCapture(hssCommand);
  };

  window.runBatchHssCapture = function (cmdList) {
    return new Promise(function (resolve) {
      (async function () {
        for (var i = 0; i < cmdList.length; i++) {
          var cmd = cmdList[i];
          await window.runAutonomousHiCapture(cmd);
          await sleep(1000);
        }

        if (window.AndroidPortal && window.AndroidPortal.onBatchCaptureComplete) {
          window.AndroidPortal.onBatchCaptureComplete(cmdList.length);
        }

        resolve({ success: true, count: cmdList.length });
      })();
    });
  };

  console.log('[DECS_ENGINE] DECS Terminal Engine v3.2 ready.');
})();
