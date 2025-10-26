import { auth } from "../firebase";
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signOut,

  // Email/Password
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,

  // Google
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,

  // Guest
  signInAnonymously,
  EmailAuthProvider,
  linkWithCredential,

  // Magic Link
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";

/* ==================== Session ==================== */
try { setPersistence(auth, browserLocalPersistence).catch(() => {}); } catch {}
export const watchAuth = (cb) => onAuthStateChanged(auth, cb);
export const logout = () => signOut(auth);

/* ==================== Email/Password ==================== */
export async function registerWithEmail(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  try { await sendEmailVerification(cred.user); } catch {}
  return cred;
}
export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

/* ==================== Guest ==================== */
export const signInGuest = () => signInAnonymously(auth);
export async function upgradeAnonWithEmail(email, password) {
  const user = auth.currentUser;
  if (!user?.isAnonymous) throw new Error("Not in anonymous session");
  const cred = EmailAuthProvider.credential(email, password);
  return linkWithCredential(user, cred); // שומר UID
}

/* ==================== Magic Link ==================== */
const ACTION_CODE_SETTINGS = {
  url: `${window.location.origin}/auth?emailLink=1`,
  handleCodeInApp: true,
};
export async function sendMagicLink(email) {
  await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);
  try { localStorage.setItem("karina:auth:pendingEmail", email); } catch {}
}
export async function completeMagicLinkSignIn() {
  const href = window.location.href;
  if (!isSignInWithEmailLink(auth, href)) return null;
  let email = null;
  try { email = localStorage.getItem("karina:auth:pendingEmail"); } catch {}
  if (!email) email = window.prompt("Confirm your email to complete sign-in:") || "";
  const res = await signInWithEmailLink(auth, email, href);
  try { localStorage.removeItem("karina:auth:pendingEmail"); } catch {}
  return res; // { user }
}

/* ==================== Google ==================== */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  // אם יש אורח – התנתק כדי להימנע מקונפליקט linkWithCredential
  if (auth.currentUser?.isAnonymous) { try { await signOut(auth); } catch {} }

  try {
    // נסה פופאפ קודם (נוח בדסקטופ, localhost)
    return await signInWithPopup(auth, provider);
  } catch {
    // נפילה ל-redirect אם פופאפ נחסם/נכשל
    await signInWithRedirect(auth, provider);
    return null;
  }
}

export async function collectRedirectResultIfAny() {
  const res = await getRedirectResult(auth); // may be null
  return res || null;
}
