// src/services/users.js
import { db } from "../firebase";
import {
  doc,
  getDoc,
  getDocFromCache,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

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

// ⚡️ מהיר: קודם מנסה cache, אם אין — שרת
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

// עדכון פרופיל
export async function updateUserProfile(uid, data) {
  if (!uid) throw new Error("missing uid");
  const ref = doc(db, "users", uid);
  const allowed = {};

  if (typeof data.displayName === "string") {
    allowed.displayName = data.displayName.trim();
  }
  if (typeof data.company === "string") {
    allowed.company = data.company.trim();
  }
  if (typeof data.phoneNumber === "string") {
    allowed.phoneNumber = data.phoneNumber.trim();
  }

  allowed.updatedAt = serverTimestamp();
  await setDoc(ref, allowed, { merge: true });
}
