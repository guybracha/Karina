import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  loginWithEmail,
  registerWithEmail,
  signInWithGoogle,
  collectRedirectResultIfAny,
  completeMagicLinkSignIn,
  upgradeAnonWithEmail,
} from "../services/auth";
import { auth } from "../firebase";
import { getAdditionalUserInfo, onAuthStateChanged, signOut } from "firebase/auth";

/* ============ קטן לשגיאות ידידותיות ============ */
function friendly(err) {
  const c = err?.code || "";
  if (c === "auth/invalid-credential") return "פרטי ההתחברות שגויים.";
  if (c === "auth/user-not-found") return "לא נמצא משתמש עם האימייל הזה.";
  if (c === "auth/wrong-password") return "הסיסמה שגויה.";
  if (c === "auth/email-already-in-use") return "האימייל כבר רשום.";
  if (c === "auth/too-many-requests") return "יותר מדי ניסיונות. נסו שוב מאוחר יותר.";
  if (c === "auth/popup-blocked") return "הדפדפן חסם את חלון Google. נסו Redirect.";
  if (c === "auth/popup-closed-by-user") return "חלון Google נסגר לפני השלמת ההתחברות.";
  return err?.message || "שגיאה בלתי צפויה.";
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // איסוף תוצאת redirect ומג'יק לינק אם חזרנו
  useEffect(() => {
    (async () => {
      try {
        const magic = await completeMagicLinkSignIn();
        if (magic?.user) {
          setInfo("נכנסת בהצלחה עם לינק!");
          return;
        }
      } catch (e) { setError(friendly(e)); }

      try {
        const res = await collectRedirectResultIfAny();
        if (res?.user) setInfo("התחברות Google הושלמה.");
      } catch (e) { setError(friendly(e)); }
    })();
  }, []);

  // אם כבר מחוברים — אפשר להציג הודעה/להפנות
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setInfo("את/ה מחובר/ת.");
    });
    return () => unsub();
  }, []);

  async function onLogin(e) {
    e.preventDefault();
    setError(null); setInfo(null); setLoading(true);
    try {
      await loginWithEmail(email.trim(), password);
      setInfo("התחברת בהצלחה! מעביר אותך לאזור האישי...");
      setTimeout(() => navigate("/account"), 1000);
    } catch (e) { setError(friendly(e)); }
    finally { setLoading(false); }
  }

  async function onRegister(e) {
    e.preventDefault();
    setError(null); setInfo(null);
    if (!marketingOptIn) { setError("יש לאשר קבלת דיוורים כדי להירשם."); return; }
    setLoading(true);
    try {
      // אם אורח – שדרג, אחרת רשום משתמש חדש
      if (auth.currentUser?.isAnonymous) {
        await upgradeAnonWithEmail(email.trim(), password);
      } else {
        await registerWithEmail(email.trim(), password);
      }
      setInfo("נרשמת בהצלחה! מעביר אותך לאזור האישי...");
      setTimeout(() => navigate("/account"), 1000);
    } catch (e) { setError(friendly(e)); }
    finally { setLoading(false); }
  }

  async function onGoogle() {
    setError(null); setInfo(null); setLoading(true);
    try {
      const res = await signInWithGoogle(); // ייתכן שיחזור null בעת redirect
      if (!res?.user) setInfo("מועברים להשלמת התחברות…");
      else {
        const isNew = !!getAdditionalUserInfo(res)?.isNewUser;
        if (isNew && !marketingOptIn) {
          try { await signOut(auth); } catch {}
          setTab("register");
          setError("זהו חיבור ראשון עם Google. אנא אשר/י קבלת דיוורים והרשמה.");
        } else {
          setInfo("התחברת עם Google! מעביר אותך לאזור האישי...");
          setTimeout(() => navigate("/account"), 1000);
        }
      }
    } catch (e) { setError(friendly(e)); }
    finally { setLoading(false); }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <h1 className="mb-4 text-center">ברוכים הבאים לקארינה חולצות מודפסות</h1>

      <div className="btn-group w-100 mb-3" role="tablist">
        <button className={`btn ${tab === "login" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setTab("login")} disabled={loading}>
          כניסה
        </button>
        <button className={`btn ${tab === "register" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setTab("register")} disabled={loading}>
          הרשמה
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      <form onSubmit={tab === "login" ? onLogin : onRegister} className="card card-body" noValidate>
        <div className="mb-3">
          <label className="form-label" htmlFor="email">Email</label>
          <input id="email" type="email" className="form-control"
                 value={email} onChange={(e) => setEmail(e.target.value)}
                 required autoComplete="email" disabled={loading}/>
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="pwd">Password</label>
          <input id="pwd" type="password" className="form-control"
                 value={password} onChange={(e) => setPassword(e.target.value)}
                 required minLength={6}
                 autoComplete={tab === "login" ? "current-password" : "new-password"}
                 disabled={loading}/>
        </div>

        <div className="form-check mb-3">
          <input id="mk" className="form-check-input" type="checkbox"
                 checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)}
                 disabled={loading}/>
          <label className="form-check-label" htmlFor="mk">
            <span className="text-danger">*</span> אני מאשר/ת קבלת דיוורים במייל (ניתן להסרה בכל עת).
          </label>
          {(tab === "register" && !marketingOptIn) &&
            <div className="form-text text-danger">חובה לאשר כדי להשלים הרשמה.</div>}
        </div>

        <button className="btn btn-primary w-100" disabled={loading}>
          {loading ? "מעבד…" : tab === "login" ? "Login" : "Create account"}
        </button>

        <button type="button" className="btn btn-outline-secondary w-100 mt-2"
                onClick={onGoogle} disabled={loading}>
          Continue with Google
        </button>
      </form>
    </div>
  );
}


