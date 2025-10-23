// src/services/auth.js
import { auth } from "../firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";

/* ========== Guards ========== */
const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

/* ========== Helpers: UA detection for iOS & in-app browsers (SSR-safe) ========== */
function getUA() {
  if (!isBrowser) return "";
  try { return navigator.userAgent || ""; } catch { return ""; }
}
function isIOS() {
  const ua = getUA();
  return /iP(hone|ad|od)/i.test(ua);
}
function isInAppBrowser() {
  const ua = getUA();
  // דפדפנים נפוצים בתוך אפליקציות
  return /\bFBAV|FBAN|Instagram|Line\/|WeChat|Twitter|Pinterest|Snapchat|TikTok/i.test(ua);
}

/* ========== Persistence & public API ========== */
export const watchAuth = (cb) => onAuthStateChanged(auth, cb);

// שמירת סשן מקומי; אם נכשל — מתעלמים בשקט
try {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} catch { /* SSR */ }

/* דגל redirect ב-sessionStorage כדי שה-UI ידע לאסוף תוצאה */
const REDIRECT_FLAG = "karina:auth:redirecting";
export const markRedirecting = () => {
  if (!isBrowser) return;
  try { sessionStorage.setItem(REDIRECT_FLAG, "1"); } catch {}
};
export const clearRedirecting = () => {
  if (!isBrowser) return;
  try { sessionStorage.removeItem(REDIRECT_FLAG); } catch {}
};
export const isRedirecting = () => {
  if (!isBrowser) return false;
  try { return sessionStorage.getItem(REDIRECT_FLAG) === "1"; } catch { return false; }
};

/**
 * Google Sign-in:
 * - iOS / דפדפן בתוך אפליקציה → Redirect (פופאפים לעיתים חסומים).
 * - אחרת: Popup עם fallback ל-Redirect על שגיאות טיפוסיות.
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  if (!isBrowser || isIOS() || isInAppBrowser()) {
    markRedirecting();
    await signInWithRedirect(auth, provider);
    return null; // תיאסף התוצאה מאוחר יותר
  }

  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    const code = e?.code || "";
    const shouldFallback =
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment" ||
      code === "auth/popup-closed-by-user" ||
      code === "auth/cancelled-popup-request";

    if (shouldFallback) {
      markRedirecting();
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw e;
  }
}

/* רישום באימייל/סיסמה — מחזיר UserCredential */
export const registerWithEmail = async (email, password) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try { await sendEmailVerification(cred.user); } catch {}
  return cred;
};

/* כניסה באימייל/סיסמה — מחזיר UserCredential */
export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

/* יציאה */
export const logout = () => signOut(auth);

/**
 * איסוף תוצאת Redirect; תמיד מנקה את דגל ה-redirect.
 * מחזיר UserCredential או null.
 */
export async function collectRedirectResultIfAny() {
  try {
    const res = await getRedirectResult(auth);
    clearRedirecting();
    return res || null;
  } catch {
    clearRedirecting();
    return null;
  }
}
