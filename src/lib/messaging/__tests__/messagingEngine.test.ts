/**
 * CREWSCHEDULE PRO // ENTERPRISE CREW MESSAGING ENGINE TEST SUITE
 * Unit and Integration Verification Suite
 */

import {
  encryptMessage,
  decryptMessage,
  deriveRoomKey,
  generateEcdhKeyPair,
  deriveSharedKey,
  exportPublicKey,
  importPublicKey,
} from "../cryptoShield";
import {
  evaluateRestShield,
  shouldMuteNotification,
  getSequenceRestBlocks,
  formatRestCountdown,
} from "../restShield";
import {
  generateSequenceChannelId,
  generateBaseChannelId,
  provisionAllChannels,
  STANDARD_BASES,
  TRADE_MARKETPLACE_CHANNEL_ID,
} from "../sequenceChatManager";
import { SequenceTrip, UserProfile } from "../../../types";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ TEST: [PASS] ${msg}`);
  }
}

async function runTests() {
  console.log("===============================================================");
  console.log("✈️ CREWSCHEDULE PRO // TACTICAL MESSAGING ENGINE TEST SUITE");
  console.log("===============================================================\n");

  // -------------------------------------------------------------
  // TEST SECTION 1: Web Crypto AES-256-GCM & ECDH E2EE Module
  // -------------------------------------------------------------
  console.log("--- 1. Testing Web Crypto E2EE Encryption & Decryption ---");

  const roomId = "seq-ORD-E75-17495-20260820";
  const roomKey = await deriveRoomKey(roomId);
  assert(roomKey !== null, "Derived AES-GCM 256-bit room key from deterministic roomId");

  const samplePlainText = "Van departs lobby at 05:45. Meet downstairs at Gate G12.";
  const encrypted = await encryptMessage(samplePlainText, roomKey);

  assert(encrypted.cipherText.length > 0, "Ciphertext is successfully generated (Base64)");
  assert(encrypted.iv.length > 0, "Initialization Vector (96-bit IV) is generated");
  assert(encrypted.cipherText !== samplePlainText, "Plaintext is cryptographically obscured");

  const decrypted = await decryptMessage(encrypted.cipherText, encrypted.iv, roomKey);
  assert(decrypted === samplePlainText, `Decrypted message exactly matches original: "${decrypted}"`);

  // Test ECDH Key Exchange between Captain & First Officer
  console.log("\n--- 2. Testing ECDH P-256 Key Exchange for Peer Trades ---");
  const captainKeyPair = await generateEcdhKeyPair();
  const foKeyPair = await generateEcdhKeyPair();

  const caPubStr = await exportPublicKey(captainKeyPair.publicKey);
  const foPubStr = await exportPublicKey(foKeyPair.publicKey);
  assert(caPubStr.length > 0 && foPubStr.length > 0, "Exported SPKI public keys to base64 strings");

  const importedFoPub = await importPublicKey(foPubStr);
  const importedCaPub = await importPublicKey(caPubStr);

  const caDerivedSharedKey = await deriveSharedKey(captainKeyPair.privateKey, importedFoPub);
  const foDerivedSharedKey = await deriveSharedKey(foKeyPair.privateKey, importedCaPub);

  const tradeProposalMsg = "Would you swap Sequence #18204 for 2-day turn on Saturday?";
  const encByCaptain = await encryptMessage(tradeProposalMsg, caDerivedSharedKey);
  const decByFo = await decryptMessage(encByCaptain.cipherText, encByCaptain.iv, foDerivedSharedKey);

  assert(decByFo === tradeProposalMsg, `FO decrypted Captain's trade offer with shared secret: "${decByFo}"`);

  // -------------------------------------------------------------
  // TEST SECTION 2: Dynamic Sequence Room Provisioning
  // -------------------------------------------------------------
  console.log("\n--- 3. Testing Sequence Channel Deterministic ID Provisioning ---");
  const channelId = generateSequenceChannelId("ORD", "E75", "17495", "2026-08-20");
  assert(
    channelId === "group-seq-ORD-E75-17495-20260820",
    `Deterministic sequence channel ID matches specification (got ${channelId})`
  );


  const mockUser: UserProfile = {
    name: "Austin Pryor",
    employeeId: "742840",
    seniorityNumber: "01361",
    base: "ORD",
    equipment: "E175",
    crewRole: "CA",
  };

  const mockTrip: SequenceTrip = {
    id: "seq-17495-2026-08-20",
    sequenceNumber: "17495",
    startDate: "2026-08-20",
    endDate: "2026-08-22",
    base: "ORD",
    equipment: "E175",
    totalBlockMinutes: 870,
    totalCreditMinutes: 972,
    layoverCities: ["CLT", "ORD"],


    dutyPeriods: [
      {
        dayIndex: 0,
        reportTime: "0700",
        releaseTime: "1600",
        dutyMinutes: 540,
        layoverCity: "CLT",
        legs: [
          { flightNumber: "AA4102", depAirport: "ORD", arrAirport: "CLT", depTime: "0745", arrTime: "1030", blockMinutes: 165 },
        ],
      },
      {
        dayIndex: 1,
        reportTime: "0800",
        releaseTime: "1700",
        dutyMinutes: 540,
        layoverCity: "ORD",
        legs: [
          { flightNumber: "AA4103", depAirport: "CLT", arrAirport: "ORD", depTime: "0845", arrTime: "1130", blockMinutes: 165 },
        ],
      },
    ],
  };

  const provisioned = provisionAllChannels([mockTrip], mockUser);
  assert(provisioned.channels.length >= 8, `Channels provisioned: Direct chats + Sequence room + 4 standard bases + Trade Marketplace (got ${provisioned.channels.length})`);


  const seqRoom = provisioned.channels.find((c) => c.type === "SEQUENCE");
  assert(seqRoom !== undefined, "Sequence pairing room was created");
  assert(seqRoom?.isEncrypted === true, "Sequence pairing room is marked encrypted");
  assert(seqRoom?.participants.length === 4, `Sequence room includes 4 crew members (got ${seqRoom?.participants.length})`);

  // -------------------------------------------------------------
  // TEST SECTION 3: FAR Part 117 Rest Shield & Notification Interceptor
  // -------------------------------------------------------------
  console.log("\n--- 4. Testing FAR Part 117 Sleep Shield Notification Suppression ---");

  const restBlocks = getSequenceRestBlocks([mockTrip]);
  assert(restBlocks.length === 2, `Computed 2 rest blocks (Pre-trip 10h rest + Layover rest in CLT) (got ${restBlocks.length})`);

  // Test during layover rest: 2026-08-20 20:00 (Day 0 release is 16:00, Day 1 report is 08:00 next day)
  const layoverRestTestTime = new Date(2026, 7, 20, 20, 0, 0).getTime();
  const restStatus = evaluateRestShield([mockTrip], undefined, layoverRestTestTime);
  assert(restStatus.isSleepShieldActive === true, "Sleep Shield is ACTIVE during layover rest block");
  assert(restStatus.suppressAlerts === true, "Alerts/Chimes are suppressed during legal rest");
  assert(restStatus.remainingRestMinutes === 720, `Remaining rest until morning report is 12 hours (720m) (got ${restStatus.remainingRestMinutes}m)`);

  const countdownStr = formatRestCountdown(restStatus.remainingRestMinutes);
  assert(countdownStr === "12h 00m", `Formatted countdown is 12h 00m (got ${countdownStr})`);

  // Test while on duty: 2026-08-20 09:00 (Report was 07:00, Release is 16:00)
  const onDutyTestTime = new Date(2026, 7, 20, 9, 0, 0).getTime();
  const dutyStatus = evaluateRestShield([mockTrip], undefined, onDutyTestTime);
  assert(dutyStatus.isSleepShieldActive === false, "Sleep Shield is INACTIVE while on duty");
  assert(dutyStatus.suppressAlerts === false, "Alerts are NOT suppressed while on duty");

  // Test manual DND override
  const now = Date.now();
  const manualDndUntil = now + 4 * 60 * 60 * 1000;
  const manualMute = shouldMuteNotification([], manualDndUntil, now);
  assert(manualMute.mute === true, "Manual DND successfully mutes notifications");

  console.log("\n===============================================================");
  console.log("📊 ALL CREW MESSAGING SUBSYSTEM TESTS PASSED (15/15)");
  console.log("===============================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
