---
name: ocd-code-architecture
description: Definitive standard for pristine code layout, modular architecture, strict typing, zero-string-embedded code, and mobile-first cell phone design in CrewSchedule Pro.
---

# OCD Code Architecture & Organization Standard

This skill establishes the uncompromising architectural and organizational standards for CrewSchedule Pro. Follow these rules whenever writing, refactoring, or reviewing code.

---

## 1. Zero-String-Embedded Code Rule (CRITICAL)

### The Anti-Pattern
Never construct multi-line JavaScript, SQL, CSS, or HTML by concatenating raw strings inside Java, Kotlin, Swift, or Python files (e.g., `String script = "(function() {" + ...`).

### Why It Fails:
- Compilers cannot validate foreign syntax inside string literals.
- IDE bracket-matching, linting, and error-highlighting are disabled.
- Escaping errors and missing brackets cause silent runtime failures in WebViews or engines.

### The Standard:
1. **Always Use Standalone Asset Files**:
   - Write terminal/webview logic in dedicated `.js` asset files (e.g. `android/app/src/main/assets/decs_engine.js`).
   - Validate standalone JavaScript syntax directly using `node -c <path_to_asset>`.
2. **Load Assets Dynamically in Native Host**:
   - Use a clean asset loader (e.g., `loadAssetAsString("decs_engine.js")`) and evaluate the loaded string in the WebView.

---

## 2. Directory Structure & File Hierarchy

```
crewschedule-pro/
├── android/                   # Native Android wrapper & Gradle project
│   └── app/src/main/
│       ├── assets/            # Standalone injected JS engines & public assets
│       │   └── decs_engine.js # DECS isolation, scanner, and capture engine
│       └── java/.../          # Native Activity, bridge, and UI modals
├── src/                       # Frontend application source
│   ├── app/                   # Next.js App Router (pages, layout, globals.css, API routes)
│   ├── components/            # UI components categorized by feature domain
│   │   ├── Briefing/          # Briefing views & offline ForeFlight maps
│   │   ├── Calendar/          # Calendar grid, modals, tools, overlays
│   │   ├── Compliance/        # FAR 117 & contractual flight/duty limit panels
│   │   ├── ImportModal/       # Schedule import review & difference modals
│   │   ├── Logbook/           # Pilot digital flight logbook studio
│   │   ├── ParserStudio/      # Raw DECS parser test & sandbox UI
│   │   ├── PayCalculator/     # CBA contract pay scales & projection engine
│   │   ├── PortalBrowser/     # WebSabre / FOS portal container & HSS sequences modal
│   │   ├── Reserve/           # N6D reserve pilot roster & callout order studio
│   │   ├── RevisionHistory/   # Schedule change tracker & audit timeline
│   │   ├── Scanner/           # Cockpit QR code & document scanner
│   │   ├── SequenceInspector/ # Flight leg & duty period inspector
│   │   ├── Settings/          # User profile, theme, and sync settings
│   │   ├── chat/              # E2EE crew tactical messaging & trip trades
│   │   └── index.ts           # Master barrel export for clean `@/components` imports
│   ├── lib/                   # Pure production engines, services, parsers, and utilities
│   │   ├── cbaPayScale.ts     # CBA pay rates, steps, and longevity tables
│   │   ├── far117Engine.ts    # Part 117 rest, duty, and flight time limits
│   │   ├── n6dParser.ts       # N6D reserve roster & seniority parser
│   │   ├── parser.ts          # Core HI1, HI2, HSS schedule & leg parser
│   │   └── weatherService.ts  # METAR, TAF, SIGMET, radar & turbulence services
│   ├── store/                 # Global Zustand state management
│   │   ├── useCrewStore.ts    # Core schedule, profile, and app state
│   │   └── useMessageStore.ts # Tactical crew chat and trade state
│   └── types/                 # TypeScript interfaces and domain models
│       ├── decs.ts            # DECS command enum and macro definitions
│       ├── index.ts           # Master type definitions & re-exports
│       └── messaging.ts       # Chat, trade offer, and E2EE message types
└── scratch/                   # Isolated temporary files (EXCLUDED from build & tsconfig)
    ├── fixtures/              # Sample terminal dumps, logs, and test data
    ├── scripts/               # One-off migration & maintenance scripts
    └── tests/                 # Standalone unit & sandbox test scripts
```

---

## 3. Barrel Export & SSR Boundary Guidelines

1. **Subdirectory Barrels**: Every component subdirectory must have an `index.ts` exporting its public components.
2. **Master Barrel**: `src/components/index.ts` must export public components for clean `@/components` imports.
3. **Preserve SSR Boundaries**:
   - Never export client-only browser modules (like Leaflet or Web Audio) directly from top-level barrel files if they access `window` on import.
   - Always load client-only modules dynamically inside the wrapper component using `dynamic(() => import("./MapComponent"), { ssr: false })`.

---

## 4. Mobile & Cell Phone First Rules

1. **Viewport Optimization**:
   - Layout root must use `height: 100dvh; width: 100vw; overflow: hidden;`.
   - Prevent elastic overscroll bounce (`overscroll-behavior: none;`).
2. **Safe Area Insets**:
   - Use CSS environment variables: `--safe-top: env(safe-area-inset-top, 0px);` and `--safe-bottom: env(safe-area-inset-bottom, 0px);`.
   - Apply `.pb-safe-dock` or `.mb-safe-nav` on scroll containers to prevent bottom navigation bar overlap.
3. **Touch-Friendly Controls**:
   - Minimum touch target: 44px x 44px.
   - Use `.active-press` micro-animations (`transform: scale(0.96)`) for tactile feedback.

---

## 5. Pre-Commit / Pre-Build OCD Checklist

Before considering any refactoring or feature complete, execute these 4 verification steps:

1. **Validate Standalone JavaScript**:
   ```bash
   node -c android/app/src/main/assets/decs_engine.js
   ```
2. **Strict TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
3. **Next.js Production Build**:
   ```bash
   npm run build
   ```
4. **Android APK Compilation & Device Deploy**:
   ```bash
   npm run dev:phone
   ```
