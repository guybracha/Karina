// src/components/PhoneOrderRequest.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

const PHONE_ORDERS_COLLECTION = "phoneOrders_prod";

function normalizeDigits(value = "") {
  return String(value || "").replace(/\D+/g, "");
}

function sanitizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

export default function PhoneOrderRequest({
  items = [],
  totals = {},
  shippingAddress = {},
  source = "cart",
  uid = null,
}) {
  const safeItems = Array.isArray(items) ? items : [];
  const hasItems = safeItems.length > 0;

  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const phonePrefilled = useRef(false);
  useEffect(() => {
    const phone = sanitizeString(shippingAddress?.phoneNumber);
    if (phone && !phonePrefilled.current && !form.phone) {
      phonePrefilled.current = true;
      setForm((prev) => ({ ...prev, phone }));
    }
  }, [shippingAddress?.phoneNumber, form.phone]);

  const itemsSnapshot = useMemo(
    () =>
      safeItems.map((it) => ({
        slug: it.slug || null,
        name: it.name || "",
        qty: Number(it.qty || 0),
        color: it.color || null,
        size: it.size || null,
        price: Number(it.price || 0),
      })),
    [safeItems]
  );

  const totalsSnapshot = useMemo(
    () => ({
      merchandiseTotal: Number(totals?.merchandiseTotal || 0),
      shippingCost: Number(totals?.shippingCost || 0),
      grandTotal: Number(totals?.grandTotal || 0),
      totalSaved: Number(totals?.totalSaved || 0),
    }),
    [totals]
  );

  const href =
    typeof window !== "undefined" ? window.location.href : `${source}-page`;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const phoneDigits = normalizeDigits(form.phone);
    if (phoneDigits.length < 7) {
      setError("נא להזין מספר טלפון תקין");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        contactName: sanitizeString(form.name) || null,
        contactPhoneRaw: sanitizeString(form.phone),
        contactPhoneDigits: phoneDigits,
        notes: sanitizeString(form.notes) || null,
        source,
        uid: uid || null,
        items: itemsSnapshot,
        itemsCount: itemsSnapshot.length,
        totals: totalsSnapshot,
        shippingAddress: shippingAddress || null,
        status: "pending",
        createdAt: serverTimestamp(),
        href,
      };

      await addDoc(collection(db, PHONE_ORDERS_COLLECTION), payload);
      setSuccess(true);
      setExpanded(false);
      setForm((prev) => ({ ...prev, notes: "" }));
    } catch (err) {
      console.error("[phone-order] failed to submit request", err);
      setError(err?.message || "משהו השתבש בשליחת הבקשה. נסו שוב.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!hasItems) return null;

  return (
    <div className="card shadow-sm p-3 phone-order-request">
      <div className="d-flex justify-content-between align-items-start gap-3">
        <div>
          <h6 className="mb-1">רוצים להזמין דרך נציג טלפוני?</h6>
          <p className="text-muted small mb-0">
            שלחו מספר טלפון ונחזור אליכם עם הצעת מחיר מסודרת והמשך תהליך הזמנה.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "סגירת טופס" : "בקשת שיחה"}
        </button>
      </div>

      {expanded && (
        <form className="mt-3" onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">שם איש קשר</label>
              <input
                type="text"
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="דניאל מזרחי"
                autoComplete="name"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">טלפון לחזרה *</label>
              <input
                type="tel"
                className="form-control"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="05x-xxxxxxx"
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">הערות / שעות נוחות</label>
              <textarea
                className="form-control"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="ספרו לנו על דרישות מיוחדות, כמויות או זמן חזרה מועדף"
              />
            </div>
          </div>

          {error && (
            <div className="alert alert-danger mt-3 mb-0" role="alert">
              {error}
            </div>
          )}

          <div className="d-flex justify-content-end mt-3">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "שולח..." : "שליחת בקשה"}
            </button>
          </div>
        </form>
      )}

      {success && (
        <div className="alert alert-success mt-3 mb-0" role="status">
          קיבלנו את הבקשה ונציג יחזור אליכם בהקדם.
        </div>
      )}
    </div>
  );
}
