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
  // Most common in-app browsers; הרחב לפי צורך
  return /\bFBAV|FBAN|Instagram|Line\/|WeChat|Twitter|Pinterest|Snapchat|TikTok/i.test(ua);
}

/* ========== Public API ========== */
export const watchAuth = (cb) => onAuthStateChanged(auth, cb);

// שמירת סשן מקומי (אם ייכשל – מתעלמים בשקט)
setPersistence(auth, browserLocalPersistence).catch(() => {});

/* דגל פנימי ל־redirect: כדי שה-UI ידע לאסוף תוצאה קודם כל */
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
 * - ב־iOS או בדפדפן בתוך אפליקציה → נכפה Redirect (פופאפים נחסמים/לא יציבים).
 * - אחרת ננסה Popup עם fallback ל-Redirect במידת הצורך.
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  // iOS / In-App → Redirect מראש (יציב יותר)
  if (isIOS() || isInAppBrowser()) {
    markRedirecting();
    await signInWithRedirect(auth, provider);
    // לא חוזרים לכאן מיידית; אחרי החזרה נאסוף עם collectRedirectResultIfAny()
    return null;
  }

  // סביבות רגילות: ננסה Popup עם fallback ל-Redirect
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    const code = e?.code || "";
    const shouldFallbackToRedirect =
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment" ||
      code === "auth/popup-closed-by-user";

    if (shouldFallbackToRedirect) {
      markRedirecting();
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw e; // שגיאות אחרות – יטופלו ב-UI (friendlyError)
  }
}

// רישום רגיל לאימייל/סיסמה
export const registerWithEmail = async (email, password) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(user);
  return user;
};

// כניסה באימייל/סיסמה
export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

// יציאה
export const logout = () => signOut(auth);

/**
 * איסוף תוצאת Redirect (לקרוא בעמוד הטעינה/ה־AuthPage useEffect)
 * מנקה תמיד את דגל ה-redirect.
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
