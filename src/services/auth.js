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

/* ========== Helpers: UA detection for iOS & in-app browsers ========== */
function isIOS() {
  const ua = navigator.userAgent || "";
  return /iP(hone|ad|od)/i.test(ua);
}
function isInAppBrowser() {
  const ua = navigator.userAgent || "";
  // דפדפנים נפוצים בתוך אפליקציות
  return /\bFBAV|FBAN|Instagram|Line\/|WeChat|Twitter|Pinterest|Snapchat|TikTok/i.test(ua);
}

/* ========== Persistence & public API ========== */
export const watchAuth = (cb) => onAuthStateChanged(auth, cb);

// שומר מצב התחברות מקומית; אם נכשל (למשל חוסמי צד־ג’) — מתעלמים
setPersistence(auth, browserLocalPersistence).catch(() => {});

/* דגל redirect ב-sessionStorage כדי שה-UI ידע לאסוף תוצאה */
const REDIRECT_FLAG = "karina:auth:redirecting";
export const markRedirecting = () => {
  try { sessionStorage.setItem(REDIRECT_FLAG, "1"); } catch {}
};
export const clearRedirecting = () => {
  try { sessionStorage.removeItem(REDIRECT_FLAG); } catch {}
};
export const isRedirecting = () => {
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

  if (isIOS() || isInAppBrowser()) {
    markRedirecting();
    await signInWithRedirect(auth, provider);
    return null; // נאסוף אחר כך ב-collectRedirectResultIfAny
  }

  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    const code = e?.code || "";
    const fallback =
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment" ||
      code === "auth/popup-closed-by-user";

    if (fallback) {
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
  try { await sendEmailVerification(cred.user); } catch { /* לא חוסם את הזרימה */ }
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
