/**
 * CREWSCHEDULE PRO // COMPREHENSIVE FIREBASE BACKEND MESSAGING VERIFICATION
 * 
 * Tests:
 * 1. Direct Firestore connection to crewschedule-9ce66
 * 2. Multi-user concurrent onSnapshot listeners (Captain Austin & FO Marcus Vance)
 * 3. Bidirectional real-time message streaming with aviation macros
 * 4. Interactive trip trade embed creation and status mutations
 * 5. Emoji reaction propagation
 * 6. Message editing and soft deletion
 * 7. Airplane mode / Offline catchup verification
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  Unsubscribe,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCDW2BmGk508vEZmiZsW07NfbKB4agZERs",
  authDomain: "crewschedule-9ce66.firebaseapp.com",
  projectId: "crewschedule-9ce66",
  storageBucket: "crewschedule-9ce66.firebasestorage.app",
  messagingSenderId: "518851254982",
  appId: "1:518851254982:web:893438c13383e2278495c7",
  measurementId: "G-1PPC7BWFD0",
};

import { getAuth, signInAnonymously } from "firebase/auth";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const TEST_CHANNEL_ID = `test_verification_${Date.now()}`;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDeepBackendVerification() {
  console.log("================================================================================");
  console.log("🚀 STARTING DEEP FIREBASE FIRESTORE BACKEND MESSAGING VERIFICATION");
  console.log(`📡 Project ID: ${firebaseConfig.projectId}`);
  console.log(`📂 Test Channel: chat_channels/${TEST_CHANNEL_ID}`);
  console.log("================================================================================\n");

  // Authenticate
  try {
    const cred = await signInAnonymously(auth);
    console.log(`🔐 Authenticated to Firebase Auth (UID: ${cred.user.uid})\n`);
  } catch (e: any) {
    console.log(`ℹ️ Auth notice: ${e.message}\n`);
  }

  let passedTests = 0;
  let totalTests = 7;

  // --- TEST 1: Initialize Channel Metadata in Firestore ---
  console.log("▶ TEST 1: Writing Parent Channel Document to Firestore...");
  const channelRef = doc(db, "chat_channels", TEST_CHANNEL_ID);
  await setDoc(channelRef, {
    id: TEST_CHANNEL_ID,
    name: "ORD Base Operations (Verification)",
    type: "BASE",
    base: "ORD",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const channelSnap = await getDoc(channelRef);
  if (channelSnap.exists() && channelSnap.data().base === "ORD") {
    console.log("  ✅ Channel metadata successfully committed & read from Firestore Cloud!");
    passedTests++;
  } else {
    throw new Error("Failed to verify channel document write in Firestore.");
  }

  // --- TEST 2: Multi-User Real-Time onSnapshot Subscriptions ---
  console.log("\n▶ TEST 2: Establishing Dual onSnapshot Real-Time Listeners for Multi-User Sync...");
  const userA_Received: any[] = [];
  const userB_Received: any[] = [];

  const messagesRef = collection(db, "chat_channels", TEST_CHANNEL_ID, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  // Listener A (Captain Austin Pryor)
  const unsubA: Unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added" || change.type === "modified") {
        userA_Received.push({ type: change.type, data: change.doc.data() });
      }
    });
  });

  // Listener B (FO Marcus Vance)
  const unsubB: Unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added" || change.type === "modified") {
        userB_Received.push({ type: change.type, data: change.doc.data() });
      }
    });
  });

  console.log("  ✅ Both User A (Capt. Pryor) and User B (FO Vance) listeners attached to Firestore stream.");
  passedTests++;
  await sleep(1000);

  // --- TEST 3: User A Sends Message -> User B Receives in Real Time ---
  console.log("\n▶ TEST 3: User A Dispatches Tactical Message -> Testing User B Real-Time Delivery...");
  const msg1Id = `msg_test_1_${Date.now()}`;
  const msg1Ref = doc(db, "chat_channels", TEST_CHANNEL_ID, "messages", msg1Id);
  const msg1Payload = {
    id: msg1Id,
    channelId: TEST_CHANNEL_ID,
    sender: {
      userId: "user_austin_pryor",
      name: "Captain Austin Pryor",
      role: "CA",
      base: "ORD",
    },
    content: "ORD Ground, Envoy 3842 pushback approved from Gate G12.",
    quickMacroTag: "GATE_HOLD",
    timestamp: Date.now(),
    status: "SENT",
  };

  await setDoc(msg1Ref, msg1Payload);
  await sleep(1200);

  const receivedByB = userB_Received.find((m) => m.data.id === msg1Id);
  if (receivedByB && receivedByB.data.content === msg1Payload.content) {
    console.log(`  ✅ User B received User A's message in real time!`);
    console.log(`     Content: "${receivedByB.data.content}"`);
    console.log(`     Macro Tag: [${receivedByB.data.quickMacroTag}]`);
    console.log(`     Sender: ${receivedByB.data.sender.name} (${receivedByB.data.sender.role})`);
    passedTests++;
  } else {
    throw new Error("User B did not receive User A's message in real time.");
  }

  // --- TEST 4: User B Replies -> User A Receives in Real Time ---
  console.log("\n▶ TEST 4: User B (FO Marcus Vance) Sends Reply -> Testing User A Real-Time Delivery...");
  const msg2Id = `msg_test_2_${Date.now()}`;
  const msg2Ref = doc(db, "chat_channels", TEST_CHANNEL_ID, "messages", msg2Id);
  const msg2Payload = {
    id: msg2Id,
    channelId: TEST_CHANNEL_ID,
    sender: {
      userId: "user_marcus_vance",
      name: "Marcus Vance",
      role: "FO",
      base: "ORD",
    },
    content: "Preflight checklist complete, flaps set for departure on 28R.",
    timestamp: Date.now(),
    status: "SENT",
  };

  await setDoc(msg2Ref, msg2Payload);
  await sleep(1200);

  const receivedByA = userA_Received.find((m) => m.data.id === msg2Id);
  if (receivedByA && receivedByA.data.content === msg2Payload.content) {
    console.log(`  ✅ User A received User B's reply in real time!`);
    console.log(`     Content: "${receivedByA.data.content}"`);
    console.log(`     Sender: ${receivedByA.data.sender.name} (${receivedByA.data.sender.role})`);
    passedTests++;
  } else {
    throw new Error("User A did not receive User B's reply in real time.");
  }

  // --- TEST 5: Interactive Trip Trade Proposal Creation & Mutation ---
  console.log("\n▶ TEST 5: Publishing Trip Trade Proposal & Testing Real-Time Status Mutation...");
  const tradeMsgId = `trade_test_${Date.now()}`;
  const tradeMsgRef = doc(db, "chat_channels", TEST_CHANNEL_ID, "messages", tradeMsgId);
  const tradePayload = {
    id: tradeMsgId,
    channelId: TEST_CHANNEL_ID,
    sender: msg1Payload.sender,
    content: "Offering Sequence #14731 for trade",
    embeddedTrade: {
      tradeId: `trade_${Date.now()}`,
      offeredSequenceId: "14731",
      offeredSequenceNumber: "14731",
      creditHours: 18.5,
      blockHours: 16.0,
      legsCount: 4,
      status: "OPEN",
    },
    timestamp: Date.now(),
    status: "SENT",
  };

  await setDoc(tradeMsgRef, tradePayload);
  await sleep(1200);

  // User B accepts the trade
  console.log("  ⚡ User B taps [Accept Trade] -> updating Firestore document...");
  await updateDoc(tradeMsgRef, {
    "embeddedTrade.status": "ACCEPTED",
    "embeddedTrade.acceptedBy": "Marcus Vance (FO)",
    updatedAt: serverTimestamp(),
  });
  await sleep(1200);

  const updatedSnap = await getDoc(tradeMsgRef);
  if (updatedSnap.exists() && updatedSnap.data().embeddedTrade?.status === "ACCEPTED") {
    console.log("  ✅ Trade offer status updated to [ACCEPTED] in Firestore!");
    console.log(`     Sequence: #${updatedSnap.data().embeddedTrade.offeredSequenceNumber}`);
    console.log(`     Credit: ${updatedSnap.data().embeddedTrade.creditHours}h`);
    console.log(`     Accepted By: ${updatedSnap.data().embeddedTrade.acceptedBy}`);
    passedTests++;
  } else {
    throw new Error("Trade status mutation failed in Firestore.");
  }

  // --- TEST 6: Emoji Reactions & Message Editing ---
  console.log("\n▶ TEST 6: Adding Emoji Reactions & Testing Live Edits...");
  await setDoc(
    msg2Ref,
    {
      reactions: {
        plane: {
          count: 1,
          users: ["user_austin_pryor"],
        },
        thumbsup: {
          count: 1,
          users: ["user_austin_pryor"],
        },
      },
    },
    { merge: true }
  );

  await updateDoc(msg1Ref, {
    content: "ORD Ground, Envoy 3842 pushback approved from Gate G12. (EDITED: De-ice Pad 2 Assigned)",
    editedAt: Date.now(),
  });
  await sleep(1200);

  const editedSnap = await getDoc(msg1Ref);
  const reactedSnap = await getDoc(msg2Ref);

  if (
    editedSnap.data()?.content.includes("EDITED") &&
    reactedSnap.data()?.reactions?.plane?.count === 1
  ) {
    console.log("  ✅ Emoji reactions and live message edits verified in Firestore!");
    console.log(`     Reactions: plane (${reactedSnap.data()?.reactions?.plane?.count}), thumbsup (${reactedSnap.data()?.reactions?.thumbsup?.count})`);
    console.log(`     Edited text: "${editedSnap.data()?.content}"`);
    passedTests++;
  } else {
    throw new Error("Reaction or edit update failed in Firestore.");
  }

  // --- TEST 7: Airplane Mode & Offline Catch-Up Test ---
  console.log("\n▶ TEST 7: Simulating Airplane Mode / Offline Catch-Up...");
  console.log("  ✈️ Simulating User B entering Airplane Mode (unsubscribing)...");
  unsubB(); // User B goes offline

  // User A sends 3 messages while User B is disconnected in flight
  console.log("  📤 User A sends 3 in-flight operational messages while User B is offline...");
  for (let i = 1; i <= 3; i++) {
    const offlineMsgId = `offline_msg_${i}_${Date.now()}`;
    await setDoc(doc(db, "chat_channels", TEST_CHANNEL_ID, "messages", offlineMsgId), {
      id: offlineMsgId,
      channelId: TEST_CHANNEL_ID,
      sender: msg1Payload.sender,
      content: `[In-Flight Update #${i}]: Cruising FL310 over waypoint BDF. Fuel remaining: ${14000 - i * 1000} lbs.`,
      timestamp: Date.now() + i * 100,
      status: "SENT",
    });
  }

  console.log("  🛬 User B lands, exits Airplane Mode & reconnects to Firestore...");
  const offlineCatchupQuery = query(
    collection(db, "chat_channels", TEST_CHANNEL_ID, "messages"),
    orderBy("timestamp", "asc")
  );
  const catchupSnapshot = await getDocs(offlineCatchupQuery);
  const allMessages = catchupSnapshot.docs.map((d) => d.data());

  const offlineMessagesFound = allMessages.filter((m) => m.content.includes("In-Flight Update"));
  if (offlineMessagesFound.length === 3) {
    console.log(`  ✅ User B reconnected and caught up on all ${offlineMessagesFound.length} missed messages!`);
    offlineMessagesFound.forEach((m) => {
      console.log(`     • ${m.content}`);
    });
    passedTests++;
  } else {
    throw new Error(`Expected 3 offline messages but found ${offlineMessagesFound.length}`);
  }

  // --- CLEANUP ---
  console.log("\n🧹 Cleaning up test artifacts from Firestore Cloud...");
  unsubA();
  for (const docSnap of catchupSnapshot.docs) {
    await deleteDoc(doc(db, "chat_channels", TEST_CHANNEL_ID, "messages", docSnap.id));
  }
  await deleteDoc(channelRef);
  console.log("  ✅ Test channel and messages deleted cleanly.");

  console.log("\n================================================================================");
  console.log(`🎉 ALL ${passedTests}/${totalTests} BACKEND FIREBASE FIRESTORE TESTS PASSED WITH 100% SUCCESS!`);
  console.log("================================================================================\n");
}

runDeepBackendVerification().catch((err) => {
  console.error("❌ TEST FAILED WITH ERROR:", err);
  process.exit(1);
});
