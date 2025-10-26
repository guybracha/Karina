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

  // Google (Redirect בלבד)
  GoogleAuthProvider,
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

/* ========== Guards ========== */
const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

/* ========== UA helpers (SSR-safe) ========== */
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
  return /\bFBAV|FBAN|Instagram|Line\/|WeChat|Twitter|Pinterest|Snapchat|TikTok/i.test(ua);
}

/* ========== Persistence & public API ========== */
export const watchAuth = (cb) => onAuthStateChanged(auth, cb);

// שמירת סשן מקומי; אם נכשל — מתעלמים בשקט
try { setPersistence(auth, browserLocalPersistence).catch(() => {}); } catch { /* SSR */ }

/* ========== Redirect flag (sessionStorage) ========== */
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

/* ========== Email/Password רגיל ========== */
export const registerWithEmail = async (email, password) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try { await sendEmailVerification(cred.user); } catch {}
  return cred; // UserCredential
};
export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);

/* ========== Guest Checkout (Anonymous) ========== */
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

/* ========== Magic Link (Passwordless Email) ========== */
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

/* ========== Google Sign-in (Redirect-only; לא עושים link כשאנונימי) ========== */
/**
 * פתרון יציב: אם המשתמש אנונימי — נצא ואז נבצע Sign-in רגיל עם Redirect.
 * זה עוקף קונפליקטים כמו credential-already-in-use/account-exists-with-different-credential.
 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  // אם אורח — התנתק תחילה כדי למנוע link וקונפליקטים
  if (auth.currentUser?.isAnonymous) {
    try { await signOut(auth); } catch {}
  }

  markRedirecting();
  await signInWithRedirect(auth, provider);
  return null; // ייאסף ע"י collectRedirectResultIfAny()
}

/* אופציונלי: alias */
export const signInWithGoogleRedirectOnly = signInWithGoogle;

/* ========== איסוף תוצאת Redirect ========== */
export async function collectRedirectResultIfAny() {
  try {
    const res = await getRedirectResult(auth);
    clearRedirecting();
    return res || null; // UserCredential או null
  } catch (e) {
    clearRedirecting();
    throw e; // חשוב: לא לבלוע! נותנים ל-UI לראות את הקוד/הודעה
  }
}

/* ========== (אופציונלי) מידע סביבתי לשימוש חיצוני ========== */
export const envInfo = { isBrowser, isIOS: isIOS(), isInAppBrowser: isInAppBrowser() };
