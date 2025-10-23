// src/pages/AuthPage.js
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  loginWithEmail,
  registerWithEmail,
  signInWithGoogle,           // Popup עם fallback ל-redirect (ב-service)
  collectRedirectResultIfAny, // איסוף תוצאת redirect
  isRedirecting,              // דגל redirect ב-sessionStorage
} from "../services/auth";
import { ensureUserDoc } from "../services/users";
import { auth } from "../firebase";

import {
  getAdditionalUserInfo,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

const LS_GOOGLE_CONSENT_KEY = "karina:auth:googleConsent";

/* ============ Helpers ============ */
function friendlyError(e) {
  const code = e?.code || "";
  const msg  = e?.message || "";

  // App Check / רשת
  if (code.includes("appCheck") || /app\-check/i.test(msg) || /fetch-status-error/i.test(msg)) {
    return "נראה שיש בעיית App Check / רשת. רעננו את העמוד או נסו אינקוגניטו.";
  }
  // Popup
  if (code === "auth/popup-blocked") return "הדפדפן חסם את חלון ההתחברות. בטלו חסימה או השתמשו בכניסה בעזרת Redirect.";
  if (code === "auth/popup-closed-by-user") return "חלון Google נסגר לפני השלמת ההתחברות.";
  if (code === "auth/cancelled-popup-request") return "בקשת התחברות קודמת בוטלה.";
  // אימות/קרדנצ'יאל
  if (code === "auth/invalid-credential") return "פרטי ההתחברות שגויים.";
  if (code === "auth/user-not-found") return "לא נמצא משתמש עם האימייל הזה.";
  if (code === "auth/wrong-password") return "הסיסמה שגויה.";
  if (code === "auth/too-many-requests") return "יותר מדי ניסיונות. נסו שוב מאוחר יותר.";
  if (code === "auth/internal-error") {
    return "שגיאה פנימית באימות. נסו לרענן ולבדוק שהדומיין/Redirect מאושרים.";
  }
  return msg || "שגיאה לא צפויה. נסו שוב.";
}

const pickUser = (res) => (res?.user ? res.user : res);

/* ============ Component ============ */
export default function AuthPage() {
  const [tab, setTab] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/account";

  async function afterAuth(user, extra = null) {
    const u = user || auth.currentUser;
    if (!u) return;

    // ניווט מיידי – לא מחכים ל-Firestore
    navigate(from, { replace: true });

    // יצירת/מיזוג מסמך המשתמש ברקע (עם תקרת זמן קצרה)
    try {
      await Promise.race([
        ensureUserDoc(u, extra || undefined),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch (e) {
      console.warn("[Auth] ensureUserDoc failed (background):", e?.code || e?.message || e);
    }
  }

  // --- טיפול בתוצאת Redirect (אם popup נחסם) ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      const wasRedirecting = isRedirecting();
      if (wasRedirecting) setInfo("מסיים התחברות…");

      try {
        const res = await collectRedirectResultIfAny(); // מנקה דגל redirect ב-service
        if (!mounted || !res?.user) return;

        const infoRes = getAdditionalUserInfo(res);
        const isNew = !!infoRes?.isNewUser;

        let wantConsent = false;
        try { wantConsent = localStorage.getItem(LS_GOOGLE_CONSENT_KEY) === "1"; }
        catch {}

        try { localStorage.removeItem(LS_GOOGLE_CONSENT_KEY); } catch {}

        if (isNew && !wantConsent) {
          try { await signOut(auth); } catch {}
          setTab("register");
          setError("זו התחברות ראשונה עם Google. כדי ליצור חשבון חדש יש לאשר קבלת דיוורים. סמנו את הצ׳קבוקס והמשיכו.");
          return;
        }

        // אל תשלחו marketingConsentAt כאן — השרת ישים serverTimestamp()
        const extra = (isNew && wantConsent)
          ? {
              marketingConsent: true,
              marketingConsentMethod: "google_first_signin_checkbox",
            }
          : null;

        await afterAuth(res.user, extra);
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        if (wasRedirecting) setInfo(null);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // --- אם כבר מחוברים – ננווט פנימה (לא בזמן redirect) ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && !isRedirecting()) navigate(from, { replace: true });
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Email/Password ---
  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await loginWithEmail(email.trim(), password);
      const user = pickUser(res);
      if (!user) throw new Error("Login returned no user.");
      await afterAuth(user);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!marketingOptIn) {
      setError("יש לאשר קבלת דיוורים כדי להירשם.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerWithEmail(email.trim(), password);
      const user = pickUser(res);
      if (!user) throw new Error("Register returned no user.");

      await afterAuth(user, {
        marketingConsent: true,
        marketingConsentMethod: "email_checkbox_register",
      });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  // --- Google ---
  async function handleGoogle() {
    setError(null);
    setInfo(null);

    const mustConsent = (tab === "register");
    if (mustConsent && !marketingOptIn) {
      setError("יש לאשר קבלת דיוורים כדי להירשם.");
      return;
    }

    try { localStorage.setItem(LS_GOOGLE_CONSENT_KEY, (marketingOptIn ? "1" : "0")); }
    catch {}

    setLoading(true);
    try {
      const res = await signInWithGoogle(); // אם fallback ל-redirect, res=null
      if (!res?.user) {
        setInfo("מועברים להשלמת התחברות…");
        return; // ה-useEffect של redirect יאסוף כשנחזור
      }

      const infoRes = getAdditionalUserInfo(res);
      const isNew = !!infoRes?.isNewUser;
      if (isNew && !marketingOptIn) {
        try { await signOut(auth); } catch {}
        setTab("register");
        setError("זו התחברות ראשונה עם Google. כדי ליצור חשבון חדש יש לאשר קבלת דיוורים.");
        return;
      }

      const extra = (isNew && marketingOptIn)
        ? {
            marketingConsent: true,
            marketingConsentMethod: "google_first_signin_checkbox",
          }
        : null;

      await afterAuth(res.user, extra);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <h1 className="mb-4 text-center">ברוכים הבאים לקארינה חולצות מודפסות</h1>

      <div className="btn-group w-100 mb-3" role="tablist" aria-label="Auth tabs">
        <button
          className={`btn ${tab === "login" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setTab("login")}
          disabled={loading}
          aria-pressed={tab === "login"}
        >
          כניסה
        </button>
        <button
          className={`btn ${tab === "register" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setTab("register")}
          disabled={loading}
          aria-pressed={tab === "register"}
        >
          הרשמה
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      <form
        onSubmit={tab === "login" ? handleLogin : handleRegister}
        className="card card-body"
        noValidate
      >
        <div className="mb-3">
          <label className="form-label" htmlFor="authEmail">Email</label>
          <input
            id="authEmail"
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
            inputMode="email"
          />
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="authPassword">Password</label>
          <input
            id="authPassword"
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={tab === "login" ? "current-password" : "new-password"}
            disabled={loading}
          />
        </div>

        {/* צ'קבוקס הסכמה לדיוור – נאכף בהרשמה וב-First Google Sign-in */}
        <div className="form-check mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="marketingOptIn"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            disabled={loading}
          />
          <label className="form-check-label" htmlFor="marketingOptIn">
            <span className="text-danger">*</span>{" "}
            אני מאשר/ת קבלת דיוורים וחומר פרסומי במייל מהחנות (ניתן להסרה בכל עת).
          </label>
          {(tab === "register" && !marketingOptIn) && (
            <div className="form-text text-danger">חובה לאשר כדי להשלים הרשמה.</div>
          )}
        </div>

        <button className="btn btn-primary w-100" disabled={loading}>
          {loading ? "Please wait…" : tab === "login" ? "Login" : "Create account"}
        </button>

        <button
          type="button"
          className="btn btn-outline-secondary w-100 mt-2"
          onClick={handleGoogle}
          disabled={loading}
        >
          Continue with Google
        </button>
      </form>
    </div>
  );
}
