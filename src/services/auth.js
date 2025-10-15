// src/services/auth.js
import { auth } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,   // נשאר בשביל פרודקשן
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";

export const watchAuth = (cb) => onAuthStateChanged(auth, cb);

// פPersistence נוח בפיתוח
setPersistence(auth, browserLocalPersistence).catch(() => {});

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    // 👇 בפיתוח – Popup בלבד
    if (process.env.NODE_ENV !== "production") {
      return await signInWithPopup(auth, provider);
    }

    // 👇 בפרודקשן – ננסה Popup, ואם נחסם ניפול ל-Redirect
    try {
      return await signInWithPopup(auth, provider);
    } catch (e) {
      if (e?.code === "auth/popup-blocked" ||
          e?.code === "auth/operation-not-supported-in-this-environment") {
        await signInWithRedirect(auth, provider);
        return null; // נחזור לכאן אחרי redirect דרך getRedirectResult בעמוד
      }
      throw e;
    }
  } catch (e) {
    // הודעה ברורה יותר בפיתוח
    if (process.env.NODE_ENV !== "production" &&
        (e?.code === "auth/popup-blocked" || e?.code === "auth/cancelled-popup-request")) {
      throw new Error("הדפדפן חסם חלון קופץ. בטל/י חסימה לחלון אחד או אפשר/י פופאפים לאתר מקומי.");
    }
    throw e;
  }
}

// נשארים כרגיל
export const registerWithEmail = async (email, password) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(user);
  return user;
};
export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);

// אם תרצה/י להשתמש ב-redirect בפרודקשן – קרא/י לזה אחרי טעינה:
export async function collectRedirectResultIfAny() {
  try {
    const res = await getRedirectResult(auth);
    return res || null;
  } catch { return null; }
}
