import { NextRequest, NextResponse } from "next/server";
import { saveUserSchedule } from "../../../../lib/serverScheduleStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, sequences, personalEvents, userProfile, payRates } = body;

    if (!token) {
      return NextResponse.json({ error: "Missing subscription token" }, { status: 400 });
    }

    saveUserSchedule({
      token,
      employeeId: userProfile?.employeeId,
      crewName: userProfile?.name,
      crewRole: userProfile?.crewRole,
      updatedAt: new Date().toISOString(),
      sequences: Array.isArray(sequences) ? sequences : [],
      personalEvents: Array.isArray(personalEvents) ? personalEvents : [],
      payRates,
    });

    return NextResponse.json({
      success: true,
      message: "Schedule published to live family feed",
      token,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to publish schedule" },
      { status: 500 }
    );
  }
}
