import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FB_API_KEY,
  authDomain: process.env.REACT_APP_FB_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FB_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FB_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FB_APP_ID,
  measurementId: process.env.REACT_APP_FB_MEASUREMENT_ID,
};

// DEBUG: יופיע רק בפיתוח
if (process.env.NODE_ENV !== "production") {
  console.log("Firebase config:", firebaseConfig);
  if (!firebaseConfig.projectId) {
    console.error("❌ Missing REACT_APP_FB_PROJECT_ID (ENV לא נטענו?).");
  }
}

// למנוע אתחול כפול
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// אל תקרא לאנליטיקס אם לא נתמך (ולא חובה בכלל)
export let analytics = null;
analyticsSupported().then((ok) => {
  if (ok) analytics = getAnalytics(app);
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app); 
