<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Local Storage Rules
- **Local Computer Environment**: All reference documents, schedules, data, and outputs must be read/written directly on the local computer (`C:\Users\austi\.gemini\antigravity-ide\scratch\Ref` and local project workspace). Do NOT rely on or store files in cloud storage.

# Mobile & Cell Phone View Rules
- **Cell Phone First & Mobile View Only**: This project is strictly designed and optimized for mobile cell phone views. Always prioritize cell phone viewport layouts, compact touch-friendly UI components, mobile bottom sheets, responsive mobile navigation, and mobile-first CSS styling.

# Envoy Air Airline & Fleet Rules
- **Envoy Air Exclusivity**: This application is built strictly for Envoy Air (American Eagle).
- **Fleet Exclusivity (Embraer 170 / 175 Only)**: Envoy operates ONLY the Embraer 170 / 175 (`E175` / `E170`). NEVER include the E145, CRJ, Boeing, Airbus, or any other fleet types.
- **Domicile Bases**: `ORD` (Chicago O'Hare), `DFW` (Dallas/Fort Worth), `MIA` (Miami), and `PHX` (Phoenix Sky Harbor).
- **Crew Positions**: Envoy crew positions are strictly **Captain (`CA`)**, **First Officer (`FO`)**, **Check Pilot (`CHECK_PILOT`)**, and **Flight Attendant (`FA`)**. There is NO "Lead Flight Attendant" (LFA).
- **DECS Hotel Request Command Suffixes (`RF 200<BASE_CHAR> HTL`)**:
  - `ORD` -> `C` (`RF 200C HTL`)
  - `DFW` -> `D` (`RF 200D HTL`)
  - `MIA` -> `M` (`RF 200M HTL`)
  - `PHX` -> `P` (`RF 200P HTL`)

# Mandatory Fresh Restart & Live Deployment Rule
- **Every Code Change MUST Trigger a 100% Fresh Restart**:
  - Whenever any code is modified or fixed, ALWAYS execute a clean deployment cycle:
    1. Terminate any stale node processes / dev servers.
    2. Start a fresh server instance with clean memory.
    3. Re-verify ADB port forwarding (`adb reverse tcp:3000 tcp:3000`).
    4. Force-stop `com.crewschedule.pro` on the phone.
    5. Re-launch `com.crewschedule.pro` fresh so the phone runs 100% newly compiled code without stale cache or stale server state.


