// src/pages/Checkout.jsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { ref, uploadBytes, uploadString, getDownloadURL } from "firebase/storage";
import { storage, auth, ensureAuthTokenFresh } from "../firebase";
import { useLogosQueue } from "../contexts/LogosQueueContext.tsx";

const LS_CART_KEY = "karina:cart";
const LS_PREVIEW_KEY = (slug, side) => `karina:preview:${slug}:${side}`;

/* =========================
   Helpers: cart + previews
========================= */
function useCartFallback() {
  const lsCart = (() => {
    try {
      const raw = localStorage.getItem(LS_CART_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const demo = [
    { id: "hoodie__navy__L", slug: "hoodie", name: "קפוצ׳ון נייבי", price: 120, qty: 1, color: "navy", size: "L" },
    { id: "tee__gray__M", slug: "tee", name: "חולצת טריקו אפורה", price: 35, qty: 2, color: "gray", size: "M" },
  ];

  const items = lsCart && Array.isArray(lsCart) && lsCart.length ? lsCart : demo;
  const merchandiseTotal = useMemo(
    () => items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0),
    [items]
  );
  return { items, totals: { merchandiseTotal, shippingCost: 0, grandTotal: merchandiseTotal } };
}

// dataURL helpers
function approxBytesFromDataUrl(dataUrl = "") {
  if (!dataUrl) return 0;
  const b64 = dataUrl.split(",")[1] || "";
  return Math.floor((b64.length * 3) / 4);
}
function contentTypeFromDataUrl(dataUrl = "") {
  const m = /^data:([^;]+);base64,/i.exec(dataUrl || "");
  return m?.[1] || "image/png";
}

// Authorized POST with Firebase ID token
async function authorizedPostJson(url, body) {
  await ensureAuthTokenFresh();
  const token = await auth.currentUser?.getIdToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  let data = {};
  try {
    data = await r.json();
  } catch {}
  if (!r.ok) throw new Error(data?.error || `request_failed (${r.status})`);
  return data;
}

/* =========================
   Credit2000 iFrame helpers
========================= */
// מחלץ את קטע ה-HTML של האייפריים מתוך SOAP
function extractIframeHtmlFromSoap(soapXml) {
  if (!soapXml) return null;
  const m = soapXml.match(/<SendParamToCredit2000Result>([\s\S]*?)<\/SendParamToCredit2000Result>/i);
  return m ? m[1] : null;
}

// מסיר HTML-escape ומוציא את ה-src מתוך תג ה-iframe
function extractRedirectUrlFromIframeHtml(iframeHtml) {
  if (!iframeHtml) return null;
  const unescaped = iframeHtml
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .trim();
  const m = unescaped.match(/src="([^"]+)"/i);
  return m ? m[1] : null;
}

/* =========================
   Responsive iframe wrapper
========================= */
function ResponsiveIframe({ src, title = "Credit2000", onLoad }) {
  // יחס 4:3 (גובה = 75% מהרוחב) + מינ' גובה — רספונסיבי
  const containerStyle = {
    position: "relative",
    width: "100%",
    paddingTop: "75%",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,.08)",
    overflow: "hidden",
    background: "rgba(0,0,0,.02)",
  };
  const iframeStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    border: 0,
    display: "block",
  };
  return (
    <div className="cc-frame" style={containerStyle}>
      <iframe title={title} src={src} style={iframeStyle} scrolling="no" allow="payment *" onLoad={onLoad} />
    </div>
  );
}

