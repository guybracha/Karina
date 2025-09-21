import React, { createContext, useContext, useEffect, useState } from "react";
import { watchAuth, logout } from "../services/auth";
import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const AuthCtx = createContext({ user:null, profile:null, loading:true, logout: async()=>{} });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return watchAuth(async (u) => {
      setUser(u);
      if (u) {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            displayName: u.displayName || (u.email ? u.email.split("@")[0] : "User"),
            role: "user",
            createdAt: serverTimestamp(),
          }, { merge: true });
          setProfile({ displayName: u.displayName || "User", role: "user" });
        } else {
          setProfile(snap.data());
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  return (
    <AuthCtx.Provider value={{ user, profile, loading, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
