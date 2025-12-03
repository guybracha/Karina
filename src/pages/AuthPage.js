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
import { ensureUserDoc } from "../services/users";
import { auth } from "../firebase";
import { getAdditionalUserInfo, onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import useCities from "../hooks/useCities";

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
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const isRegister = tab === "register";
  const { filtered: filteredCities, loading: loadingCities } = useCities(city);
  const citySuggestions = filteredCities.slice(0, 12);

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

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();
    const digits = phoneNumber.replace(/\D+/g, "");
    const companyName = company.trim();
    const cityName = city.trim();

    // בדיקות חובה
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("יש להזין כתובת אימייל תקינה.");
      return;
    }
    if (!trimmedName) { setError("יש להזין שם מלא."); return; }
    if (digits.length < 9) { setError("יש להזין מספר טלפון תקין (לפחות 9 ספרות)."); return; }
    if (!companyName) { setError("יש להזין שם חברה."); return; }
    if (!cityName) { setError("יש להזין עיר."); return; }

    setLoading(true);
    try {
      // אם אורח – שדרג, אחרת רשום משתמש חדש
      let cred;
      if (auth.currentUser?.isAnonymous) {
        cred = await upgradeAnonWithEmail(trimmedEmail, password);
      } else {
        cred = await registerWithEmail(trimmedEmail, password);
      }

      const user = cred?.user || auth.currentUser;
      if (!user) throw new Error("missing_user");

      if (trimmedName) {
        try { await updateProfile(user, { displayName: trimmedName }); }
        catch (err) { console.warn("updateProfile failed", err); }
      }

      await ensureUserDoc(user, {
        displayName: trimmedName,
        phoneNumber: digits,
        company: companyName,
        city: cityName,
        marketingConsent: marketingOptIn,
        marketingConsentMethod: "signup_form",
      });

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
        if (isNew) {
          // משתמש חדש דרך Google - צריך לוודא שיש קבלת דיוורים ופרטים נוספים
          if (!marketingOptIn) {
            try { await signOut(auth); } catch {}
            setTab("register");
            setError("זהו חיבור ראשון עם Google. אנא אשר/י קבלת דיוורים והרשמה.");
            return;
          }
          
          // קבלנו אישור דיוורים - עכשיו צריך פרטים נוספים
          const user = res.user;
          const displayName = user.displayName || "";
          const userEmail = user.email || "";
          
          // בדיקה אם יש מספר טלפון
          if (!user.phoneNumber) {
            // אין טלפון - צריך לבקש
            alert("שלום " + displayName + "!\n\n" +
                  "כדי להשלים את ההרשמה לאתר קארינה, נדרשים מספר פרטים נוספים:\n" +
                  "• מספר טלפון (חובה)\n" +
                  "• שם חברה / ארגון\n" +
                  "• עיר מגורים\n\n" +
                  "אנא מלא/י את הפרטים בחלונות הבאים.");
            
            const phone = prompt("מספר טלפון (לדוגמה: 050-1234567):");
            if (!phone || phone.trim().replace(/\D+/g, "").length < 9) {
              try { await signOut(auth); } catch {}
              setError("מספר טלפון חובה להשלמת ההרשמה (לפחות 9 ספרות). נא לנסות שוב.");
              return;
            }
            
            const phoneDigits = phone.trim().replace(/\D+/g, "");
            
            // בקש גם חברה ועיר
            const companyName = prompt("שם חברה / ארגון:");
            if (!companyName || !companyName.trim()) {
              try { await signOut(auth); } catch {}
              setError("שם חברה חובה להשלמת ההרשמה. נא לנסות שוב.");
              return;
            }
            
            const cityName = prompt("עיר מגורים / פעילות:");
            if (!cityName || !cityName.trim()) {
              try { await signOut(auth); } catch {}
              setError("עיר חובה להשלמת ההרשמה. נא לנסות שוב.");
              return;
            }
            
            // שמירת הפרטים
            await ensureUserDoc(user, {
              displayName,
              phoneNumber: phoneDigits,
              company: companyName.trim(),
              city: cityName.trim(),
              marketingConsent: true,
              marketingConsentMethod: "google_signup",
            });
          } else {
            // יש טלפון - רק נשמור את הסכמת הדיוורים
            await ensureUserDoc(user, {
              marketingConsent: true,
              marketingConsentMethod: "google_signup",
            });
          }
        }
        
        setInfo("התחברת עם Google! מעביר אותך לאזור האישי...");
        setTimeout(() => navigate("/account"), 1000);
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
          <label className="form-label" htmlFor="email">
            {isRegister && <span className="text-danger">* </span>}
            Email
          </label>
          <input id="email" type="email" className="form-control"
                 value={email} onChange={(e) => setEmail(e.target.value)}
                 required autoComplete="email" disabled={loading}/>
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="pwd">
            {isRegister && <span className="text-danger">* </span>}
            Password
          </label>
          <input id="pwd" type="password" className="form-control"
                 value={password} onChange={(e) => setPassword(e.target.value)}
                 required minLength={6}
                 autoComplete={isRegister ? "new-password" : "current-password"}
                 disabled={loading}/>
        </div>

        {isRegister && (
          <>
            <div className="mb-3">
              <label className="form-label" htmlFor="fullName">
                <span className="text-danger">* </span>שם מלא
              </label>
              <input
                id="fullName"
                type="text"
                className="form-control"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                disabled={loading}
              />
            </div>

            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="phone">
                  <span className="text-danger">* </span>טלפון
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="form-control"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="05x-xxxxxxx"
                  disabled={loading}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="company">
                  <span className="text-danger">* </span>שם חברה / ארגון
                </label>
                <input
                  id="company"
                  type="text"
                  className="form-control"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  autoComplete="organization"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mb-3 mt-3">
              <label className="form-label" htmlFor="city">
                <span className="text-danger">* </span>עיר מגורים / פעילות
              </label>
              <input
                id="city"
                type="text"
                className="form-control"
                list="signup-city-options"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                autoComplete="address-level2"
                disabled={loading}
                placeholder={loadingCities ? "טוען ערים..." : ""}
              />
              <datalist id="signup-city-options">
                {citySuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <small className="form-text text-muted">
                נעשה בפרטים שימוש רק כדי לאמת הזמנות ולזהות אתכם מול שירות הלקוחות.
              </small>
            </div>
          </>
        )}

        <div className="form-check mb-3">
          <input id="mk" className="form-check-input" type="checkbox"
                 checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)}
                 disabled={loading}/>
          <label className="form-check-label" htmlFor="mk">
            <span className="text-danger">*</span> אני מאשר/ת קבלת דיוורים במייל (ניתן להסרה בכל עת).
          </label>
          {(isRegister && !marketingOptIn) &&
            <div className="form-text text-danger">חובה לאשר כדי להשלים הרשמה.</div>}
        </div>

        <button className="btn btn-primary w-100" disabled={loading}>
          {loading ? "מעבד…" : isRegister ? "Create account" : "Login"}
        </button>

        <button type="button" className="btn btn-outline-secondary w-100 mt-2"
                onClick={onGoogle} disabled={loading}>
          Continue with Google
        </button>
      </form>
    </div>
  );
}
