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
 * ===== כללי שדות מותריים =====
 * מותר ב"דוקומנט" users/{uid} רק:
 * displayName, email, phoneNumber, company, photoURL,
 * marketingConsent, marketingConsentAt, marketingConsentMethod,
 * createdAt, updatedAt
 */
const ALLOWED_KEYS = new Set([
  "displayName",
  "email",
  "phoneNumber",
  "company",
  "photoURL",
  "marketingConsent",
  "marketingConsentAt",
  "marketingConsentMethod",
  "createdAt",
  "updatedAt",
]);

/** ניקוי מחרוזות */
const clean = (v) => (typeof v === "string" ? v.trim() : v);

/** אימותים בסיסיים */
const isValidEmail = (v) =>
  typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const isValidPhone = (v) =>
  typeof v === "string" && /^[0-9+\-()\s]{7,20}$/.test(v);

/** מסיר מפתחות שלא מורשים לפי הכללים */
function pickAllowed(obj = {}) {
  const out = {};
  for (const k of Object.keys(obj || {})) {
    if (ALLOWED_KEYS.has(k)) out[k] = obj[k];
  }
  return out;
}

/**
 * יצירה/עדכון מסמך משתמש בסיסי בכניסה ראשונה או סינכרון נתונים בסיסיים.
 * נשמרת התאמה לכללים: רק המפתחות המותרים ייכתבו.
 * הערות:
 * - createdAt נשלח רק ביצירה.
 * - updatedAt נשלח תמיד.
 * - שדות marketing מטופלים בזהירות (כולל serverTimestamp היכן שצריך).
 */
export async function ensureUserDoc(user, extra = null) {
  if (!user || !user.uid) return;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  // שדות בסיסיים (מנוקים ומוגדרים בצורה בטוחה)
  const displayName =
    clean(user.displayName) ||
    (user.email ? String(user.email).split("@")[0] : "") ||
    "User";

  const email = user.email && isValidEmail(user.email) ? user.email.toLowerCase() : null;
  const phone = user.phoneNumber && isValidPhone(user.phoneNumber) ? user.phoneNumber : null;

  const base = {
    displayName,
    email,
    phoneNumber: phone,
    company: null,
    photoURL: clean(user.photoURL) || null,
    updatedAt: serverTimestamp(),
  };

  // שדות Marketing מה"extra" (רק אם הועברו, ושומרים על כללים)
  let marketing = {};
  if (extra && typeof extra === "object") {
    const e = pickAllowed(extra);

    if (typeof e.marketingConsent === "boolean") {
      if (e.marketingConsent) {
        marketing.marketingConsent = true;
        marketing.marketingConsentAt = serverTimestamp(); // timestamp מהשרת
        if (typeof e.marketingConsentMethod === "string" && e.marketingConsentMethod.trim()) {
          marketing.marketingConsentMethod = clean(e.marketingConsentMethod);
        } else {
          // אם אין method – נשאיר לא קיים (מותר לפי הכללים)
        }
      } else {
        // ביטול הסכמה – False + ניקוי שדות קשורים
        marketing.marketingConsent = false;
        marketing.marketingConsentAt = deleteField();
        marketing.marketingConsentMethod = deleteField();
      }
    }
  }

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        ...base,
        ...marketing,
        createdAt: serverTimestamp(), // רק בפעם הראשונה
      },
      { merge: true }
    );
  } else {
    // בעדכון – לא שולחים createdAt
    await setDoc(ref, { ...base, ...marketing }, { merge: true });
  }
}

/**
 * שליפת פרופיל משתמש (cache first, ואז מהשרת).
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const ref = doc(db, "users", uid);

  // Cache-first
  try {
    const snapCache = await getDocFromCache(ref);
    if (snapCache.exists()) {
      return { id: snapCache.id, ...snapCache.data() };
    }
  } catch {
    // אין בקאש או כשל – ננסה מהשרת
  }

  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * עדכון פרופיל ב-Firestore (merge).
 * נפתח רק את השדות המותרים בכללים:
 * displayName, email, phoneNumber, company, photoURL,
 * (אופציונלי) marketingConsent (+method,+At כ־serverTimestamp), marketingConsentMethod.
 * שדות ריקים הופכים ל-deleteField() כדי לנקותם במסמך.
 */
export async function updateUserProfile(uid, data = {}) {
  if (!uid) throw new Error("missing uid");
  const ref = doc(db, "users", uid);

  const payload = {};
  const safe = pickAllowed(data);

  // ===== שדות בסיס =====
  if ("displayName" in safe) {
    const v = clean(safe.displayName);
    payload.displayName = v || deleteField();
  }

  if ("email" in safe) {
    const v = clean(String(safe.email || "")).toLowerCase();
    if (v && !isValidEmail(v)) {
      throw new Error("אימייל לא תקין.");
    }
    payload.email = v || deleteField();
  }

  if ("phoneNumber" in safe) {
    const v = clean(safe.phoneNumber);
    if (v && !isValidPhone(v)) {
      throw new Error("מספר טלפון לא תקין.");
    }
    payload.phoneNumber = v || deleteField();
  }

  if ("company" in safe) {
    const v = clean(safe.company);
    payload.company = v || deleteField();
  }

  if ("photoURL" in safe) {
    const v = clean(safe.photoURL);
    payload.photoURL = v || deleteField();
  }

  // ===== שדות Marketing (אופציונלי) =====
  if (typeof safe.marketingConsent === "boolean") {
    payload.marketingConsent = safe.marketingConsent;

    if (safe.marketingConsent) {
      // אם הפך ל-true – timestamp מהשרת + method אם ניתנה
      payload.marketingConsentAt = serverTimestamp();
      if (typeof safe.marketingConsentMethod === "string" && safe.marketingConsentMethod.trim()) {
        payload.marketingConsentMethod = clean(safe.marketingConsentMethod);
      } else {
        // אם לא נשלחה מתודה, נשאיר לא קיים – מותר לפי כללים
      }
    } else {
      // אם מכבים הסכמה – false + ניקוי שדות נלווים
      payload.marketingConsentAt = deleteField();
      payload.marketingConsentMethod = deleteField();
    }
  } else if (
    // אם נשלחה מתודה בלי לשנות את דגל ההסכמה – נעדכן אותה כמידע נוסף
    typeof safe.marketingConsentMethod === "string" &&
    safe.marketingConsentMethod.trim()
  ) {
    payload.marketingConsentMethod = clean(safe.marketingConsentMethod);
  }

  payload.updatedAt = serverTimestamp();

  await setDoc(ref, payload, { merge: true });
}

/**
 * הפיכת הסכמה לשיווק ל-true (כולל timestamp ומתודה).
 * שימושי במיוחד אחרי Google first sign-in.
 */
export async function setMarketingConsentTrue(uid, method = "manual_update") {
  if (!uid) throw new Error("missing uid");
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      marketingConsent: true,
      marketingConsentAt: serverTimestamp(),
      marketingConsentMethod: clean(method) || "manual_update",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * ביטול הסכמה לשיווק (false) וניקוי השדות הנלווים.
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
