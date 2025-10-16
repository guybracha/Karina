// src/pages/AuthPage.js
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  loginWithEmail,
  registerWithEmail,
  signInWithGoogle, // פונקציה שלך מה services/auth – יכולה להיות popup עם fallback ל-redirect
} from "../services/auth";
import { ensureUserDoc } from "../services/users";
import { auth } from "../firebase";

import {
  getAdditionalUserInfo,
  getRedirectResult,
  signOut,
} from "firebase/auth";

// נשמור בבאפר קטן את מצב ההסכמה לדיוור בעת התחלת Google (כדי לחזור לאחר redirect)
const LS_GOOGLE_CONSENT_KEY = "karina:auth:googleConsent";

function friendlyError(e) {
  const code = e?.code || "";
  const msg = e?.message || "";

  // App Check / fetch בעיות נפוצות
  if (code.includes("appCheck") || /app\-check/i.test(code) || /fetch-status-error/i.test(msg)) {
    return "נראה שיש בעיית App Check / רשת. רעננו את העמוד ונסו שוב. ודאו שהדומיין מאושר ושהדפדפן לא חוסם.";
  }

  // דפדפן וחלונות קופצים
  if (code === "auth/popup-blocked") return "הדפדפן חסם את חלון ההתחברות. בטלו חסימה או השתמשו בכניסה בעזרת Redirect.";
  if (code === "auth/popup-closed-by-user") return "חלון Google נסגר לפני השלמת ההתחברות.";
  if (code === "auth/cancelled-popup-request") return "בקשת התחברות קודמת בוטלה.";

  // הרשאות/קרדנצ'יאל
  if (code === "auth/invalid-credential") return "פרטי ההתחברות שגויים.";
  if (code === "auth/user-not-found") return "לא נמצא משתמש עם האימייל הזה.";
  if (code === "auth/wrong-password") return "הסיסמה שגויה.";
  if (code === "auth/too-many-requests") return "יותר מדי ניסיונות. נסו שוב מאוחר יותר.";

  // השגיאה הנפוצה בלוקאל כשיש Redirect URI/דומיין/קאש לא מסונכרן
  if (code === "auth/internal-error") {
    return "שגיאה פנימית באימות. נסו לרענן, לנקות אחסון אתר (Application→Clear storage) ולבדוק שה-Redirect URI ו-doman מורשים ל-localhost.";
  }

  return msg || "שגיאה לא צפויה. נסו שוב.";
}

export default function AuthPage() {
  const [tab, setTab] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState(null);
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
      new Promise((resolve) => setTimeout(resolve, 800)), // לא לעכב את ה־UI
    ]);
  } catch (e) {
    console.warn("[Auth] ensureUserDoc failed (background):", e?.code || e?.message || e);
  }
}


  // --- טיפול בתוצאת Redirect (אם popup לא זמין/נחסם) ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getRedirectResult(auth);
        if (!mounted || !res?.user) return;

        const info = getAdditionalUserInfo(res);
        const isNew = !!info?.isNewUser;

        const wantConsent = localStorage.getItem(LS_GOOGLE_CONSENT_KEY) === "1";
        localStorage.removeItem(LS_GOOGLE_CONSENT_KEY);

        if (isNew && !wantConsent) {
          // משתמש חדש שלא נתן הסכמה – נבטל ונוודא שהטאב הוא "register"
          try { await signOut(auth); } catch {}
          setTab("register");
          setError("נראה שזו התחברות ראשונה עם Google. כדי ליצור חשבון חדש יש לאשר קבלת דיוורים (ניתן להסרה בכל עת). סמנו את הצ׳קבוקס והמשיכו.");
          return;
        }

        const extra = (isNew && wantConsent)
          ? {
              marketingConsent: true,
              marketingConsentAt: new Date().toISOString(),
              marketingConsentMethod: "google_first_signin_checkbox",
            }
          : null;

        await afterAuth(res.user, extra);
      } catch (e) {
        // אם אין redirect פעיל, רוב הסיכויים שנקבל null; שגיאה אמיתית – נציג
        if (e?.code) setError(friendlyError(e));
      }
    })();
    return () => { mounted = false; };
  }, []); // ריצה פעם אחת

  // --- Email/Password ---
  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await loginWithEmail(email.trim(), password);
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

    if (!marketingOptIn) {
      setError("יש לאשר קבלת דיוורים וחומר פרסומי כדי להירשם.");
      return;
    }

    setLoading(true);
    try {
      const user = await registerWithEmail(email.trim(), password);
      // אפשר לשלוח אימייל אימות כאן אם לא נעשה בשכבת ה-service
      // alert("Verification email sent");

      await afterAuth(user, {
        marketingConsent: true,
        marketingConsentAt: new Date().toISOString(),
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

    // אם אנחנו בטאב הרשמה – מחייבים הסכמה מראש
    const mustConsent = (tab === "register");
    if (mustConsent && !marketingOptIn) {
      setError("יש לאשר קבלת דיוורים וחומר פרסומי כדי להירשם.");
      return;
    }

    // נשמור מה המשתמש בחר רגע לפני שנצא ל-redirect (אם זה מה שיהיה)
    localStorage.setItem(LS_GOOGLE_CONSENT_KEY, (marketingOptIn ? "1" : "0"));

    setLoading(true);
    try {
      const res = await signInWithGoogle(); // עשוי להחזיר תוצאה (popup) או לצאת ל-redirect (undefined)
      if (!res?.user) {
        // במקרה redirect – נמתין ל-getRedirectResult ב-useEffect
        return;
      }

      // popup הצליח כאן ועכשיו
      const info = getAdditionalUserInfo(res);
      const isNew = !!info?.isNewUser;
      if (isNew && !marketingOptIn) {
        try { await signOut(auth); } catch {}
        setTab("register");
        setError("נראה שזו התחברות ראשונה עם Google. כדי ליצור חשבון חדש יש לאשר קבלת דיוורים (ניתן להסרה בכל עת). סמנו את הצ׳קבוקס והמשיכו.");
        return;
      }

      const extra = (isNew && marketingOptIn)
        ? {
            marketingConsent: true,
            marketingConsentAt: new Date().toISOString(),
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

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

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
