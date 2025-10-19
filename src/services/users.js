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
 * יצירת/עידכון מסמך משתמש בסיסי בכניסה ראשונה, או סינכרון נתונים בסיסיים.
 */
export async function ensureUserDoc(user, extra = null) {
  if (!user || !user.uid) return;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  const base = {
    uid: user.uid,
    displayName: user.displayName || user.email?.split("@")[0] || "User",
    email: user.email || null,
    photoURL: user.photoURL || null,
    phoneNumber: user.phoneNumber || null,
    providerIds: (user.providerData || []).map((p) => p.providerId),
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    await setDoc(
      ref,
      { ...base, role: "user", createdAt: serverTimestamp(), ...(extra || {}) },
      { merge: true }
    );
  } else {
    await setDoc(ref, { ...base, ...(extra || {}) }, { merge: true });
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
  } catch {} // אין בקאש – נמשיך לשרת

  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * עדכון פרופיל ב-Firestore (merge).
 * תומך בשדות: displayName, email, phoneNumber, company.
 * שדות ריקים יימחקו מהמסמך (deleteField).
 */
export async function updateUserProfile(uid, data = {}) {
  if (!uid) throw new Error("missing uid");
  const ref = doc(db, "users", uid);

  // נורמליזציה
  const clean = (v) => (typeof v === "string" ? v.trim() : v);

  // בנייה סלקטיבית של שדות מותרים בלבד
  const allowed = {};

  if (typeof data.displayName === "string") {
    const v = clean(data.displayName);
    allowed.displayName = v || deleteField();
  }

  if (typeof data.email === "string") {
    const v = clean(data.email)?.toLowerCase();
    // בדיקת אימייל בסיסית (לא חובה — Auth כבר אוכף, אבל טוב לנתון שמור)
    if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      throw new Error("אימייל לא תקין.");
    }
    allowed.email = v || deleteField();
  }

  if (typeof data.phoneNumber === "string") {
    const v = clean(data.phoneNumber);
    if (v && !/^[0-9+\-()\s]{7,20}$/.test(v)) {
      throw new Error("מספר טלפון לא תקין.");
    }
    allowed.phoneNumber = v || deleteField();
  }

  if (typeof data.company === "string") {
    const v = clean(data.company);
    allowed.company = v || deleteField();
  }

  // אפשר להעביר גם שדות נוספים, במקרי הצורך:
  // e.g. { updatedAt: new Date() } מהקריאה — אבל כאן נעדיף לאפשר רק המותר.
  // אם עדיין התקבלו שדות נוספים, נמזג אותם כפי שהם:
  const passthrough = {};
  for (const k of Object.keys(data)) {
    if (!(k in allowed) && !["createdAt", "updatedAt"].includes(k)) {
      // רק אם זה לא אחד מהשדות שכבר טיפלנו בהם ו/או timestamps
      passthrough[k] = data[k];
    }
  }

  await setDoc(
    ref,
    {
      ...passthrough,
      ...allowed,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
