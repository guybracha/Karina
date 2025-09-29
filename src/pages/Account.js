// src/pages/Account.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getUserProfile, updateUserProfile } from "../services/users";
// ⬇️ מחליפים את listenMyOrders בטעינה מדורגת
import { getMyOrders /*, listenMyOrders */ } from "../services/orders";
import { logout } from "../services/auth";
import CreateDemoOrderButton from "../components/CreateDemoOrderButton";

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

export default function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);

  // ⬇️ הזמנות + עימוד
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
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editCompany, setEditCompany] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [saveErr, setSaveErr] = useState(null);

  // פרטי משתמש
  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!user) return;
      setLoadingProfile(true);
      try {
        const p = await getUserProfile(user.uid);
        if (mounted) {
          setProfile(p || {});
          setEditName(p?.displayName || user.displayName || user.email?.split("@")[0] || "");
          setEditPhoneNumber(p?.phoneNumber || "");
          setEditCompany(p?.company || "");
        }
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    }
    run();
    return () => { mounted = false; };
  }, [user]);

  // ⬇️ טעינת כל ההזמנות של המשתמש לפי UID (ממויין בירידה לפי createdAt) + עימוד
  useEffect(() => {
    let cancelled = false;
    async function loadFirstPage() {
      if (!user) return;
      setLoadingOrders(true);
      try {
        const { data, nextCursor } = await getMyOrders(user.uid, PAGE_SIZE, null);
        if (!cancelled) {
          setOrders(data);
          setNextCursor(nextCursor);
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
      setOrders((prev) => [...prev, ...res.data]);
      setNextCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [user, nextCursor]);

  // אם תרצה האזנה חיה במקום טעינה ידנית, אפשר להחליף ל-listenMyOrders:
  // useEffect(() => {
  //   if (!user) return;
  //   setLoadingOrders(true);
  //   const unsub = listenMyOrders(user.uid, (list) => {
  //     setOrders(list);
  //     setLoadingOrders(false);
  //   });
  //   return () => unsub && unsub();
  // }, [user]);

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

    const nameTrim = (editName || "").trim();
    if (!nameTrim) {
      setSaveErr("יש למלא שם.");
      return;
    }
    const phoneTrim = (editPhoneNumber || "").trim();
    if (phoneTrim && !/^[0-9+\-()\s]{7,20}$/.test(phoneTrim)) {
      setSaveErr("מספר טלפון לא תקין.");
      return;
    }

    try {
      setSaving(true);
      await updateUserProfile(user.uid, {
        displayName: nameTrim,
        phoneNumber: phoneTrim,
        company: (editCompany || "").trim(),
      });

      setProfile((prev) => ({
        ...prev,
        displayName: nameTrim,
        phoneNumber: phoneTrim,
        company: (editCompany || "").trim(),
      }));
      setSaveMsg("השינויים נשמרו בהצלחה.");
      setTimeout(() => setShowEdit(false), 600);
    } catch (err) {
      console.error(err);
      setSaveErr("שמירה נכשלה. נסו שוב.");
    } finally {
      setSaving(false);
      window.setTimeout(() => { setSaveMsg(null); setSaveErr(null); }, 4000);
    }
  }

  return (
    <div className="container py-5">
      <h1 className="mb-4">החשבון שלי</h1>

      {/* פרטי משתמש */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body d-flex align-items-center gap-3">
          <div className="flex-grow-1">
            <h5 className="mb-1">{loadingProfile ? "..." : displayName}</h5>
            <p className="mb-1 text-muted">{email}</p>
            <div className="small text-muted d-flex flex-wrap gap-3">
              <span>משתמש מאז: {toDateString(profile?.createdAt) || "—"}</span>
              {profile?.phoneNumber && <span>טלפון: {profile.phoneNumber}</span>}
              {profile?.company && <span>חברה: {profile.company}</span>}
            </div>
          </div>
          <div>
            <button className="btn btn-outline-primary" onClick={() => setShowEdit(true)} disabled={loadingProfile}>
              עריכת פרטים
            </button>
          </div>
        </div>
      </div>

      {/* מודאל עריכה */}
      {showEdit && (
        <div
          className="modal fade show"
          style={{ display: "block", background: "rgba(0,0,0,.5)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="editProfileTitle"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setShowEdit(false);
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleSaveProfile}>
                <div className="modal-header">
                  <h5 className="modal-title" id="editProfileTitle">עריכת פרטים</h5>
                  <button type="button" className="btn-close" onClick={() => !saving && setShowEdit(false)} aria-label="Close" />
                </div>
                <div className="modal-body">
                  {saveErr && <div className="alert alert-danger py-2">{saveErr}</div>}
                  {saveMsg && <div className="alert alert-success py-2">{saveMsg}</div>}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">שם מלא</label>
                    <input type="text" className="form-control" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="לדוגמה: יעל כהן" required disabled={saving} />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">מספר טלפון</label>
                    <input type="tel" className="form-control" value={editPhoneNumber} onChange={(e) => setEditPhoneNumber(e.target.value)} placeholder="לדוגמה: 050-1234567" disabled={saving} />
                  </div>

                  <div className="mb-0">
                    <label className="form-label fw-semibold">שם חברה</label>
                    <input type="text" className="form-control" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="לדוגמה: קארינה בע״מ" disabled={saving} />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => !saving && setShowEdit(false)} disabled={saving}>
                    ביטול
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "שומר/ת..." : "שמירת שינויים"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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

          {/* טען עוד */}
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
    </div>
  );
}
