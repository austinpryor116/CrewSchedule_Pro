import { NextRequest, NextResponse } from "next/server";
import { generateRosterIcs } from "../../../../lib/icalExporter";
import { getUserSchedule } from "../../../../lib/serverScheduleStore";
import { MOCK_AUG_SEQUENCES, DEFAULT_PAY_RATES } from "../../../../lib/demoData";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") || "crew-742840";
  const includeHotels = searchParams.get("hotels") !== "false";
  const includeLegs = searchParams.get("legs") !== "false";
  const includePersonal = searchParams.get("personal") !== "false";

  // Look up user's published schedule by token in the multi-tenant store
  const userRecord = getUserSchedule(token);

  const sequencesToExport = userRecord?.sequences && userRecord.sequences.length > 0
    ? userRecord.sequences
    : MOCK_AUG_SEQUENCES;

  const payRatesToUse = userRecord?.payRates || DEFAULT_PAY_RATES;
  const personalEventsToUse = includePersonal ? (userRecord?.personalEvents || []) : [];

  const icsString = generateRosterIcs(sequencesToExport, payRatesToUse, {
    includeHotels,
    includeLegs,
    includePersonalEvents: includePersonal,
    personalEvents: personalEventsToUse,
    crewName: userRecord?.crewName || "Flight Crew",
    crewRole: userRecord?.crewRole || "Pilot",
  });

  return new NextResponse(icsString, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="crewschedule_${token}.ics"`,
      "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
