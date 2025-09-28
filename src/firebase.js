// src/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  enableNetwork,
  disableNetwork,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// ----------------------------------------------------
// קונפיג מ-ENV (פשוט וללא top-level await)
// אם חסרים ערכים ב-ENV, האפליקציה תאתחל ותציג אזהרה בקונסול.
// ----------------------------------------------------
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_API_KEY,
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FB_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FB_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FB_APP_ID,
  measurementId: process.env.REACT_APP_FB_MEASUREMENT_ID,
};

const isBrowser = typeof window !== "undefined";
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.log("Firebase config:", firebaseConfig);
  if (!firebaseConfig.projectId) {
    // eslint-disable-next-line no-console
    console.warn("⚠️ Missing REACT_APP_FB_PROJECT_ID (בדקו את קובץ ה-.env).");
  }
}

// אתחול יחיד
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// אנליטיקס – רק בדפדפן ותמיכה
export let analytics = null;
if (isBrowser) {
  analyticsSupported().then((ok) => {
    if (ok) analytics = getAnalytics(app);
  });
}

// שירותים
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Functions באזור קבוע (התאם אם צריך)
const FUNCTIONS_REGION = "europe-west1";
export const functions = getFunctions(app, FUNCTIONS_REGION);

// ----------------------------------------------------
// שיפור חוויית אופליין: פרסיסטנס + שינוי מצב רשת
// ----------------------------------------------------
enableIndexedDbPersistence(db).catch((err) => {
  // מרבית השגיאות פה קשורות ל-multi-tab; מתעלמים בשקט
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.info("IndexedDB persistence note:", err?.code || err?.message || err);
  }
});

if (isBrowser) {
  // ננהל מצב רשת של Firestore מול חיבור הדפדפן
  window.addEventListener("online", () => enableNetwork(db));
  window.addEventListener("offline", () => disableNetwork(db));
  // אם נכנסנו כבר אופליין, נכבה רשת (ימשיך לעבוד מקאש אם קיים)
  if (!navigator.onLine) {
    disableNetwork(db).catch(() => {});
  }
}

// ----------------------------------------------------
// Emulators – פיתוח מקומי ללא עלות (localhost או ENV)
// ----------------------------------------------------
// רק אם הגדירו במפורש בקובץ .env: REACT_APP_USE_EMULATORS=true
const wantEmulators =
  String(process.env.REACT_APP_USE_EMULATORS).toLowerCase() === "true";


if (wantEmulators) {
  try {
    // eslint-disable-next-line no-console
    console.log("🔌 Using Firebase Emulators");
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Emulator connection failed (ignored):", e?.message || e);
  }
}
