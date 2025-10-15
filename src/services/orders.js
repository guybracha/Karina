// src/services/orders.js
import { db, functions } from "../firebase";
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

// ✅ חדש: קריאה לפונקציות Callable בלי CORS
import { httpsCallable } from "firebase/functions";

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

/** סטטוסים תואמי-כללים */
export const ORDER_STATUSES = {
  draft: "draft",
  initiated: "initiated",
  pending_payment: "pending_payment",
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

      // הדמיות/קבצים (אופציונלי בצד הלקוח):
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

/** בונה אובייקט customer תקין לפי הכללים */
function buildCustomer(input) {
  if (!input) return null;
  // חובה uid
  const uid = s(input.uid);
  if (!uid) return null;
  return {
    uid,
    // אופציונלי: שדות מידע ללקוח
    name: s(input.name) || s(input.displayName) || null,
    email: s(input.email) || null,
    phoneNumber: s(input.phoneNumber) || null,
    company: s(input.company) || null,
  };
}

/** -----------------------------
 * Create Order
 * ------------------------------*/

/**
 * יצירת הזמנה חדשה ב-top-level: /orders/{orderId}
 *
 * @param {string|object} userIdOrCustomer - או UID (מחרוזת), או אובייקט { uid, name?, email?, phoneNumber?, company? }
 * @param {Array<Object>} items - פריטים (ראו normalizeItems)
 * @param {Object} opts - שדות נוספים
 *   - amountCents?: number (override, אחרת יחושב)
 *   - currency?: "ILS" | string
 *   - status?: אחד מ-ORDER_STATUSES (ברירת מחדל: "initiated")
 *   - shippingMethod?: "regular"|"fast"|"express"|"pickup" | string
 *   - shippingPriceCents?: number (אגורות)
 *   - shippingAddress?: { fullName, phoneNumber, line1, line2, city, zip, note }
 *   - phoneNumber?: string (איש קשר)
 *   - email?: string
 *   - notes?: string
 *   - meta?: Object - הרחבות
 *   - paymentId?: string | null
 *   - customer?: object (אם העברת ב-פרמטר הראשון UID בלבד, אפשר להעביר כאן את פרטי הלקוח)
 * @returns {Promise<string>} id של ההזמנה
 */
export async function createOrder(userIdOrCustomer, items, opts = {}) {
  const safeItems = normalizeItems(items);
  if (!Array.isArray(safeItems) || safeItems.length === 0) {
    throw new Error("createOrder: items must be a non-empty array");
  }

  // תמיכה אחורה: אם נשלח מחרוזת – בנה ממנו customer עם uid בלבד
  const customer =
    typeof userIdOrCustomer === "string"
      ? buildCustomer({ uid: userIdOrCustomer, ...(opts.customer || {}) })
      : buildCustomer(userIdOrCustomer || opts.customer);

  if (!customer?.uid) {
    throw new Error("createOrder: Missing customer.uid (required by security rules)");
  }

  const {
    amountCents,
    currency = "ILS",
    status = ORDER_STATUSES.initiated, // סטטוס התחלתי חוקי
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

  // שימו לב: אין כאן userId. הבעלות במסמכי top-level נקבעת לפי customer.uid לפי הכללים.
  const payload = {
    customer, // ← חובה לפי הכללים
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
    ...meta, // הרחבות נוספות (הקפד לא לכתוב שדות "אדמין")
  };

  const ref = await addDoc(collection(db, "orders"), payload);
  return ref.id;
}

/** -----------------------------
 * Queries
 * ------------------------------*/

/**
 * שליפת הזמנות המשתמש (עם עימוד) לפי customer.uid — תואם כללים.
 * @param {string} uid
 * @param {number} pageSize
 * @param {import('firebase/firestore').QueryDocumentSnapshot | null} cursor
 */
export async function getMyOrders(uid, pageSize = 20, cursor = null) {
  if (!uid) return { data: [], nextCursor: null };

  let base = query(
    collection(db, "orders"),
    where("customer.uid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );
  if (cursor) base = query(base, startAfter(cursor));

  const snap = await getDocs(base);
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null;
  return { data, nextCursor };
}

/** האזנה בזמן אמת להזמנות המשתמש לפי customer.uid */
export function listenMyOrders(uid, cb) {
  if (!uid) return () => {};
  const q = query(
    collection(db, "orders"),
    where("customer.uid", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

/** -----------------------------
 * Mutations / Status updates
 * ------------------------------*/

/** סימון הזמנה כשולמה (מומלץ בצד שרת / Cloud Function) */
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

/** -----------------------------
 * Cloud Functions (Callable)
 * ------------------------------*/

/**
 * קריאה לפונקציה callable שמייצרת את ה-PDF, מעלה ל-Storage,
 * ושולחת אימייל עם קישורים (כפי שהגדרת ב-Cloud Functions).
 *
 * @param {Object} params
 * @param {"top"|"sub"} [params.pathType="top"] - היכן ההזמנה נשמרת (לפי הקוד שלך זה top-level)
 * @param {string} params.orderId - מזהה ההזמנה
 * @param {string|null} [params.uid] - נדרש אם pathType="sub"
 * @returns {Promise<{ok: boolean, summaryUrl?: string|null}>}
 */
export async function generateOrderSummaryCallable({ pathType = "top", orderId, uid = null }) {
  if (!orderId) throw new Error("generateOrderSummaryCallable: orderId is required");
  const callable = httpsCallable(functions, "generateOrderSummary");
  const res = await callable({ pathType, orderId, uid });
  return res.data || { ok: false };
}

/**
 * (אופציונלי) בדיקת שליחת מייל ידנית
 * דורש שהגדרת הסודות (KARINA_MAIL_*) בפרויקט
 */
export async function testSendEmailCallable({ to, subject, text }) {
  const callable = httpsCallable(functions, "testSendEmail");
  const res = await callable({ to, subject, text });
  return res.data || { ok: false };
}

/**
 * (אופציונלי) יצירת סשן תשלום (שלד)
 */
export async function createCheckoutSessionCallable({ items, orderId, customer, shipping, clientTotals }) {
  const callable = httpsCallable(functions, "createCheckoutSession");
  const res = await callable({ items, orderId, customer, shipping, clientTotals });
  return res.data;
}
