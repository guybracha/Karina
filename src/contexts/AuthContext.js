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
  onSnapshot,
} from "firebase/firestore";

// ✅ ייבוא ה-service המרכזי שלך
import { ensureUserDoc as ensureUserDocService } from "../services/users";

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
    const unsub = onAuthStateChanged(auth, async (u) => {
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

      // יצירה/סנכרון מסמך משתמש בתאימות מלאה לרולס
      try {
        await ensureUserDocService(u, /* extra */ null);
      } catch (e) {
        // לא חוסם UI; אם App Check כבוי והכללים תקינים זה לא אמור לקרות
        console.warn("[Auth] ensureUserDoc failed (ignored):", e?.message || e);
      }

      // האזן לפרופיל
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
