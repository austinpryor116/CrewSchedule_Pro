import { SequenceTrip, DutyPeriod, FlightLeg, HssAuditRecord, HssChangeItem } from "@/types";

/**
 * CrewSchedule Pro - HSS Diff & Audit Engine
 * 
 * Performs deep, granular comparisons between sequential HSS snapshots.
 * Automatically tracks:
 * - Leg reassignments and additions/cancellations
 * - Equipment / Tail number swaps
 * - Duty period block & credit time variances
 * - Hotel / Layover modifications
 * - CBA contract pay protection triggers (e.g., Envoy ALPA Section 12 Reassignment)
 */

export class HssDiffEngine {
  /**
   * Compares an existing SequenceTrip with a newly captured or merged HSS payload.
   * Returns a detailed HssAuditRecord if changes are found, or null if identical.
   */
  public static computeDiff(
    existing: SequenceTrip | null | undefined,
    incoming: Partial<SequenceTrip> & { rawTextSnippet?: string },
    source: HssAuditRecord["source"] = "DECS_HSS_IMPORT"
  ): HssAuditRecord | null {
    if (!incoming) return null;

    const seqNumber = incoming.sequenceNumber || existing?.sequenceNumber || "UNKNOWN";
    const seqDate = incoming.startDate || existing?.startDate || new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const changes: HssChangeItem[] = [];

    // If there was no prior record, log an INITIAL_CAPTURE audit
    if (!existing) {
      return {
        auditId: `audit-${seqNumber}-${Date.now()}`,
        sequenceNumber: seqNumber,
        sequenceDate: seqDate,
        capturedAt: now,
        source,
        changesDetected: [
          {
            id: `chg-init-${Date.now()}`,
            field: "STATUS_TAG",
            changeType: "ADDED",
            previousValue: null,
            newValue: incoming.statusTag || "PUBLISHED",
            notes: `Initial HSS sequence capture: ${incoming.dutyPeriods?.length || 0} duty periods.`,
          },
        ],
        contractImpactSummary: {
          scheduledCreditMinutes: incoming.totalCreditMinutes || 0,
          actualCreditMinutes: incoming.totalCreditMinutes || 0,
          creditDifferenceMinutes: 0,
          hasOvertimeDelta: false,
          hasReassignment: false,
        },
        rawHssTextSnippet: incoming.rawTextSnippet,
      };
    }

    // 1. Check Credit Minutes Delta
    const prevCredit = existing.totalCreditMinutes || 0;
    const newCredit = incoming.totalCreditMinutes !== undefined ? incoming.totalCreditMinutes : prevCredit;
    const creditDelta = newCredit - prevCredit;

    if (incoming.totalCreditMinutes !== undefined && incoming.totalCreditMinutes !== prevCredit) {
      changes.push({
        id: `chg-cred-${Date.now()}`,
        field: "CREDIT_TIME",
        changeType: "MODIFIED",
        previousValue: `${(prevCredit / 60).toFixed(2)} hrs (${prevCredit}m)`,
        newValue: `${(newCredit / 60).toFixed(2)} hrs (${newCredit}m)`,
        deltaMinutes: creditDelta,
        notes: `Credit time changed by ${creditDelta > 0 ? "+" : ""}${(creditDelta / 60).toFixed(2)} hrs.`,
      });
    }

    // 2. Check Block Minutes Delta
    const prevBlock = existing.totalBlockMinutes || 0;
    const newBlock = incoming.totalBlockMinutes !== undefined ? incoming.totalBlockMinutes : prevBlock;
    if (incoming.totalBlockMinutes !== undefined && incoming.totalBlockMinutes !== prevBlock) {
      changes.push({
        id: `chg-blk-${Date.now()}`,
        field: "BLOCK_TIME",
        changeType: "MODIFIED",
        previousValue: `${(prevBlock / 60).toFixed(2)} hrs (${prevBlock}m)`,
        newValue: `${(newBlock / 60).toFixed(2)} hrs (${newBlock}m)`,
        deltaMinutes: newBlock - prevBlock,
        notes: `Scheduled block time updated.`,
      });
    }

    // 3. Check Equipment Swaps
    if (incoming.equipment && existing.equipment && incoming.equipment !== existing.equipment) {
      changes.push({
        id: `chg-eq-${Date.now()}`,
        field: "EQUIPMENT",
        changeType: "MODIFIED",
        previousValue: existing.equipment,
        newValue: incoming.equipment,
        notes: `Equipment changed from ${existing.equipment} to ${incoming.equipment}`,
      });
    }

    // 4. Check Layover & Hotel City Changes
    const prevLayovers = (existing.layoverCities || []).join(" • ");
    const newLayovers = (incoming.layoverCities || []).join(" • ");
    if (incoming.layoverCities && prevLayovers !== newLayovers) {
      changes.push({
        id: `chg-htl-${Date.now()}`,
        field: "HOTEL",
        changeType: "MODIFIED",
        previousValue: prevLayovers || "None",
        newValue: newLayovers || "None",
        notes: `Layover routing revised to: ${newLayovers}`,
      });
    }

    // 5. Check Granular Leg-by-Leg Differences
    const prevLegs: FlightLeg[] = (existing.dutyPeriods || []).flatMap((dp) => dp.legs || []);
    const newLegs: FlightLeg[] = (incoming.dutyPeriods || []).flatMap((dp) => dp.legs || []);

    if (newLegs.length > 0) {
      // Find modified or re-assigned flight legs
      const maxLen = Math.max(prevLegs.length, newLegs.length);
      let hasReassignedLeg = false;

      for (let i = 0; i < maxLen; i++) {
        const pLeg = prevLegs[i];
        const nLeg = newLegs[i];

        if (!pLeg && nLeg) {
          changes.push({
            id: `chg-leg-add-${i}-${Date.now()}`,
            field: "LEGS",
            changeType: "ADDED",
            flightNumber: nLeg.flightNumber,
            previousValue: null,
            newValue: `${nLeg.flightNumber || 'FLT'} ${nLeg.depAirport}->${nLeg.arrAirport}`,
            notes: `Added leg ${nLeg.flightNumber}: ${nLeg.depAirport} to ${nLeg.arrAirport}`,
          });
        } else if (pLeg && !nLeg) {
          changes.push({
            id: `chg-leg-rm-${i}-${Date.now()}`,
            field: "LEGS",
            changeType: "REMOVED",
            flightNumber: pLeg.flightNumber,
            previousValue: `${pLeg.flightNumber || 'FLT'} ${pLeg.depAirport}->${pLeg.arrAirport}`,
            newValue: null,
            notes: `Cancelled / removed leg ${pLeg.flightNumber}`,
          });
        } else if (pLeg && nLeg) {
          // Compare routing, flight number, deadhead status
          const routingChanged = pLeg.depAirport !== nLeg.depAirport || pLeg.arrAirport !== nLeg.arrAirport;
          const fltNumChanged = pLeg.flightNumber !== nLeg.flightNumber;
          const dhChanged = pLeg.isDeadhead !== nLeg.isDeadhead;

          if (routingChanged || fltNumChanged || dhChanged) {
            hasReassignedLeg = true;
            changes.push({
              id: `chg-leg-mod-${i}-${Date.now()}`,
              field: "LEGS",
              changeType: "REASSIGNED",
              flightNumber: nLeg.flightNumber || pLeg.flightNumber,
              previousValue: `${pLeg.flightNumber} ${pLeg.depAirport}->${pLeg.arrAirport}${pLeg.isDeadhead ? ' (DH)' : ''}`,
              newValue: `${nLeg.flightNumber} ${nLeg.depAirport}->${nLeg.arrAirport}${nLeg.isDeadhead ? ' (DH)' : ''}`,
              notes: `Leg ${i + 1} reassigned: ${pLeg.depAirport}->${pLeg.arrAirport} ➔ ${nLeg.depAirport}->${nLeg.arrAirport}`,
            });
          }
        }
      }
    }

    // 6. Check Duty Period count changes
    const prevDpCount = existing.dutyPeriods?.length || 0;
    const newDpCount = incoming.dutyPeriods?.length || prevDpCount;
    if (incoming.dutyPeriods && prevDpCount !== newDpCount) {
      changes.push({
        id: `chg-dp-cnt-${Date.now()}`,
        field: "DUTY_PERIODS",
        changeType: "MODIFIED",
        previousValue: `${prevDpCount} Days`,
        newValue: `${newDpCount} Days`,
        notes: `Duty period count updated from ${prevDpCount} to ${newDpCount}`,
      });
    }

    // If no differences were detected, return null
    if (changes.length === 0) {
      return null;
    }

    const hasReassignment = changes.some((c) => c.changeType === "REASSIGNED");
    const hasHotelChange = changes.some((c) => c.field === "HOTEL");

    return {
      auditId: `audit-${seqNumber}-${Date.now()}`,
      sequenceNumber: seqNumber,
      sequenceDate: seqDate,
      capturedAt: now,
      source,
      previousSnapshotTimestamp: existing.startDate,
      changesDetected: changes,
      contractImpactSummary: {
        scheduledCreditMinutes: prevCredit,
        actualCreditMinutes: newCredit,
        creditDifferenceMinutes: creditDelta,
        hasOvertimeDelta: creditDelta > 0,
        hasReassignment,
        reassignmentClauseApplicable: hasReassignment
          ? "Envoy Pilot CBA Section 12.C / Inflight Section 11 (Pay Protected Reassignment)"
          : undefined,
        hotelRequiredChanged: hasHotelChange,
      },
      rawHssTextSnippet: incoming.rawTextSnippet,
    };
  }

  /**
   * Generates a readable string badge summary for mobile UI cards
   */
  public static formatAuditBadge(record: HssAuditRecord): string {
    const count = record.changesDetected.length;
    if (count === 0) return "No changes";
    const primary = record.changesDetected[0];
    if (primary.field === "CREDIT_TIME" && primary.deltaMinutes) {
      const sign = primary.deltaMinutes > 0 ? "+" : "";
      return `Credit: ${sign}${(primary.deltaMinutes / 60).toFixed(2)}h (${count} diffs)`;
    }
    if (primary.field === "LEGS") {
      return `Routing revised (${count} diffs)`;
    }
    return `${count} HSS updates`;
  }
}
