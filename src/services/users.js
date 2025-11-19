// src/services/users.js
import { db, ensureAppCheckReady } from "../firebase";
import {
  doc,
  getDoc,
  getDocFromCache,
  // בגרסאות מודרניות של Firestore זה קיים; נשמור Fallback אם לא
  getDocFromServer as _getDocFromServer,
  setDoc,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";

/* ===== שדות מותרים במסמך users_prod/{uid} =====
   displayName, email, phoneNumber, company, photoURL,
   marketingConsent, marketingConsentAt, marketingConsentMethod,
   createdAt, updatedAt
*/
const ALLOWED_KEYS = new Set([
  "displayName",
  "email",
  "phoneNumber",
  "company",
  "city",
  "photoURL",
  "marketingConsent",
  "marketingConsentAt",
  "marketingConsentMethod",
  "createdAt",
  "updatedAt",
]);

/* ---------- Utilities ---------- */
const clean = (v) => (typeof v === "string" ? v.trim() : v);
const normalizePhone = (s = "") => String(s || "").replace(/\D+/g, ""); // שומר רק ספרות

const isValidEmail =
  (v) => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// 7–15 ספרות (אחסון נקי אחרי normalizePhone)
const isValidPhoneDigits =
  (v) => typeof v === "string" && /^\d{7,20}$/.test(v);

function pickAllowed(obj = {}) {
  const out = {};
  for (const k of Object.keys(obj || {})) {
    if (ALLOWED_KEYS.has(k)) out[k] = obj[k];
  }
  return out;
}

async function readFresh(ref) {
  // קורא ישירות מהשרת כדי לעקוף קאש/IndexedDB
  const getFresh = _getDocFromServer || getDoc; // Fallback אם הפונקציה לא קיימת בגרסה
  const fresh = await getFresh(ref);
  return fresh.exists() ? { id: fresh.id, ...fresh.data() } : null;
}

/* ---------- Create/Sync basic user doc ---------- */
export async function ensureUserDoc(user, extra = null) {
  if (!user?.uid) return null;

  const ref = doc(db, "users_prod", user.uid);
  const snap = (_getDocFromServer ? await _getDocFromServer(ref) : await getDoc(ref));
  const exists = snap.exists();

  const displayName =
    clean(user.displayName) ||
    (user.email ? String(user.email).split("@")[0] : "") ||
    "User";

  const email =
    user.email && isValidEmail(user.email)
      ? String(user.email).toLowerCase()
      : null;

  // נרמול טלפון לספרות בלבד + בדיקה
  const now = serverTimestamp();
  const payload = {
    displayName,
    email,
    photoURL: clean(user.photoURL) || null,
    updatedAt: now,
  };

  const phoneDigits = normalizePhone(user.phoneNumber || "");
  if (phoneDigits && isValidPhoneDigits(phoneDigits)) {
    payload.phoneNumber = phoneDigits;
  } else if (!exists) {
    // Only seed null on first create; preserve existing manual entries afterwards
    payload.phoneNumber = null;
  }

  if (!exists) {
    payload.company = null;
    payload.city = null;
    payload.createdAt = now;
  }

  // שדות נוספים שמגיעים מהקליינט (כולל Marketing; עדיין לא מקבלים createdAt/updatedAt מהקליינט)
  if (extra && typeof extra === "object") {
    const e = pickAllowed(extra);

    if (typeof e.displayName === "string" && e.displayName.trim()) {
      payload.displayName = clean(e.displayName);
    }

    if (Object.prototype.hasOwnProperty.call(e, "phoneNumber")) {
      const digits = normalizePhone(e.phoneNumber || "");
      if (digits && isValidPhoneDigits(digits)) {
        payload.phoneNumber = digits;
      }
    }

    if (Object.prototype.hasOwnProperty.call(e, "company")) {
      const comp = clean(e.company);
      payload.company = comp || null;
    }

    if (Object.prototype.hasOwnProperty.call(e, "city")) {
      const cityValue = clean(e.city);
      payload.city = cityValue || null;
    }

    if (typeof e.marketingConsent === "boolean") {
      payload.marketingConsent = !!e.marketingConsent;
      if (e.marketingConsent) {
        payload.marketingConsentAt = now;
        if (typeof e.marketingConsentMethod === "string" && e.marketingConsentMethod.trim()) {
          payload.marketingConsentMethod = clean(e.marketingConsentMethod);
        }
      } else if (exists) {
        payload.marketingConsentAt = deleteField();
        payload.marketingConsentMethod = deleteField();
      }
    }
  }

  if (exists) {
    const cur = snap.data() || {};
    if (typeof cur.phone !== "undefined") payload.phone = deleteField();
    if (typeof cur.role !== "undefined") payload.role = deleteField();
    if (typeof cur.admin !== "undefined") payload.admin = deleteField();
    if (typeof cur.claims !== "undefined") payload.claims = deleteField();
    if (typeof cur.providerIds !== "undefined") payload.providerIds = deleteField();
    if (typeof cur.uid !== "undefined") payload.uid = deleteField();
  }

  try { await ensureAppCheckReady(); } catch {}
  await setDoc(ref, payload, { merge: true });

  return await readFresh(ref);
}

/* ---------- Read profile (cache-first) ---------- */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const ref = doc(db, "users_prod", uid);

  try {
    const snapCache = await getDocFromCache(ref);
    if (snapCache.exists()) return { id: snapCache.id, ...snapCache.data() };
  } catch {
    // ignore cache miss
  }

  const snap = (_getDocFromServer ? await _getDocFromServer(ref) : await getDoc(ref));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/* ---------- Update profile (merge) ---------- */
export async function updateUserProfile(uid, data = {}) {
  if (!uid) throw new Error("missing uid");
  const ref = doc(db, "users_prod", uid);
  const snap = (_getDocFromServer ? await _getDocFromServer(ref) : await getDoc(ref));
  const exists = snap.exists();
  const current = exists ? snap.data() || {} : {};

  const safe = pickAllowed(data);
  const payload = {};
  const now = serverTimestamp();

  if (exists) {
    if (typeof current.phone !== "undefined") payload.phone = deleteField();
    if (typeof current.role !== "undefined") payload.role = deleteField();
    if (typeof current.admin !== "undefined") payload.admin = deleteField();
    if (typeof current.claims !== "undefined") payload.claims = deleteField();
    if (typeof current.providerIds !== "undefined") payload.providerIds = deleteField();
    if (typeof current.uid !== "undefined") payload.uid = deleteField();
  }

  // displayName
  if ("displayName" in safe) {
    const v = clean(safe.displayName);
    if (v) {
      payload.displayName = v;
    } else if (exists) {
      payload.displayName = deleteField();
    }
  }

  // email
  if ("email" in safe) {
    const v = clean(String(safe.email || "")).toLowerCase();
    if (v && !isValidEmail(v)) throw new Error("אימייל לא תקין.");
    if (v) {
      payload.email = v;
    } else if (exists) {
      payload.email = deleteField();
    }
  }

  // phoneNumber – שמירת ספרות בלבד
  if ("phoneNumber" in safe) {
    const digits = normalizePhone(safe.phoneNumber);
    if (digits && !isValidPhoneDigits(digits)) throw new Error("מספר טלפון לא תקין.");
    if (digits) {
      payload.phoneNumber = digits;
    } else if (exists) {
      payload.phoneNumber = deleteField();
    }
  }

  // company
  if ("company" in safe) {
    const v = clean(safe.company);
    if (v) {
      payload.company = v;
    } else if (exists) {
      payload.company = deleteField();
    }
  }

  // city
  if ("city" in safe) {
    const v = clean(safe.city);
    if (v) {
      payload.city = v;
    } else if (exists) {
      payload.city = deleteField();
    }
  }

  // photoURL
  if ("photoURL" in safe) {
    const v = clean(safe.photoURL);
    if (v) {
      payload.photoURL = v;
    } else if (exists) {
      payload.photoURL = deleteField();
    }
  }

  // Marketing
  if (typeof safe.marketingConsent === "boolean") {
    payload.marketingConsent = safe.marketingConsent;
    if (safe.marketingConsent) {
      payload.marketingConsentAt = now;
      if (typeof safe.marketingConsentMethod === "string" && safe.marketingConsentMethod.trim()) {
        payload.marketingConsentMethod = clean(safe.marketingConsentMethod);
      }
    } else if (exists) {
      payload.marketingConsentAt = deleteField();
      payload.marketingConsentMethod = deleteField();
    }
  } else if (
    typeof safe.marketingConsentMethod === "string" &&
    safe.marketingConsentMethod.trim()
  ) {
    // עדכון שיטת האיסוף ללא שינוי ה-boolean (אם ביקשת מפורשות)
    payload.marketingConsentMethod = clean(safe.marketingConsentMethod);
  } else if (exists && "marketingConsentMethod" in safe) {
    // ניקוי ערך אם שלחת מחרוזת ריקה
    payload.marketingConsentMethod = deleteField();
  }

  if (!exists) {
    payload.createdAt = now;
  }
  payload.updatedAt = now;

  // אל תבצע כתיבה מיותרת אם אין מה לשנות
  const keysToWrite = Object.keys(payload).filter((k) => payload[k] !== undefined);
  if (keysToWrite.length === 0) {
    return await readFresh(ref);
  }

  try { await ensureAppCheckReady(); } catch {}
  await setDoc(ref, payload, { merge: true });
  return await readFresh(ref);
}

/* ---------- Marketing helpers ---------- */
export async function setMarketingConsentTrue(uid, method = "manual_update") {
  if (!uid) throw new Error("missing uid");
  const ref = doc(db, "users_prod", uid);
  const now = serverTimestamp();
  try { await ensureAppCheckReady(); } catch {}
  await setDoc(
    ref,
    {
      marketingConsent: true,
      marketingConsentAt: now,
      marketingConsentMethod: clean(method) || "manual_update",
      updatedAt: now,
      phone: deleteField(), // מחיקת שדה ישן על הדרך
    },
    { merge: true }
  );
  return await readFresh(ref);
}

export async function setMarketingConsentFalse(uid) {
  if (!uid) throw new Error("missing uid");
  const ref = doc(db, "users_prod", uid);
  const now = serverTimestamp();
  try { await ensureAppCheckReady(); } catch {}
  await setDoc(
    ref,
    {
      marketingConsent: false,
      marketingConsentAt: deleteField(),
      marketingConsentMethod: deleteField(),
      updatedAt: now,
      phone: deleteField(),
    },
    { merge: true }
  );
  return await readFresh(ref);
}

