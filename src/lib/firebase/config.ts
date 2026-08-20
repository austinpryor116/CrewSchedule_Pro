import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyCDW2BmGk508vEZmiZsW07NfbKB4agZERs",
  authDomain: "crewschedule-9ce66.firebaseapp.com",
  projectId: "crewschedule-9ce66",
  storageBucket: "crewschedule-9ce66.firebasestorage.app",
  messagingSenderId: "518851254982",
  appId: "1:518851254982:web:893438c13383e2278495c7",
  measurementId: "G-1PPC7BWFD0"
};

export const VAPID_PUBLIC_KEY = "BDI6rTcAX1rfu76G9COOEo_x7fsHzGhH4UpRmUzTm06G3DY2cjW9VrjXyUYrtIJN-5UtVShjkmTyh7UBTDnh1lQ";

// Initialize Firebase App safely (singleton)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with Offline Persistence (critical for in-flight / airplane mode resilience)
let firestoreDb: ReturnType<typeof getFirestore>;

try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (e) {
  // If already initialized or unsupported environment, fallback to standard getFirestore
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
