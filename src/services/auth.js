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

export const watchAuth = (cb) => onAuthStateChanged(auth, cb);

// שמירת סשן מקומי (אם ייכשל – מתעלמים בשקט)
setPersistence(auth, browserLocalPersistence).catch(() => {});

// דגל פנימי שיסמן שאנחנו יוצאים ל-redirect (כדי שה-UI ידע לאסוף תוצאה לפני ניווט וכד')
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

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  // הצעה למשתמש לבחור חשבון בכל פעם
  provider.setCustomParameters({ prompt: "select_account" });

  // 1) תמיד ננסה POPUP קודם (גם בפרודקשן וגם בפיתוח)
  try {
    return await signInWithPopup(auth, provider);
  } catch (e) {
    const code = e?.code || "";

    // 2) מקרים בהם סביר לעבור ל-REDIRECT (חסימת פופאפים/סביבה לא תומכת)
    const shouldFallbackToRedirect =
      code === "auth/popup-blocked" ||
      code === "auth/operation-not-supported-in-this-environment" ||
      code === "auth/popup-closed-by-user"; // בחלק מהמכשירים זה נזרק מיד אחרי חסימה

    if (shouldFallbackToRedirect) {
      // נסמן שאנחנו יוצאים ל-redirect כדי שהמסך יאסוף תוצאה קודם כל
      markRedirecting();
      await signInWithRedirect(auth, provider);
      // לא חוזרים לכאן מיד; אחרי החזרה יש לאסוף עם getRedirectResult
      return null;
    }

    // 3) שגיאות אחרות – נזרוק הלאה לטיפול ה-UI (friendlyError)
    throw e;
  }
}

// רישום רגיל לאימייל/סיסמה
export const registerWithEmail = async (email, password) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(user);
  return user;
};

export const loginWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const logout = () => signOut(auth);

// אוספים תוצאה של redirect (תקרא/י בזה בעמוד לאחר טעינה)
// חשוב: נקו את דגל ה-redirect אחרי הקריאה
export async function collectRedirectResultIfAny() {
  try {
    const res = await getRedirectResult(auth);
    // בכל מקרה ננקה את הדגל (גם אם אין תוצאה)
    clearRedirecting();
    return res || null;
  } catch {
    clearRedirecting();
    return null;
  }
}
