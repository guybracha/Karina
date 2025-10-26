// src/pages/Account.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserProfile, updateUserProfile } from "../services/users";
import { getMyOrders } from "../services/orders";
import { logout } from "../services/auth";

import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from "../firebase";

import {
  updateProfile,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

import { doc, onSnapshot } from "firebase/firestore";

/* ===== Helpers ===== */
function shekels(amountCentsOrFloat) {
  let n = Number(amountCentsOrFloat || 0);
  if (n > 0 && n % 1 === 0 && n > 1000) n = n / 100;
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(n);
}

function statusBadgeClass(status) {
  const map = {
    pending: "bg-secondary",
    paid: "bg-success",
    failed: "bg-danger",
    canceled: "bg-danger",
    fulfilled: "bg-primary",
    shipped: "bg-info text-dark",
    processing: "bg-warning text-dark",
    "נשלח": "bg-info text-dark",
    "הושלם": "bg-primary",
    "בטיפול": "bg-warning text-dark",
    "התקבלה": "bg-info text-dark",
    "בוטלה": "bg-danger",
  };
  return `badge ${map[status] || "bg-secondary"}`;
}

// מציג טלפון בפורמט נעים; הנתון במסמך נשמר כספרות בלבד
const prettyPhone = (s = "") => {
  const d = String(s || "").replace(/\D+/g, "");
  if (!d) return "";
  return d.replace(/^(\d{3})(\d+)$/, "$1-$2");
};

// זיהוי שגיאות App Check / הרשאות להודעה ידידותית
function friendlyFirestoreError(err) {
  const code = err?.code || "";
  const msg  = err?.message || "";
  if (/app\-check/i.test(code) || /appCheck/i.test(msg) || /throttled/i.test(msg)) {
    return "נחסמה הגישה עקב App Check (אבטחה). נסו לרענן דף, להתחבר מחדש, או לעבוד בחלון אינקוגניטו. אם הבעיה נמשכת — ודאו שבקוד לא מאותחל App Check/שווה ערך.";
  }
  if (code === "permission-denied" || /Missing or insufficient permissions/i.test(msg)) {
    return "אין הרשאה לשמור או לקרוא כעת (בד\"כ עקב כללי Firestore).";
  }
  return null;
}

export default function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [profileErr, setProfileErr] = useState(null);

  // הזמנות + עימוד
  const [orders, setOrders] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  // modal state
  const [showEdit, setShowEdit] = useState(false);

  // fields in modal
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [saveErr, setSaveErr] = useState(null);

  // מצב לכפתור המייל
  const [mailBusy, setMailBusy] = useState(false);
  const [mailMsg, setMailMsg] = useState(null);
  const [mailErr, setMailErr] = useState(null);

  // ניהול timeouts כדי לנקות ב-unmount
  const timeoutsRef = useRef([]);

  const pushTimeout = (fn, ms) => {
    const t = window.setTimeout(fn, ms);
    timeoutsRef.current.push(t);
    return t;
  };
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, []);

  // טעינה ראשונית (fallback) + מילוי טופס
  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!user) return;
      setLoadingProfile(true);
      setProfileErr(null);
      try {
        const p = await getUserProfile(user.uid);
        if (mounted) {
          setProfile(p || {});
          setEditName(p?.displayName || user.displayName || user.email?.split("@")[0] || "");
          setEditEmail(p?.email || user.email || "");
          setEditPhoneNumber(p?.phoneNumber || "");
          setEditCompany(p?.company || "");
        }
      } catch (err) {
        if (mounted) {
          const friendly = friendlyFirestoreError(err);
          setProfileErr(friendly || err?.message || "שגיאה בטעינת הפרופיל.");
        }
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    }
    run();
    return () => { mounted = false; };
  }, [user]);

  // מאזין בזמן אמת למסמך המשתמש — כולל טיפול בשגיאת הרשאות/AppCheck
  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setProfileErr(null);
        const d = snap.data() || {};
        setProfile(d);
        // אל תדרוס הקלדה חיה במודאל; עדכון שדות רק כשהמודאל סגור
        if (!showEdit) {
          setEditName(d.displayName || user.displayName || user.email?.split("@")[0] || "");
          setEditEmail(d.email || user.email || "");
          setEditPhoneNumber(d.phoneNumber || "");
          setEditCompany(d.company || "");
        }
      },
      (err) => {
        const friendly = friendlyFirestoreError(err);
        setProfileErr(friendly || err?.message || "שגיאה בקריאת הפרופיל בזמן אמת.");
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, showEdit]);

  // טעינת ההזמנות הראשונות
  useEffect(() => {
    let cancelled = false;
    async function loadFirstPage() {
      if (!user) return;
      setLoadingOrders(true);
      try {
        const { data, nextCursor } = await getMyOrders(user.uid, PAGE_SIZE, null);
        if (!cancelled) {
          setOrders(data || []);
          setNextCursor(nextCursor || null);
        }
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    }
    loadFirstPage();
    return () => { cancelled = true; };
  }, [user]);

  const loadMore = useCallback(async () => {
    if (!user || !nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await getMyOrders(user.uid, PAGE_SIZE, nextCursor);
      setOrders((prev) => [...prev, ...(res?.data || [])]);
      setNextCursor(res?.nextCursor || null);
    } finally {
      setLoadingMore(false);
    }
  }, [user, nextCursor]);

  const displayName = profile?.displayName || user?.displayName || (user?.email?.split("@")[0]) || "Customer";
  const email = profile?.email || user?.email || "";

  function toDateString(tsOrIso) {
    if (!tsOrIso) return "";
    try {
      const d = typeof tsOrIso?.toDate === "function" ? tsOrIso.toDate() : new Date(tsOrIso);
      return d.toLocaleDateString("he-IL");
    } catch {
      return "";
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  // שמירת פרופיל מתוך המודאל
  async function handleSaveProfile(e) {
    e?.preventDefault?.();
    setSaveErr(null);
    setSaveMsg(null);

    if (!user?.uid) {
      setSaveErr("אין משתמש מחובר.");
      return;
    }

    const nameTrim = (editName || "").trim();
    if (!nameTrim) {
      setSaveErr("יש למלא שם.");
      return;
    }
    const emailTrim = (editEmail || "").trim();
    if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setSaveErr("אימייל לא תקין.");
      return;
    }
    // הטופס מאפשר מקפים/רווחים; השירות מנרמל לספרות בלבד
    const phoneTrim = (editPhoneNumber || "").trim();
    if (phoneTrim && !/^[0-9+\-()\s]{7,20}$/.test(phoneTrim)) {
      setSaveErr("מספר טלפון לא תקין.");
      return;
    }

    try {
      setSaving(true);

      // 1) עדכון שם ב־Auth אם השתנה
      if (user.displayName !== nameTrim) {
        await updateProfile(user, { displayName: nameTrim });
      }

      // 2) עדכון אימייל ב־Auth אם השתנה (עם Reauth אם צריך)
      if (emailTrim && user.email !== emailTrim) {
        try {
          await updateEmail(user, emailTrim);
        } catch (err) {
          if (err?.code === "auth/requires-recent-login") {
            if (reauthPassword) {
              const cred = EmailAuthProvider.credential(user.email, reauthPassword);
              await reauthenticateWithCredential(user, cred);
              await updateEmail(user, emailTrim);
            } else {
              throw new Error("נדרש אימות מחדש לשינוי אימייל. הזן/י סיסמה ולאחר מכן נסה/י שוב.");
            }
          } else {
            throw err;
          }
        }
      }

      // 3) עדכון פרופיל ב־Firestore; השירות מנרמל טלפון ושומר רק מפתחות מותרים
      const fresh = await updateUserProfile(user.uid, {
        displayName: nameTrim,
        email: emailTrim,
        phoneNumber: phoneTrim, // יינרמל לספרות בצד השירות
        company: (editCompany || "").trim(),
      });

      if (fresh) setProfile(fresh);
      if (user?.reload) await user.reload();

      setSaveMsg("השינויים נשמרו בהצלחה.");
      pushTimeout(() => setShowEdit(false), 600);
    } catch (err) {
      console.error(err);
      const friendly = friendlyFirestoreError(err);
      setSaveErr(friendly || err?.message || "שמירה נכשלה. נסו שוב.");
    } finally {
      setSaving(false);
      pushTimeout(() => { setSaveMsg(null); setSaveErr(null); }, 4000);
    }
  }

  // שליחת מייל בדיקה (Cloud Functions)
  async function handleSendTestEmail() {
    setMailErr(null);
    setMailMsg(null);
    try {
      setMailBusy(true);
      const functions = getFunctions(app, "europe-west1");
      const testSendEmail = httpsCallable(functions, "testSendEmail");
      const res = await testSendEmail({
        to: email || undefined,
        subject: "Karina — בדיקת מייל",
        text: `שלום ${displayName}, זהו מייל בדיקה ממערכת Karina.`,
      });
      const data = res?.data || {};
      setMailMsg(`המייל נשלח בהצלחה אל: ${data.sentTo || "מייל החברה"}`);
    } catch (e) {
      console.error(e);
      setMailErr(e?.message || "שליחת המייל נכשלה");
    } finally {
      setMailBusy(false);
      pushTimeout(() => { setMailMsg(null); setMailErr(null); }, 6000);
    }
  }

  return (
    <div className="container py-5">
      <h1 className="mb-4">החשבון שלי</h1>

      {/* באפר כלל-מערכתי לשגיאות פרופיל/הרשאות */}
      {profileErr && (
        <div className="alert alert-warning d-flex align-items-start gap-2">
          <div className="fw-semibold">שימו 💡</div>
          <div>{profileErr}</div>
        </div>
      )}

      {/* פרטי משתמש */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body d-flex align-items-center gap-3">
          <div className="flex-grow-1">
            <h5 className="mb-1">{loadingProfile ? "..." : displayName}</h5>
            <p className="mb-1 text-muted">{email}</p>
            <div className="small text-muted d-flex flex-wrap gap-3">
              <span>משתמש מאז: {toDateString(profile?.createdAt) || "—"}</span>
              {profile?.phoneNumber && <span>טלפון: {prettyPhone(profile.phoneNumber)}</span>}
              {profile?.company && <span>חברה: {profile.company}</span>}
            </div>
          </div>
          <div className="d-flex flex-column align-items-end gap-2">
            <button className="btn btn-outline-primary" onClick={() => setShowEdit(true)} disabled={loadingProfile}>
              עריכת פרטים
            </button>
            <button className="btn btn-outline-secondary" onClick={handleSendTestEmail} disabled={mailBusy}>
              {mailBusy ? "שולח…" : "שלח מייל בדיקה"}
            </button>
            {mailMsg && <div className="text-success small">{mailMsg}</div>}
            {mailErr && <div className="text-danger small">{mailErr}</div>}
          </div>
        </div>
      </div>

      {/* הזמנות אחרונות */}
      <h5 className="mb-3">הזמנות אחרונות</h5>
      {loadingOrders ? (
        <div className="text-muted">טוען הזמנות…</div>
      ) : orders.length > 0 ? (
        <>
          <div className="table-responsive mb-3">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>מס׳ הזמנה</th>
                  <th>תאריך</th>
                  <th>סה״כ</th>
                  <th>סטטוס</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="fw-semibold">
                      <Link to={`/orders/${o.id}`} className="link-primary text-decoration-none">
                        {o.id}
                      </Link>
                    </td>
                    <td>{toDateString(o.createdAt)}</td>
                    <td>{typeof o.amountCents !== "undefined" ? shekels(o.amountCents) : shekels(o.amount)}</td>
                    <td><span className={statusBadgeClass(o.status)}>{o.status}</span></td>
                    <td className="text-end">
                      <Link to={`/orders/${o.id}`} className="btn btn-sm btn-outline-primary">
                        פרטי הזמנה
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {nextCursor ? (
            <div className="d-flex">
              <button className="btn btn-outline-secondary ms-auto" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "טוען…" : "טען עוד"}
              </button>
            </div>
          ) : (
            <div className="text-muted small">הצגת כל ההזמנות.</div>
          )}
        </>
      ) : (
        <p className="text-muted">לא נמצאו הזמנות.</p>
      )}

      {/* פעולות */}
      <div className="d-flex gap-2 mt-4">
        <Link to="/catalog" className="btn btn-outline-primary">המשך בקניות</Link>
        <button className="btn btn-danger" onClick={handleLogout}>התנתק</button>
      </div>

      {/* ========= Edit Profile MODAL ========= */}
      {showEdit && (
        <div
          className="modal d-block"
          role="dialog"
          aria-modal="true"
          aria-labelledby="editProfileTitle"
          onClick={() => setShowEdit(false)}
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            role="document"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <form onSubmit={handleSaveProfile}>
                <div className="modal-header">
                  <h5 className="modal-title" id="editProfileTitle">עריכת פרטי קשר</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setShowEdit(false)}
                  />
                </div>

                <div className="modal-body">
                  {saveErr && <div className="alert alert-danger mb-3">{saveErr}</div>}
                  {saveMsg && <div className="alert alert-success mb-3">{saveMsg}</div>}

                  <div className="mb-3">
                    <label className="form-label">שם מלא</label>
                    <input
                      className="form-control"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">אימייל</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                    <div className="form-text">שינוי אימייל עלול לדרוש סיסמה (אימות מחדש).</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">טלפון</label>
                    <input
                      className="form-control"
                      value={editPhoneNumber}
                      onChange={(e) => setEditPhoneNumber(e.target.value)}
                      placeholder="05x-xxxxxxx"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">חברה</label>
                    <input
                      className="form-control"
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">סיסמה (רק אם תידרש לאימות מחדש)</label>
                    <input
                      type="password"
                      className="form-control"
                      value={reauthPassword}
                      onChange={(e) => setReauthPassword(e.target.value)}
                      placeholder="הקלד/י סיסמה לשינוי אימייל במידת הצורך"
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowEdit(false)}
                    disabled={saving}
                  >
                    ביטול
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !user}>
                    {saving ? "שומר…" : "שמור"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* ========= /Edit Profile MODAL ========= */}
    </div>
  );
}
