import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithEmailAndPassword } from "firebase/auth";
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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

async function testAuthAndFirestore() {
  console.log("Testing Auth...");
  try {
    const cred = await signInAnonymously(auth);
    console.log("✅ Anonymous Auth Succeeded. UID:", cred.user.uid);
  } catch (err: any) {
    console.log("⚠️ Anonymous Auth failed or disabled:", err.message);
  }

  try {
    const testDocRef = doc(db, "users", "test_user_123");
    await setDoc(testDocRef, { test: true, updatedAt: serverTimestamp() });
    console.log("✅ Successfully wrote to users collection!");
    const snap = await getDoc(testDocRef);
    console.log("✅ Successfully read from users collection:", snap.data());
  } catch (err: any) {
    console.log("❌ Users collection write error:", err.message);
  }

  try {
    const testDocRef = doc(db, "chat_channels", "test_channel_123");
    await setDoc(testDocRef, { test: true, updatedAt: serverTimestamp() });
    console.log("✅ Successfully wrote to chat_channels collection!");
  } catch (err: any) {
    console.log("❌ chat_channels collection write error:", err.message);
  }
}

testAuthAndFirestore().catch(console.error);
