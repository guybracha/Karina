// src/services/auth.js
import { auth } from "../firebase";
import {
  // בסיס
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signOut,

  // אימייל/סיסמה
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,

  // Google
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,

  // Anonymous (Guest)
  signInAnonymously,
  EmailAuthProvider,
  linkWithCredential,

  // Magic Link
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";

/* ==================== Guards ==================== */
const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

/* ==================== UA helpers (SSR-safe) ==================== */
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
  // דפדפנים שבהם פופאפ נוטה להיחסם
  return /\bFBAV|FBAN|Instagram|Line\/|WeChat|Twitter|Pinterest|Snapchat|TikTok/i.test(ua);
}
const isDevHost = () => {
  if (!isBrowser) return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
};


/* ==================== Persistence & observer ==================== */
export const watchAuth = (cb) => onAuthStateChanged(auth, cb);

// שמירת סשן מקומי; אם נכשל — מתעלמים (SSR/פרייבט-מוד)
try { setPersistence(auth, browserLocalPersistence).catch(() => {}); } catch { /* SSR */ }

/* ==================== Redirect flag (sessionStorage) ==================== */
const REDIRECT_FLAG = "karina:auth:redirecting";
const setRedirecting = () => { if (!isBrowser) return; try { sessionStorage.setItem(REDIRECT_FLAG, "1"); } catch {} };
const clearRedirecting = () => { if (!isBrowser) return; try { sessionStorage.removeItem(REDIRECT_FLAG); } catch {} };
export const isRedirecting = () => { if (!isBrowser) return false; try { return sessionStorage.getItem(REDIRECT_FLAG) === "1"; } catch { return false; } };

/* ==================== Email/Password ==================== */
export async function registerWithEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  // לא חובה אבל נחמד לשלוח אימות
  try { await sendEmailVerification(cred.user); } catch {}
  return cred; // UserCredential
}
export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);

/* ==================== Guest (Anonymous) ==================== */
export async function signInGuest() {
  return signInAnonymously(auth); // { user }
}
export async function upgradeAnonWithEmail(email, password) {
  if (!auth.currentUser || !auth.currentUser.isAnonymous) {
    throw new Error("Not in anonymous session");
  }
  const cred = EmailAuthProvider.credential(email, password);
  return linkWithCredential(auth.currentUser, cred); // שומר את אותו UID
}

/* ==================== Magic Link (Email link) ==================== */
const ACTION_CODE_SETTINGS = {
  url: `${isBrowser ? window.location.origin : ""}/auth?emailLink=1`,
  handleCodeInApp: true,
};
export async function sendMagicLink(email) {
  await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);
  try { localStorage.setItem("karina:auth:pendingEmail", email); } catch {}
}
export async function completeMagicLinkSignIn() {
  if (!isBrowser) return null;
  const href = window.location.href;
  if (!isSignInWithEmailLink(auth, href)) return null;

  let email = null;
  try { email = localStorage.getItem("karina:auth:pendingEmail"); } catch {}
  if (!email) email = window.prompt("Confirm your email to complete sign-in:") || "";

  const res = await signInWithEmailLink(auth, email, href);
  try { localStorage.removeItem("karina:auth:pendingEmail"); } catch {}
  return res; // { user }
}

/* ==================== Google Sign-in ==================== */
/**
 * אסטרטגיה:
 * 1) ננסה קודם signInWithPopup (במיוחד ב-localhost) — מהיר, פחות רגיש לשגיאות reCAPTCHA.
 * 2) אם פופאפ נחסם/נכשל → ניפול ל-signInWithRedirect.
 * 3) אם המשתמש אנונימי — נצא לפני ההתחברות (מונע קונפליקטים של link).
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  // אם אורח — התנתק תחילה כדי למנוע link וקונפליקטים
  if (auth.currentUser?.isAnonymous) {
    try { await signOut(auth); } catch {}
  }

  // עדיפות לפופאפ בלוקאל/דפדפנים שמאפשרים
  try {
    if (isDevHost() && !isIOS() && !isInAppBrowser()) {
      const cred = await signInWithPopup(auth, provider);
      return cred; // הצלחנו בפופאפ
    }
  } catch (e) {
    // קודים שכיחים: auth/popup-closed-by-user, auth/cancelled-popup-request
    // ניפול ל-Redirect בלי לחסום את הזרימה
    // console.warn("Popup failed, falling back to redirect:", e);
  }

  // Redirect (ברירת מחדל אמינה)
  setRedirecting();
  await signInWithRedirect(auth, provider);
  return null; // התוצאה תיאסף ע"י collectRedirectResultIfAny()
}

// alias אם תרצה להכריח Redirect בלבד
export const signInWithGoogleRedirectOnly = async () => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  if (auth.currentUser?.isAnonymous) {
    try { await signOut(auth); } catch {}
  }
  setRedirecting();
  await signInWithRedirect(auth, provider);
  return null;
};

/* ==================== איסוף תוצאת Redirect ==================== */
export async function collectRedirectResultIfAny() {
  try {
    const res = await getRedirectResult(auth);
    clearRedirecting();
    return res || null; // UserCredential או null
  } catch (e) {
    clearRedirecting();
    throw e; // נותנים ל-UI להציג את קוד השגיאה האמיתי
  }
}

/* ==================== מידע סביבתי (אופציונלי לשימוש חיצוני) ==================== */
export const envInfo = {
  isBrowser,
  isIOS: isIOS(),
  isInAppBrowser: isInAppBrowser(),
  isDevHost: isDevHost(),
};
