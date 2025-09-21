// src/services/orders.js
import { db } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";

/** -----------------------------
 * Utilities
 * ------------------------------*/

/**
 * המרה "חכמה" לשקלים→אגורות:
 * - אם הוכנס מספר עם נקודה/שבר → מכפילים ב-100.
 * - אם הוכנס מספר שלם גדול (>=1000) → מניחים שכבר באגורות.
 * - אחרת מכפילים ב-100.
 */
export function toCentsSmart(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  const isInt = Number.isInteger(n);
  if (isInt && Math.abs(n) >= 1000) return n; // כנראה כבר באגורות
  return Math.round(n * 100);
}

/** ודא שדה מחרוזת/או null נקי */
function s(x) {
  return typeof x === "string" ? x : x == null ? null : String(x);
}

/** שיטות משלוח נתמכות (התאם לשמישות באתר) */
export const SHIPPING_METHODS = {
  regular: "רגיל",
  fast: "מהיר",
  express: "אקספרס",
  pickup: "איסוף מהמפעל",
};

/** סטטוסים מומלצים */
export const ORDER_STATUSES = {
  pending: "pending",
  paid: "paid",
  processing: "processing",
  shipped: "shipped",
  fulfilled: "fulfilled",
  failed: "failed",
  canceled: "canceled",
};

/**
 * נירמול פריטי הזמנה:
 * תומך בפריטים בסכום בשקלים (price) או באגורות (priceCents).
 * שומר גם מאפיינים שימושיים כמו color/size/slug ותצוגות front/back (dataURL) אם קיימים.
 */
export function normalizeItems(items = []) {
  return items.map((i) => {
    const priceCents =
      typeof i.priceCents === "number"
        ? Math.round(i.priceCents)
        : toCentsSmart(i.price);

    return {
      productId: s(i.productId) || s(i.id) || null,
      slug: s(i.slug) || null,
      name: s(i.name) || "",
      priceCents: Math.max(0, priceCents),
      qty: Math.max(1, parseInt(i.qty ?? 1, 10) || 1),

      // אופציונלי:
      color: s(i.color) || null,
      size: s(i.size) || null,
      variantId: s(i.variantId) || null,

      // הדמיות/קבצים (אופציונלי):
      previews: i.previews
        ? {
            front: typeof i.previews.front === "string" ? i.previews.front : null,
            back: typeof i.previews.back === "string" ? i.previews.back : null,
          }
        : null,
    };
  });
}

/** מחשב סכום אגורות מפריטים */
export function sumItemsCents(items = []) {
  return items.reduce((acc, it) => acc + Number(it.priceCents || 0) * Number(it.qty || 0), 0);
}

/** -----------------------------
 * Create Order
 * ------------------------------*/

/**
 * Create a new order document.
 *
 * @param {string} userId - UID של המשתמש
 * @param {Array<Object>} items - פריטים (ראו normalizeItems)
 * @param {Object} opts - שדות נוספים
 *   - amountCents?: number (override, אחרת יחושב)
 *   - currency?: "ILS" | string
 *   - status?: one of ORDER_STATUSES
 *   - shippingMethod?: "regular"|"fast"|"express"|"pickup" | string
 *   - shippingPriceCents?: number (אגורות)
 *   - shippingAddress?: { fullName, phoneNumber, line1, line2, city, zip, note }
 *   - phoneNumber?: string (איש קשר)
 *   - email?: string
 *   - notes?: string
 *   - meta?: Object - כל מידע נוסף שתרצה לשמור
 *   - paymentId?: string | null
 * @returns {Promise<string>} id של ההזמנה
 */
export async function createOrder(userId, items, opts = {}) {
  if (!userId) throw new Error("createOrder: Missing userId");

  const safeItems = normalizeItems(items);
  if (!Array.isArray(safeItems) || safeItems.length === 0) {
    throw new Error("createOrder: items must be a non-empty array");
  }

  const {
    amountCents,
    currency = "ILS",
    status = ORDER_STATUSES.pending,
    shippingMethod = SHIPPING_METHODS.regular,
    shippingPriceCents: rawShippingCents,
    shippingAddress = null,
    phoneNumber = null,
    email = null,
    notes = null,
    meta = {},
    paymentId = null,
  } = opts;

  const itemsTotalCents = sumItemsCents(safeItems);
  const shippingPriceCents =
    typeof rawShippingCents === "number" ? Math.max(0, Math.round(rawShippingCents)) : 0;

  const finalAmountCents =
    typeof amountCents === "number"
      ? Math.max(0, Math.round(amountCents))
      : itemsTotalCents + shippingPriceCents;

  const payload = {
    userId,
    items: safeItems,
    amountCents: finalAmountCents,
    currency,
    status,
    shippingMethod,
    shippingPriceCents,
    shippingAddress: shippingAddress || null,
    phoneNumber: s(phoneNumber),
    email: s(email),
    notes: s(notes),
    paymentId: paymentId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...meta, // יאפשר שדות נוספים לפי הצורך
  };

  const ref = await addDoc(collection(db, "orders"), payload);
  return ref.id;
}

/** -----------------------------
 * Queries
 * ------------------------------*/

/**
 * שליפת הזמנות המשתמש (עם עימוד).
 * @param {string} userId
 * @param {number} pageSize
 * @param {import('firebase/firestore').QueryDocumentSnapshot | null} cursor
 */
export async function getMyOrders(userId, pageSize = 20, cursor = null) {
  if (!userId) return { data: [], nextCursor: null };

  let q = query(
    collection(db, "orders"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  if (cursor) q = query(q, startAfter(cursor));

  const snap = await getDocs(q);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.docs.at(-1) ?? null;
  return { data, nextCursor };
}

/** האזנה בזמן אמת להזמנות המשתמש */
export function listenMyOrders(userId, cb) {
  if (!userId) return () => {};
  const q = query(
    collection(db, "orders"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** -----------------------------
 * Mutations / Status updates
 * ------------------------------*/

/** סימון הזמנה כשולמה (מומלץ להריץ בצד שרת / Cloud Function) */
export async function markOrderPaid(orderId, paymentId) {
  await updateDoc(doc(db, "orders", orderId), {
    status: ORDER_STATUSES.paid,
    paymentId: paymentId || null,
    paidAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** סימון הזמנה ככושלת (תשלום נכשל) */
export async function markOrderFailed(orderId, reason = null) {
  await updateDoc(doc(db, "orders", orderId), {
    status: ORDER_STATUSES.failed,
    failReason: s(reason),
    failedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** ביטול הזמנה */
export async function cancelOrder(orderId, reason = null) {
  await updateDoc(doc(db, "orders", orderId), {
    status: ORDER_STATUSES.canceled,
    cancelReason: s(reason),
    canceledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * עדכון פרטי משלוח (מספר מעקב/חברה/תאריך).
 * אפשר לקרוא כשנוצר שטר מטען.
 */
export async function updateShippingInfo(orderId, info = {}) {
  const patch = {
    shipping: {
      trackingNumber: s(info.trackingNumber) || null,
      carrier: s(info.carrier) || null,
      url: s(info.url) || null,
    },
    status: info.status || ORDER_STATUSES.shipped,
    shippedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await updateDoc(doc(db, "orders", orderId), patch);
}

/** סימון הזמנה כמולאה/הושלמה */
export async function markFulfilled(orderId) {
  await updateDoc(doc(db, "orders", orderId), {
    status: ORDER_STATUSES.fulfilled,
    fulfilledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
