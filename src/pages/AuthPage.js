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
      setError(err.message);
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
      setError(err.message);
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
      const extra =
        tab === "register" && marketingOptIn
          ? {
              marketingConsent: true,
              marketingConsentAt: new Date().toISOString(),
              marketingConsentMethod: "email_checkbox_register_google",
            }
          : null;

      await afterAuth(res.user, extra);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <h1 className="mb-4 text-center">Karina</h1>

      <div className="btn-group w-100 mb-3">
        <button
          className={`btn ${tab === "login" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setTab("login")}
          disabled={loading}
        >
          Login
        </button>
        <button
          className={`btn ${tab === "register" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setTab("register")}
          disabled={loading}
        >
          Register
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form
        onSubmit={tab === "login" ? handleLogin : handleRegister}
        className="card card-body"
      >
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Password</label>
          <input
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

        {/* ✅ צ'קבוקס הסכמה לדיוור – מוצג תמיד; נאכף רק בהרשמה */}
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
          {tab === "register" && !marketingOptIn && (
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