export default function Checkout() {
  const { state } = useLocation() || {};
  const fallback = useCartFallback();

  const items = Array.isArray(state?.items) && state.items.length ? state.items : fallback.items;
  const shipping = state?.shipping || { method: "pickup", label: "איסוף מהמפעל", cost: 0, address: {} };
  const totals = state?.totals || fallback.totals;

  const grandTotal =
    totals?.grandTotal ?? items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);

  // האם הגיעו פרטי משלוח מהעגלה? (עיר+רחוב+בית או address מוכן)
  const shippingAddress = shipping?.address || {};
  const readyFromCart =
    Boolean(
      shippingAddress?.address &&
        String(shippingAddress.address).trim().length > 0
    ) ||
    Boolean(
      shippingAddress?.city && shippingAddress?.street && shippingAddress?.house &&
      String(shippingAddress.city).trim() &&
      String(shippingAddress.street).trim() &&
      String(shippingAddress.house).trim()
    );

  // ui state
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // הטמעת תשלום
  const [iframeSrc, setIframeSrc] = useState("");
  const [iframeReady, setIframeReady] = useState(false);
  const iframeBoxRef = useRef(null);

  // ↪️ תוצאה מה־iframe (הודעת חזרה)
  const [paymentResult, setPaymentResult] = useState({ status: null, txId: null });
  const [currentOrderId, setCurrentOrderId] = useState(null);

  const { takeOriginalFromMemory } = useLogosQueue();

  async function uploadOriginalLogoIfAvailable() {
    const idFront = localStorage.getItem("karina:logoId:front");
    const idBack = localStorage.getItem("karina:logoId:back");
    const logoId = idFront || idBack;
    if (!logoId) return null;

    const file = useLogosQueue ? takeOriginalFromMemory(logoId) : null;
    if (!file) return null;

    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("not_authed");

    const safeName = (file.name || "logo").replace(/[^\w.\-]+/g, "_");
    const path = `users/${uid}/logos/${logoId}_${Date.now()}_${safeName}`;
    const r = ref(storage, path);
    const snap = await uploadBytes(r, file, { contentType: file.type || "application/octet-stream" });
    const url = await getDownloadURL(snap.ref);
    return { path, url, bytes: file.size || 0, contentType: file.type || "application/octet-stream", logoId };
  }

  async function uploadMockupsForCart() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("not_authed");

    const perProduct = new Map();
    for (const it of items) {
      const slug = it.slug;
      if (!slug) continue;
      const front = localStorage.getItem(LS_PREVIEW_KEY(slug, "front"));
      const back = localStorage.getItem(LS_PREVIEW_KEY(slug, "back"));
      if (front) perProduct.set(`${slug}:front`, front);
      if (back) perProduct.set(`${slug}:back`, back);
    }

    const results = [];
    for (const [key, dataUrl] of perProduct.entries()) {
      const [slug, side] = key.split(":");
      const ct = contentTypeFromDataUrl(dataUrl);
      const ext = ct.split("/")[1] || "png";
      const path = `users/${uid}/mockups/${slug}/${side}-${Date.now()}.${ext}`;
      const r = ref(storage, path);
      const snap = await uploadString(r, dataUrl, "data_url", { contentType: ct });
      const url = await getDownloadURL(snap.ref);
      results.push({
        slug,
        side,
        path,
        url,
        bytes: approxBytesFromDataUrl(dataUrl),
        contentType: ct,
      });
    }
    return results;
  }

  /* =========================
     Credit2000 start (embed)
  ========================= */
  async function startCredit2000Payment({ amount, orderId, clientName }) {
    const endpoint = "https://europe-west1-karina-web.cloudfunctions.net/credit2000Start";
    const payload = {
      amount, // ₪ (float)
      clientName: clientName || "לקוח/ה",
      productId: String(orderId || 9999),
      uid: auth.currentUser?.uid || "",
    };

    const data = await authorizedPostJson(endpoint, payload);

    if (data.redirectUrl) return { redirectUrl: data.redirectUrl };
    if (data.iframeHtml) {
      const src = extractRedirectUrlFromIframeHtml(data.iframeHtml);
      if (src) return { redirectUrl: src };
    }
    if (data.soap || data.raw) {
      const iframeHtml = extractIframeHtmlFromSoap(data.soap || data.raw);
      const src = extractRedirectUrlFromIframeHtml(iframeHtml);
      if (src) return { redirectUrl: src };
    }

    console.warn("Credit2000 raw response:", data);
    throw new Error("לא נמצא redirectUrl/iframe בתשובת Credit2000");
  }

  // התחלת תשלום אוטומטית אם יש פרטים מהעגלה
  useEffect(() => {
    let cancelled = false;

    async function kickOff() {
      if (!readyFromCart || iframeSrc || busy) return;
      setError("");
      setBusy(true);
      try {
        if (!auth.currentUser?.uid) throw new Error("עליך להתחבר לפני השלמת ההזמנה.");
        await ensureAuthTokenFresh();

        // העלאות (best-effort)
        await uploadOriginalLogoIfAvailable().catch(() => null);
        await uploadMockupsForCart().catch(() => []);

        // מזהה הזמנה
        const orderId = state?.orderId || Math.floor(Date.now() / 1000);
        if (!cancelled) setCurrentOrderId(orderId);

        // שם לקוח למסוף (אופציונלי — ננסה להרכיב מהכתובת)
        const clientName =
          state?.contact?.fullName ||
          `${shippingAddress?.city || ""} ${shippingAddress?.street || ""}`.trim() ||
          "לקוח/ה";

        // פתיחת ה־iframe
        const { redirectUrl } = await startCredit2000Payment({
          amount: Number(grandTotal || 0),
          orderId,
          clientName,
        });

        if (!/^https:\/\//i.test(redirectUrl)) {
          throw new Error("כתובת האייפריים אינה https.");
        }

        if (!cancelled) {
          setPaymentResult({ status: null, txId: null });
          setIframeSrc(redirectUrl);
          setIframeReady(false);
          setTimeout(() => iframeBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err?.message || "תקלה בהתחלת התשלום");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    kickOff();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyFromCart, items, totals, state, grandTotal]);

  const lineTotal = (it) => (Number(it.price) || 0) * (Number(it.qty) || 0);

  // כפתור חזרה מהאייפריים
  const handleCloseIframe = useCallback(() => {
    setIframeSrc("");
    setIframeReady(false);
  }, []);

  /* =========================
     מאזין ל-postMessage מה-Return URL
     מחפש: { type: "payment:success"| "payment:failure", provider:"credit2000", orderId?, txId? }
  ========================= */
  useEffect(() => {
    function onMessage(e) {
      const data = e?.data;
      if (!data || typeof data !== "object") return;

      if (data.provider === "credit2000" && typeof data.type === "string" && data.type.startsWith("payment:")) {
        const ok = data.type === "payment:success";
        // סוגרים את האייפריים ומציגים חיווי
        setIframeSrc("");
        setIframeReady(false);
        setPaymentResult({ status: ok ? "success" : "failure", txId: data.txId || null });
        // גלילה לראש העמוד כדי לראות את הבאנר
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="container py-5">
      {/* CSS רספונסיבי לאייפריים (יחס-צד + min-height) */}
      <style>{`
        .cc-frame { min-height: 380px; }
        @media (max-width: 576px) {
          .cc-frame { padding-top: 95%; min-height: 420px; } /* יותר גובה במסכים צרים */
        }
        @media (min-width: 577px) and (max-width: 991px) {
          .cc-frame { padding-top: 80%; min-height: 400px; } /* טאבלטים */
        }
        @media (min-width: 1200px) {
          .cc-frame { padding-top: 66.66%; min-height: 420px; } /* ~3:2 בדסקטופ רחב */
        }
      `}</style>

      <h1 className="mb-4">תשלום והזמנה</h1>

      {/* 🔔 הודעת חזרה מתשלום */}
      {paymentResult.status === "success" && (
        <div className="alert alert-success d-flex justify-content-between align-items-center" role="alert">
          <div>
            ✅ התשלום התקבל בהצלחה{currentOrderId ? ` להזמנה #${currentOrderId}` : ""}.
            {paymentResult.txId ? <> מספר עסקה: <strong>{paymentResult.txId}</strong>.</> : null}
          </div>
          <div className="d-flex gap-2">
            <Link to={currentOrderId ? `/orders/${currentOrderId}` : "/orders"} className="btn btn-sm btn-outline-light">
              לצפייה בהזמנה
            </Link>
            <Link to="/catalog" className="btn btn-sm btn-light">
              המשך בקניות
            </Link>
          </div>
        </div>
      )}
      {paymentResult.status === "failure" && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
          <div>
            ❌ התשלום נכשל. ניתן לנסות שוב או לבחור אמצעי תשלום אחר.
            {paymentResult.txId ? <> (מס׳ עסקה: <strong>{paymentResult.txId}</strong>)</> : null}
          </div>
          <button
            className="btn btn-sm btn-outline-light"
            onClick={() => setPaymentResult({ status: null, txId: null })}
          >
            הסתר
          </button>
        </div>
      )}

      {/* אם אין פרטי כתובת מהעגלה — הצג הודעה וקישור חזרה לעגלה */}
      {!readyFromCart && (
        <div className="alert alert-warning">
          חסרים פרטי משלוח/כתובת. אנא חזור/י ל<a className="alert-link" href="/cart"> עגלת הקניות</a> ומלא/י את הכתובת.
        </div>
      )}

      {/* תיבת הטמעת האשראי (אוטומטית עם פרטי העגלה) */}
      {readyFromCart && (
        <div className="card shadow-sm p-3 mb-4" ref={iframeBoxRef}>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="m-0">תשלום בכרטיס – עמוד מאובטח (Credit2000)</h5>
            <button className="btn btn-outline-secondary btn-sm" onClick={handleCloseIframe} disabled={!iframeSrc}>
              חזרה
            </button>
          </div>

          <div className="mt-3 position-relative">
            {!iframeReady && iframeSrc && (
              <div
                className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                style={{ background: "rgba(255,255,255,.6)", zIndex: 2 }}
              >
                <div className="spinner-border" role="status" aria-hidden="true" />
                <span className="ms-2">טוען מסך סליקה…</span>
              </div>
            )}

            {iframeSrc ? (
              <ResponsiveIframe src={iframeSrc} title="Credit2000" onLoad={() => setIframeReady(true)} />
            ) : (
              <div className="text-center p-4 text-muted">מכין מסך תשלום…</div>
            )}
          </div>

          <small className="text-muted d-block mt-2">
            אם יש לך Content-Security-Policy באתר, ודא שהדומיין של Credit2000 מותר תחת <code>frame-src</code>{" "}
            (למשל: <code>https://www.credit2000.co.il</code>).
          </small>

          {error && <div className="alert alert-danger mt-3">{error}</div>}
        </div>
      )}

      <div className="row g-4">
        {/* סיכום הזמנה */}
        <div className="col-lg-6 col-xl-5">
          <div className="card shadow-sm p-4">
            <h5 className="mb-3">סיכום הזמנה</h5>
            <ul className="list-group list-group-flush mb-3">
              {items.map((it) => (
                <li key={it.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    {it.name}{" "}
                    <small className="text-muted">
                      x{it.qty}
                      {it.color ? ` • ${it.color}` : ""}
                      {it.size ? ` • ${it.size}` : ""}
                    </small>
                  </div>
                  <div>{(Number(it.price) || 0) * (Number(it.qty) || 0)} ₪</div>
                </li>
              ))}
            </ul>

            <div className="text-end">
              {"merchandiseTotal" in (totals || {}) && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">סה״כ מוצרים:</span>
                  <strong>{Number(totals.merchandiseTotal || 0)} ₪</strong>
                </div>
              )}
              {"shippingCost" in (totals || {}) && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">
                    משלוח {shipping?.label ? `(${shipping.label})` : ""}
                  </span>
                  <strong>{Number(totals.shippingCost || 0)} ₪</strong>
                </div>
              )}
              <hr className="my-2" />
              <h5 className="mb-0">סה״כ לתשלום: {Number(grandTotal || 0)} ₪</h5>
            </div>

            <Link to="/cart" className="btn btn-outline-secondary mt-3 w-100">
              חזרה לעגלה
            </Link>
          </div>
        </div>

        {/* פרטי משלוח קצרים (תצוגה בלבד) */}
        {readyFromCart && (
          <div className="col-lg-6 col-xl-7">
            <div className="card shadow-sm p-4 h-100">
              <h6 className="mb-3">כתובת משלוח</h6>
              <div className="text-muted">
                {shippingAddress?.address
                  ? shippingAddress.address
                  : [shippingAddress?.city, shippingAddress?.street, shippingAddress?.house]
                      .filter(Boolean)
                      .join(" ")}
                {shippingAddress?.apt ? `, דירה ${shippingAddress.apt}` : ""}
                {shippingAddress?.zip ? `, ${shippingAddress.zip}` : ""}
                {shippingAddress?.notes ? <div className="mt-2">הערות: {shippingAddress.notes}</div> : null}
              </div>
              <small className="text-muted d-block mt-3">
                לשינוי הכתובת, חזור/י ל<a href="/cart">עגלת הקניות</a>.
              </small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
