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
  user: null,           // Firebase User (או null)
  profile: null,        // נתוני users/{uid} (או null)
  claims: null,         // custom claims (או null)
  loading: true,        // טוען (auth/profile)
  logout: async () => {}, // פונקציית יציאה
});

export const useAuth = () => useContext(AuthCtx);

/**
 * יצירה/מיזוג מסמך משתמש אם לא קיים
 */
async function ensureUserDoc(uid, base) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        displayName: base?.displayName || (base?.email ? base.email.split("@")[0] : "User"),
        email: base?.email || null,
        photoURL: base?.photoURL || null,
        role: "user",
        createdAt: serverTimestamp(),
        // אפשר להוסיף approved: false וכד' לפי הלוגיקה שלך
      },
      { merge: true }
    );
  } else {
    // מיזוג שדות חסרים בסיסיים (לא חובה)
    const data = snap.data() || {};
    const patch = {};
    if (!data.displayName && base?.displayName) patch.displayName = base.displayName;
    if (!data.email && base?.email) patch.email = base.email;
    if (!data.photoURL && base?.photoURL) patch.photoURL = base.photoURL;
    if (Object.keys(patch).length) {
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
        // ריענון כפוי כדי להימנע מ-401 / token mismatch
        await u.getIdToken(true);
        const tokenRes = await getIdTokenResult(u);
        if (mountedRef.current) {
          setClaims(tokenRes?.claims || null);
        }
      } catch (e) {
        // אם יש בעיית טוקן – ננסה לאפס סשן
        console.warn("[Auth] getIdToken/getIdTokenResult failed:", e?.code || e?.message || e);
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

      // ודא שקיים users/{uid}
      try {
        await ensureUserDoc(u.uid, {
          displayName: u.displayName,
          email: u.email,
          photoURL: u.photoURL,
        });
      } catch (e) {
        console.warn("[Auth] ensureUserDoc failed:", e?.message || e);
        // לא חוסם המשך; פשוט לא יהיה פרופיל עד ל-retry
      }

      // מאזין ריאקטיבי למסמך הפרופיל
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

    return () => {
      unsub();
    };
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
      loading: loadingAuth || loadingProfile,
      logout,
    }),
    [user, profile, claims, loadingAuth, loadingProfile]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
