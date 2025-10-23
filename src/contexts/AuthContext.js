// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { auth, db } from "../firebase";
import {
  onAuthStateChanged,
  getIdTokenResult,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

/**
 * צורת הקונטקסט
 */
const AuthCtx = createContext({
  user: null,             // Firebase User (או null)
  profile: null,          // users/{uid} (או null)
  claims: null,           // custom claims (או null)
  authLoading: true,      // טוען את Firebase Auth בלבד
  profileLoading: false,  // טוען את מסמך הפרופיל (לא חוסם מסכים)
  logout: async () => {},
});

export const useAuth = () => useContext(AuthCtx);

/* ===== Helpers ===== */

/** סנן רק מפתחות שמותרים לכללים (update: displayName/email/phoneNumber/company/photoURL/updatedAt; create מוסיף createdAt) */
function pickAllowedUserFields(base = {}) {
  const out = {};
  if (base.displayName != null) out.displayName = String(base.displayName);
  if (base.email != null)       out.email = String(base.email);
  if (base.phoneNumber != null) out.phoneNumber = String(base.phoneNumber);
  if (base.company != null)     out.company = String(base.company);
  if (base.photoURL != null)    out.photoURL = String(base.photoURL);
  return out;
}

/**
 * יצירה/מיזוג מסמך משתמש אם לא קיים — בתאימות לכללי Firestore
 * חשוב: לא כותבים role / providerIds / uid מהקליינט.
 * CREATE: חובה createdAt + updatedAt (serverTimestamp)
 * UPDATE: חובה updatedAt אם שולחים עדכון
 */
async function ensureUserDoc(uid, base) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  // בנה בסיס בטוח בלבד (כל מה שלא מאושר — לא יישלח)
  const allowedBase = pickAllowedUserFields({
    displayName: base?.displayName || (base?.email ? base.email.split("@")[0] : "User"),
    email: base?.email ?? null,
    photoURL: base?.photoURL ?? null,
    phoneNumber: base?.phoneNumber ?? null, // מה-Auth אם קיים
    company: base?.company ?? null,         // בדרך כלל null בהתחלה
  });

  if (!snap.exists()) {
    // CREATE: לפי הכללים חייבים גם createdAt וגם updatedAt == request.time (serverTimestamp)
    await setDoc(
      ref,
      {
        ...allowedBase,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: false } // יצירה נקייה; אפשר גם merge:true—אבל עדיף לשמור על צורת מסמך צפויה
    );
  } else {
    // UPDATE: רק אם יש מה לעדכן + חובה updatedAt
    const current = snap.data() || {};
    const patch = {};

    for (const k of ["displayName", "email", "photoURL", "phoneNumber", "company"]) {
      if (allowedBase[k] != null && !Object.is(allowedBase[k], current[k])) {
        patch[k] = allowedBase[k];
      }
    }

    if (Object.keys(patch).length) {
      patch.updatedAt = serverTimestamp();
      await setDoc(ref, patch, { merge: true });
    }
  }
}

/**
 * ספק קונטקסט
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [profile, setProfile] = useState(null);

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const profileUnsubRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // מאזין לשינויים באותנטיקציה
    const unsub = onAuthStateChanged(auth, async (u) => {
      // נקה מנוי פרופיל קודם בכל שינוי משתמש
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      setUser(u);
      setClaims(null);
      setProfile(null);

      if (!u) {
        setLoadingAuth(false);
        setLoadingProfile(false);
        return;
      }

      try {
        // לא מכריחים רענון טוקן כדי לא לעכב רינדור
        const tokenRes = await getIdTokenResult(u);
        if (mountedRef.current) setClaims(tokenRes?.claims || null);
      } catch (e) {
        console.warn("[Auth] getIdTokenResult failed:", e?.code || e?.message || e);
        try { await firebaseSignOut(auth); } catch {}
        if (mountedRef.current) {
          setUser(null);
          setClaims(null);
          setProfile(null);
        }
        setLoadingAuth(false);
        setLoadingProfile(false);
        return;
      }

      // ודא שקיים users/{uid} בהתאם לכללים
      try {
        await ensureUserDoc(u.uid, {
          displayName: u.displayName,
          email: u.email,
          photoURL: u.photoURL,
          phoneNumber: u.phoneNumber ?? null,
          // company: אפשר להוסיף בהמשך בטופס; כאן נשאיר null
        });
      } catch (e) {
        // לא חוסם את ה-UI — למשל במצבי App Check throttled / PERMISSION_DENIED
        console.warn("[Auth] ensureUserDoc failed (ignored):", e?.message || e);
      }

      // מאזין ריאקטיבי למסמך הפרופיל — לא חוסם את ה-UI
      setLoadingProfile(true);
      const ref = doc(db, "users", u.uid);
      profileUnsubRef.current = onSnapshot(
        ref,
        (snap) => {
          if (!mountedRef.current) return;
          setProfile(snap.exists() ? snap.data() : null);
          setLoadingProfile(false);
        },
        (err) => {
          console.error("[Auth] onSnapshot profile error:", err);
          if (!mountedRef.current) return;
          setProfile(null);
          setLoadingProfile(false);
        }
      );

      setLoadingAuth(false);
    });

    return () => unsub();
  }, []);

  // פונקציית יציאה
  const logout = async () => {
    try {
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }
      await firebaseSignOut(auth);
      setUser(null);
      setClaims(null);
      setProfile(null);
    } catch (e) {
      console.error("[Auth] logout failed:", e?.message || e);
    }
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      claims,
      authLoading:   loadingAuth,
      profileLoading: loadingProfile,
      logout,
    }),
    [user, profile, claims, loadingAuth, loadingProfile]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
