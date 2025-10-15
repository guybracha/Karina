// src/pages/AuthPage.js
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  loginWithEmail,
  registerWithEmail,
  signInWithGoogle,
} from "../services/auth";
import { ensureUserDoc } from "../services/users"; // יוצר/מעדכן users/{uid}
import { auth } from "../firebase";

// ✅ חדשות
import { getAdditionalUserInfo, signOut } from "firebase/auth";

function friendlyError(e) {
  const code = e?.code || "";
  if (code.includes("appCheck") || code.includes("app-check") || /fetch-status-error/i.test(e?.message || "")) {
    return "נראה שיש בעיית App Check (אימות מול reCAPTCHA). רענן את העמוד ונסה שוב. אם הבעיה חוזרת – ודא שהדומיין מאושר ושהאבטחה בדפדפן לא חוסמת.";
  }
  if (code === "auth/popup-closed-by-user") return "חלון Google נסגר לפני השלמת ההתחברות.";
  if (code === "auth/cancelled-popup-request") return "בקשת התחברות קודמת בוטלה.";
  if (code === "auth/popup-blocked") return "הדפדפן חסם את חלון ההתחברות. בטל חסימה או השתמש במצב Redirect.";
  if (code === "auth/invalid-credential") return "פרטי ההתחברות שגויים.";
  if (code === "auth/user-not-found") return "לא נמצא משתמש עם האימייל הזה.";
  if (code === "auth/wrong-password") return "הסיסמה שגויה.";
  if (code === "auth/too-many-requests") return "יותר מדי ניסיונות. נסה שוב מאוחר יותר.";
  return e?.message || "שגיאה לא צפויה. נסה שוב.";
}

export default function AuthPage() {
  const [tab, setTab] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false); // ✅ אישור דיוור
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/account";

  async function afterAuth(user, extra = null) {
    // צור/עדכן מסמך משתמש ואז נווט
    await ensureUserDoc(user || auth.currentUser, extra || undefined);
    navigate(from, { replace: true });
  }

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

    // ✅ חסימה אם אין אישור דיוור
    if (!marketingOptIn) {
      setError("יש לאשר קבלת דיוורים וחומר פרסומי כדי להירשם.");
      return;
    }

    setLoading(true);
    try {
      const user = await registerWithEmail(email.trim(), password);
      alert("Verification email sent");

      // נעביר את ההסכמה למסמך המשתמש
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

  async function handleGoogle() {
    setError(null);

    // אם אנחנו בטאב הרשמה — גם Google מחייב אישור
    if (tab === "register" && !marketingOptIn) {
      setError("יש לאשר קבלת דיוורים וחומר פרסומי כדי להירשם.");
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithGoogle();

      // ✅ חדש: נזהה האם המשתמש חדש (first sign-in via Google)
      const info = getAdditionalUserInfo(res);
      const isNew = !!info?.isNewUser;

      // אם המשתמש חדש אבל לא אישר דיוור (למשל נכנס מהטאב Login) — נבטל את ההרשמה
      if (isNew && !marketingOptIn) {
        try {
          await signOut(auth);
        } catch {}
        setTab("register");
        setError("נראה שזו התחברות ראשונה עם Google. כדי ליצור חשבון חדש יש לאשר קבלת דיוורים (ניתן להסרה בכל עת). סמן/י את הצ׳קבוקס והמשך/י.");
        return;
      }

      const extra =
        (tab === "register" || isNew) && marketingOptIn
          ? {
              marketingConsent: true,
              marketingConsentAt: new Date().toISOString(),
              marketingConsentMethod: isNew ? "google_first_signin_checkbox" : "email_checkbox_register_google",
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
      <h1 className="mb-4 text-center">Karina</h1>

      <div className="btn-group w-100 mb-3" role="tablist" aria-label="Auth tabs">
        <button
          className={`btn ${tab === "login" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setTab("login")}
          disabled={loading}
          aria-pressed={tab === "login"}
        >
          Login
        </button>
        <button
          className={`btn ${tab === "register" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setTab("register")}
          disabled={loading}
          aria-pressed={tab === "register"}
        >
          Register
        </button>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

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

        {/* ✅ צ'קבוקס הסכמה לדיוור – מוצג תמיד; נאכף בהרשמה ובגוגל-משתמש-חדש */}
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
            <div className="form-text text-danger">
              חובה לאשר כדי להשלים הרשמה.
            </div>
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
