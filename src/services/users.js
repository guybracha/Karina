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

/* ===== שדות מותרים במסמך users/{uid} =====
   displayName, email, phoneNumber, company, photoURL,
   marketingConsent, marketingConsentAt, marketingConsentMethod,
   createdAt, updatedAt
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

/* ---------- Utilities ---------- */
const clean = (v) => (typeof v === "string" ? v.trim() : v);
const normalizePhone = (s = "") => String(s || "").replace(/\D+/g, ""); // שומר רק ספרות

const isValidEmail = (v) =>
  typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// 7–15 ספרות (אחסון נקי אחרי normalizePhone)
const isValidPhoneDigits = (v) =>
  typeof v === "string" && /^\d{7,15}$/.test(v);

function pickAllowed(obj = {}) {
  const out = {};
  for (const k of Object.keys(obj || {})) {
    if (ALLOWED_KEYS.has(k)) out[k] = obj[k];
  }
  return out;
}

/* ---------- Create/Sync basic user doc ---------- */
export async function ensureUserDoc(user, extra = null) {
  if (!user?.uid) return null;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  const displayName =
    clean(user.displayName) ||
    (user.email ? String(user.email).split("@")[0] : "") ||
    "User";

  const email =
    user.email && isValidEmail(user.email)
      ? user.email.toLowerCase()
      : null;

  // נרמול טלפון לספרות בלבד + בדיקה
  const phoneDigits = normalizePhone(user.phoneNumber || "");
  const phoneNumber = phoneDigits && isValidPhoneDigits(phoneDigits) ? phoneDigits : null;

  const base = {
    displayName,
    email,
    phoneNumber,
    company: null,
    photoURL: clean(user.photoURL) || null,
    updatedAt: serverTimestamp(),
    // מחיקת השדה הישן אם קיים
    phone: deleteField(),
  };

  // שדות Marketing אופציונליים
  let marketing = {};
  if (extra && typeof extra === "object") {
    const e = pickAllowed(extra);
    if (typeof e.marketingConsent === "boolean") {
      if (e.marketingConsent) {
        marketing.marketingConsent = true;
        marketing.marketingConsentAt = serverTimestamp();
        if (typeof e.marketingConsentMethod === "string" && e.marketingConsentMethod.trim()) {
          marketing.marketingConsentMethod = clean(e.marketingConsentMethod);
        }
      } else {
        marketing.marketingConsent = false;
        marketing.marketingConsentAt = deleteField();
        marketing.marketingConsentMethod = deleteField();
      }
    }
  }

  if (!snap.exists()) {
    await setDoc(
      ref,
      { ...base, ...marketing, createdAt: serverTimestamp() },
      { merge: true }
    );
  } else {
    await setDoc(ref, { ...base, ...marketing }, { merge: true });
  }

  // החזרה מהשרת כדי לעקוף קאש
  const fresh = await getDoc(ref, { source: "server" });
  return fresh.exists() ? { id: fresh.id, ...fresh.data() } : null;
}

/* ---------- Read profile (cache-first) ---------- */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const ref = doc(db, "users", uid);

  try {
    const snapCache = await getDocFromCache(ref);
    if (snapCache.exists()) return { id: snapCache.id, ...snapCache.data() };
  } catch { /* ignore cache miss */ }

  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/* ---------- Update profile (merge) ---------- */
export async function updateUserProfile(uid, data = {}) {
  if (!uid) throw new Error("missing uid");
  const ref = doc(db, "users", uid);

  const safe = pickAllowed(data);
  const payload = {
    // מחיקה יזומה של השדה הישן
    phone: deleteField(),
  };

  // displayName
  if ("displayName" in safe) {
    const v = clean(safe.displayName);
    payload.displayName = v || deleteField();
  }

  // email
  if ("email" in safe) {
    const v = clean(String(safe.email || "")).toLowerCase();
    if (v && !isValidEmail(v)) throw new Error("אימייל לא תקין.");
    payload.email = v || deleteField();
  }

  // phoneNumber – שמירת ספרות בלבד
  if ("phoneNumber" in safe) {
    const digits = normalizePhone(safe.phoneNumber);
    if (digits && !isValidPhoneDigits(digits)) throw new Error("מספר טלפון לא תקין.");
    payload.phoneNumber = digits || deleteField();
  }

  // company
  if ("company" in safe) {
    const v = clean(safe.company);
    payload.company = v || deleteField();
  }

  // photoURL
  if ("photoURL" in safe) {
    const v = clean(safe.photoURL);
    payload.photoURL = v || deleteField();
  }

  // Marketing
  if (typeof safe.marketingConsent === "boolean") {
    payload.marketingConsent = safe.marketingConsent;
    if (safe.marketingConsent) {
      payload.marketingConsentAt = serverTimestamp();
      if (typeof safe.marketingConsentMethod === "string" && safe.marketingConsentMethod.trim()) {
        payload.marketingConsentMethod = clean(safe.marketingConsentMethod);
      }
    } else {
      payload.marketingConsentAt = deleteField();
      payload.marketingConsentMethod = deleteField();
    }
  } else if (typeof safe.marketingConsentMethod === "string" && safe.marketingConsentMethod.trim()) {
    payload.marketingConsentMethod = clean(safe.marketingConsentMethod);
  }

  payload.updatedAt = serverTimestamp();

  await setDoc(ref, payload, { merge: true });

  // החזרה מהשרת כדי לראות את הערכים המעודכנים (ולעקוף קאש/IndexedDB)
  const fresh = await getDoc(ref, { source: "server" });
  return fresh.exists() ? { id: fresh.id, ...fresh.data() } : null;
}

/* ---------- Marketing helpers ---------- */
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
      phone: deleteField(), // מחיקת שדה ישן על הדרך
    },
    { merge: true }
  );
  const fresh = await getDoc(ref, { source: "server" });
  return fresh.exists() ? { id: fresh.id, ...fresh.data() } : null;
}

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
      phone: deleteField(),
    },
    { merge: true }
  );
  const fresh = await getDoc(ref, { source: "server" });
  return fresh.exists() ? { id: fresh.id, ...fresh.data() } : null;
}
