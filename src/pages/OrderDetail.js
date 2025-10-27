// src/pages/OrderDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { db, app } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

function shekels(amountCentsOrFloat) {
  let n = Number(amountCentsOrFloat || 0);
  if (n > 0 && n % 1 === 0 && n > 1000) n = n / 100; // אם הגיע כבר באגורות גדולות
  return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(n);
}
function toDateString(tsOrIso) {
  if (!tsOrIso) return "";
  try {
    const d = typeof tsOrIso?.toDate === "function" ? tsOrIso.toDate() : new Date(tsOrIso);
    return d.toLocaleDateString("he-IL");
  } catch {
    return "";
  }
}

/** ===== עזר: חילוץ קישורי לוגו מ־item בצורות שונות ===== */
function extractLogoLinksFromItem(it = {}) {
  const links = [];

  // 1) מערך פשוט של כתובות
  if (Array.isArray(it.logoUrls)) {
    it.logoUrls.filter(Boolean).forEach((url, i) => {
      links.push({ label: `לוגו ${i + 1}`, url });
    });
  }

  // 2) שדות מפורקים
  const candidates = [
    ["logoFrontUrl", "קדמי"],
    ["logoBackUrl", "אחורי"],
    ["logoSleeveUrl", "שרוול"],
    ["logoHoodUrl", "כובע"],
    ["logoUrl", "לוגו"], // יחיד
  ];
  candidates.forEach(([key, label]) => {
    if (typeof it[key] === "string" && it[key]) {
      links.push({ label: `לוגו ${label}`, url: it[key] });
    }
  });

  // 3) אובייקט logos = { front: {url}, back: {url}, ... } או {front:"url"}
  if (it.logos && typeof it.logos === "object") {
    Object.entries(it.logos).forEach(([sideKey, val]) => {
      const url = typeof val === "string" ? val : val?.url || val?.downloadUrl;
      if (url) links.push({ label: `לוגו ${sideKey}`, url });
    });
  }

  // 4) אובייקט logo = { front: {url}, back: {url}, sleeve:"...", url:"..." }
  if (it.logo && typeof it.logo === "object") {
    const v = it.logo;
    if (typeof v.url === "string") links.push({ label: "לוגו", url: v.url });
    ["front", "back", "sleeve", "hood", "left", "right"].forEach((k) => {
      const side = v[k];
      const url = typeof side === "string" ? side : side?.url || side?.downloadUrl;
      if (url) links.push({ label: `לוגו ${k}`, url });
    });
  }

  // 5) שמות חלופיים נפוצים
  if (typeof it.logo_download_url === "string") {
    links.push({ label: "לוגו", url: it.logo_download_url });
  }

  // הסרת כפילויות לפי URL
  const seen = new Set();
  return links.filter(({ url }) => {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

export default function OrderDetail() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  // יצירת/רענון PDF
  const [generating, setGenerating] = useState(false);
  const [genErr, setGenErr] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    setNotFound(false);
    setError(null);

    const ref = doc(db, "orders_prod", orderId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setOrder(null);
          setNotFound(true);
        } else {
          setOrder({ id: snap.id, ...snap.data() });
          setNotFound(false);
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub && unsub();
  }, [orderId]);

  async function handleGeneratePdf() {
    if (!order) return;
    setGenerating(true);
    setGenErr(null);
    try {
      // חשוב: אותו region כמו שהגדרת לפונקציות (europe-west1)
      const functions = getFunctions(app, "europe-west1");
      const fn = httpsCallable(functions, "generateOrderSummary");

      // אצלך השדה הוא uid (לא userId) – נעביר אותו.
      const res = await fn({
        pathType: "top", // כי אתה קורא מ- orders_prod/{orderId}
        orderId,
        uid: order.uid || null,
      });

      if (!res?.data?.ok) {
        throw new Error(res?.data?.error || "failed");
      }
      // onSnapshot יעדכן את summaryUrl כשנכתב במסמך.
    } catch (e) {
      console.error(e);
      setGenErr(e.message || "יצירת ה-PDF נכשלה");
    } finally {
      setGenerating(false);
    }
  }

  // סכום פריטים (אם רוצים להצליב עם amountCents)
  const itemsTotalCents = useMemo(() => {
    const items = order?.items ?? [];
    return items.reduce((sum, it) => {
      const priceCents = Number(it?.priceCents || 0);
      const qty = Number(it?.qty || 0);
      return sum + priceCents * qty;
    }, 0);
  }, [order]);

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-muted">טוען פרטי הזמנה…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          לא ניתן לטעון את ההזמנה. {error?.message || "שגיאה לא ידועה."}
        </div>
        <Link to="/account" className="btn btn-outline-primary">
          חזרה לרשימת ההזמנות
        </Link>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">
          הזמנה <strong>#{orderId}</strong> לא נמצאה.
        </div>
        <Link to="/account" className="btn btn-outline-primary">
          חזרה לרשימת ההזמנות
        </Link>
      </div>
    );
  }

  const createdAt = toDateString(order.createdAt);
  const status = order.status || "—";
  const amountCents = typeof order.amountCents === "number" ? order.amountCents : 0;
  const shippingPriceCents =
    typeof order.shippingPriceCents === "number" ? order.shippingPriceCents : 0;
  const currency = order.currency || "ILS";

  const items = Array.isArray(order.items) ? order.items : [];
  const shippingAddress = order.shippingAddress || null;
  const shipping = order.shipping || null;

  return (
    <div className="container py-5">
      <h1 className="mb-4">פרטי הזמנה #{order.id}</h1>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <div className="d-flex flex-wrap gap-3">
                <div><strong>תאריך:</strong> {createdAt || "—"}</div>
                <div><strong>סטטוס:</strong> {status}</div>
                <div><strong>מטבע:</strong> {currency}</div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-body">
              <h5 className="mb-3">מוצרים בהזמנה</h5>
              {items.length === 0 ? (
                <div className="text-muted">אין פריטים להצגה.</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {items.map((it, idx) => {
                    const lineCents = Number(it?.priceCents || 0) * Number(it?.qty || 0);
                    const logoLinks = extractLogoLinksFromItem(it);

                    return (
                      <li
                        key={idx}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <div className="me-3">
                          <div className="fw-semibold">
                            {it?.name || it?.slug || "פריט"}
                          </div>
                          <div className="small text-muted">
                            כמות: {it?.qty ?? 1}
                            {it?.color ? ` · צבע: ${it.color}` : ""}
                            {it?.size ? ` · מידה: ${it.size}` : ""}
                          </div>

                          {/* ===== קישורי לוגואים לפריט ===== */}
                          {logoLinks.length > 0 && (
                            <div className="small mt-1">
                              <strong>לוגואים:</strong>{" "}
                              {logoLinks.map((lk, i) => (
                                <a
                                  key={lk.url + i}
                                  href={lk.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="link-primary me-2"
                                  title={lk.url}
                                >
                                  {lk.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-nowrap">{shekels(lineCents)}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h5 className="mb-3">סיכום</h5>
              <div className="d-flex justify-content-between">
                <span>סך פריטים</span>
                <span>{shekels(itemsTotalCents)}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span>משלוח</span>
                <span>{shekels(shippingPriceCents)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-bold">
                <span>סה״כ לתשלום</span>
                <span>{shekels(amountCents)}</span>
              </div>
            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <h6 className="mb-2">פרטי משלוח</h6>
              {shippingAddress ? (
                <div className="small">
                  {shippingAddress.fullName && (
                    <div>
                      <strong>{shippingAddress.fullName}</strong>
                    </div>
                  )}
                  {shippingAddress.phoneNumber && (
                    <div>טלפון: {shippingAddress.phoneNumber}</div>
                  )}
                  {shippingAddress.line1 && <div>{shippingAddress.line1}</div>}
                  {shippingAddress.line2 && <div>{shippingAddress.line2}</div>}
                  {(shippingAddress.city || shippingAddress.zip) && (
                    <div>
                      {[shippingAddress.city, shippingAddress.zip].filter(Boolean).join(" ")}
                    </div>
                  )}
                  {shippingAddress.note && (
                    <div className="text-muted">הערה: {shippingAddress.note}</div>
                  )}
                </div>
              ) : (
                <div className="text-muted small">אין כתובת משלוח שמורה.</div>
              )}

              {shipping?.trackingNumber && (
                <>
                  <hr />
                  <div className="small">
                    <div>
                      <strong>מס׳ מעקב:</strong> {shipping.trackingNumber}
                    </div>
                    {shipping.carrier && <div>חברת שילוח: {shipping.carrier}</div>}
                    {shipping.url && (
                      <div>
                        <a href={shipping.url} target="_blank" rel="noreferrer">
                          מעקב משלוח
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}

              {genErr && (
                <div className="alert alert-warning mt-2 py-2">{genErr}</div>
              )}

              <button
                type="button"
                className="btn btn-outline-secondary w-100 mt-2"
                onClick={handleGeneratePdf}
                disabled={generating}
              >
                {generating ? "יוצר PDF…" : order.summaryUrl ? "רענון PDF" : "צור PDF"}
              </button>

              {order.summaryUrl && (
                <a
                  className="btn btn-primary w-100 mt-2"
                  href={order.summaryUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  הורד/י טופס PDF
                </a>
              )}
            </div>
          </div>

          <Link to="/account" className="btn btn-secondary w-100">
            חזרה להזמנות שלי
          </Link>
        </div>
      </div>
    </div>
  );
}
