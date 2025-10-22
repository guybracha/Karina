// src/services/users.js
import { db } from "../firebase";
import {
  doc,
  getDoc,
  getDocFromCache,
  setDoc,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";

/**
 * יצירת/עדכון מסמך משתמש בסיסי בכניסה ראשונה או סינכרון נתונים בסיסיים.
 * תואם לכללים: מותר רק המפתחות:
 * displayName, email, phoneNumber, company, photoURL,
 * marketingConsent, marketingConsentAt, marketingConsentMethod,
 * createdAt, updatedAt
 */
export async function ensureUserDoc(user, extra = null) {
  if (!user || !user.uid) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  // שדות בסיסיים מותרי-כללים
  const base = {
    displayName: user.displayName || user.email?.split("@")[0] || "User",
    email: user.email || null,
    photoURL: user.photoURL || null,
    phoneNumber: user.phoneNumber || null,
    company: null,
    updatedAt: serverTimestamp(),
  };

  // שדות Marketing לפי צורך (אם extra הגיע עם סימון הסכמה)
  const marketing =
    extra && extra.marketingConsent
      ? {
          marketingConsent: true,
          marketingConsentAt: serverTimestamp(), // ⬅️ timestamp לפי הכללים
          marketingConsentMethod: extra.marketingConsentMethod || "unknown",
        }
      : {};

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        ...base,
        ...marketing,
        createdAt: serverTimestamp(), // ⬅️ רק ביצירה
      },
      { merge: true }
    );
  } else {
    // בעדכון – לא שולחים createdAt (הכללים דורשים שישאר זהה)
    await setDoc(ref, { ...base, ...marketing }, { merge: true });
  }
}

/**
 * שליפת פרופיל משתמש (cache first).
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const ref = doc(db, "users", uid);

  // cache first
  try {
    const snapCache = await getDocFromCache(ref);
    if (snapCache.exists()) {
      return { id: snapCache.id, ...snapCache.data() };
    }
  } catch {
    // אין בקאש – נמשיך לשרת
  }

  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * עדכון פרופיל ב-Firestore (merge).
 * מפתח רק את השדות המותרים בכללים:
 * displayName, email, phoneNumber, company, photoURL,
 * (אופציונלי) marketingConsent, marketingConsentMethod, marketingConsentAt (timestamp).
 *
 * שדות ריקים יימחקו מהמסמך (deleteField).
 */
export async function updateUserProfile(uid, data = {}) {
  if (!uid) throw new Error("missing uid");
  const ref = doc(db, "users", uid);

  const clean = (v) => (typeof v === "string" ? v.trim() : v);

  const payload = {};

  // ===== שדות בסיס =====
  if (typeof data.displayName === "string") {
    const v = clean(data.displayName);
    payload.displayName = v || deleteField();
  }

  if (typeof data.email === "string") {
    const v = clean(data.email)?.toLowerCase();
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      throw new Error("אימייל לא תקין.");
    }
    payload.email = v || deleteField();
  }

  if (typeof data.phoneNumber === "string") {
    const v = clean(data.phoneNumber);
    if (v && !/^[0-9+\-()\s]{7,20}$/.test(v)) {
      throw new Error("מספר טלפון לא תקין.");
    }
    payload.phoneNumber = v || deleteField();
  }

  if (typeof data.company === "string") {
    const v = clean(data.company);
    payload.company = v || deleteField();
  }

  if (typeof data.photoURL === "string") {
    const v = clean(data.photoURL);
    payload.photoURL = v || deleteField();
  }

  // ===== שדות Marketing (אופציונלי) =====
  if (typeof data.marketingConsent === "boolean") {
    payload.marketingConsent = data.marketingConsent;
    if (data.marketingConsent) {
      // אם הפוך ל-true, נעדכן גם timestamp ומתודה (אם סופקה)
      payload.marketingConsentAt = serverTimestamp();
      if (typeof data.marketingConsentMethod === "string" && data.marketingConsentMethod.trim()) {
        payload.marketingConsentMethod = clean(data.marketingConsentMethod);
      } else if (!("marketingConsentMethod" in data)) {
        // אם לא סופקה מתודה, ננקה כדי לא לעבור על כללים
        // (הכללים מאפשרים null, לא חובה לשלוח בכלל)
        // כאן נשאיר כמו שהוא (לא נשלח), כדי לשמר ערך קיים אם יש.
      }
    } else {
      // אם מכבים הסכמה – נשמור false וננקה timestamp ומתודה
      payload.marketingConsentAt = deleteField();
      payload.marketingConsentMethod = deleteField();
    }
  } else {
    // אם נשלחה מתודה בלי דגל – נטפל בה רק אם יש הסכמה קיימת בתיעוד
    if (typeof data.marketingConsentMethod === "string" && data.marketingConsentMethod.trim()) {
      payload.marketingConsentMethod = clean(data.marketingConsentMethod);
    }
    // אם קיבלת רצון להגדיר marketingConsentAt מבחוץ – לא נאשר מחרוזות;
    // נשאיר לשרת לייצר timestamp במקרה של הסכמה דרך setMarketingConsentTrue.
  }

  payload.updatedAt = serverTimestamp();

  await setDoc(ref, payload, { merge: true });
}

/**
 * פעולת עזר ממוקדת: הפיכת הסכמה לשיווק ל-true
 * (כולל timestamp ומתודה). שימושי אחרי Google first sign-in.
 */
export async function setMarketingConsentTrue(uid, method = "manual_update") {
  if (!uid) throw new Error("missing uid");
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      marketingConsent: true,
      marketingConsentAt: serverTimestamp(),
      marketingConsentMethod: method,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * פעולת עזר ממוקדת: ביטול הסכמה לשיווק (false) וניקוי השדות הנלווים.
 */
export async function setMarketingConsentFalse(uid) {
  if (!uid) throw new Error("missing uid");
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      marketingConsent: false,
      marketingConsentAt: deleteField(),
      marketingConsentMethod: deleteField(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
