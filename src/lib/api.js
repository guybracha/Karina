// src/lib/api.js
// מודול API גמיש: עובד מול שרת אם הוגדר BASE_URL, אחרת Mock מתוך קבצים לוקאליים.
// כולל עזרי עגלה (localStorage), מוצרים, הזמנות, העלאת לוגו, וטופס "צור קשר".

import { PRODUCTS } from "./products";

// ---- קונפיג API ----
const BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  ""; // אם זה ריק => מצב MOCK

const USE_MOCK = !BASE_URL; // אין כתובת שרת => נעבוד במוק לוקאלי
const CART_KEY = "karina_cart_v1";

// ---- כלי fetch בסיסי ----
async function http(path, { method = "GET", headers, body, timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body,
    signal: ctrl.signal,
    credentials: "include", // אם יש קוקיז / סשן
  }).catch((err) => {
    clearTimeout(t);
    throw err;
  });

  clearTimeout(t);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status}: ${text || res.statusText}`);
    err.status = res.status;
    throw err;
  }

  // נסה JSON, ואם נכשל החזר טקסט
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

// ---- עזרי עגלה (localStorage) ----
export function cartGet() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

export function cartSet(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items || []));
}

export function cartAdd(item) {
  const items = cartGet();
  // מפתח ייחודי לפי מוצר + וריאנטים (צבע/מידה)
  const key = `${item.slug}|${item.color || ""}|${item.size || ""}`;
  const idx = items.findIndex((it) => `${it.slug}|${it.color || ""}|${it.size || ""}` === key);
  if (idx > -1) {
    items[idx].qty = (items[idx].qty || 1) + (item.qty || 1);
  } else {
    items.push({ ...item, qty: item.qty || 1 });
  }
  cartSet(items);
  return items;
}

export function cartUpdateQty(indexOrKey, qty) {
  const items = cartGet();
  const q = Math.max(1, Number(qty) || 1);
  if (typeof indexOrKey === "number") {
    if (items[indexOrKey]) items[indexOrKey].qty = q;
  } else {
    const idx = items.findIndex(
      (it) => `${it.slug}|${it.color || ""}|${it.size || ""}` === String(indexOrKey)
    );
    if (idx > -1) items[idx].qty = q;
  }
  cartSet(items);
  return items;
}

export function cartRemove(indexOrKey) {
  const items = cartGet();
  let out = items;
  if (typeof indexOrKey === "number") {
    out = items.filter((_, i) => i !== indexOrKey);
  } else {
    out = items.filter(
      (it) => `${it.slug}|${it.color || ""}|${it.size || ""}` !== String(indexOrKey)
    );
  }
  cartSet(out);
  return out;
}

export function cartClear() {
  cartSet([]);
}

export function cartTotal(items = cartGet()) {
  return items.reduce((sum, it) => sum + (it.price || 0) * (it.qty || 1), 0);
}

// ---- מוצרים ----
export async function getProducts() {
  if (USE_MOCK) {
    // החזר מהמוק המקומי
    return PRODUCTS;
  }
  return http(`/products`);
}

export async function getProductBySlug(slug) {
  if (!slug) throw new Error("slug is required");
  if (USE_MOCK) {
    return PRODUCTS.find((p) => p.slug === slug) || null;
  }
  return http(`/products/${encodeURIComponent(slug)}`);
}

export async function searchProducts({ query = "", color = "", size = "" } = {}) {
  if (USE_MOCK) {
    const q = (query || "").toLowerCase();
    return PRODUCTS.filter((p) => {
      const matchQuery = !q || p.name.toLowerCase().includes(q);
      const matchColor = !color || (p.colors || []).includes(color);
      const matchSize = !size || (p.sizes || []).includes(size);
      return matchQuery && matchColor && matchSize;
    });
  }
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (color) params.set("color", color);
  if (size) params.set("size", size);
  return http(`/products/search?${params.toString()}`);
}

// ---- העלאת לוגו ----
// קולט קובץ File או dataURL (מייצר Blob) ושולח לשרת; במוק מחזיר dataURL/URL מדומה.
export async function uploadLogo(input) {
  // המרה ל-Blob אם קיבלנו dataURL
  async function dataUrlToBlob(dataUrl) {
    const res = await fetch(dataUrl);
    return res.blob();
  }

  if (USE_MOCK) {
    // במוק, נחזיר URL לוקאלי (dataURL) כדי להמשיך זרימה
    if (typeof input === "string" && input.startsWith("data:")) {
      return { url: input, id: `mock-${Date.now()}` };
    }
    // אם זה File — נקרא כ-dataURL
    if (input instanceof File) {
      const dataUrl = await new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(input);
      });
      return { url: dataUrl, id: `mock-${Date.now()}` };
    }
    return { url: "", id: `mock-${Date.now()}` };
  }

  // מול שרת אמיתי
  const form = new FormData();
  if (typeof input === "string" && input.startsWith("data:")) {
    const blob = await dataUrlToBlob(input);
    form.append("file", blob, "logo.png");
  } else if (input instanceof Blob || input instanceof File) {
    form.append("file", input, input.name || "logo");
  } else {
    throw new Error("uploadLogo: invalid input");
  }

  const res = await fetch(`${BASE_URL}/upload/logo`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json(); // צפוי { url, id }
}

// ---- הזמנות ----
export async function createOrder({ customer, items, totals, notes, previewImage }) {
  // customer: { fullName, email, phone, address, city, zip }
  // items: [{ slug, name, price, qty, color, size, logoMeta? }]
  // totals: { subTotal, shipping, total }
  // previewImage: dataURL/URL של הדמיה (אופציונלי)

  if (USE_MOCK) {
    // נשמור “כאילו” ב-localStorage לצורך דמו
    const all = JSON.parse(localStorage.getItem("karina_orders") || "[]");
    const order = {
      id: `MOCK-${Date.now()}`,
      date: new Date().toISOString(),
      customer,
      items,
      totals,
      notes: notes || "",
      previewImage: previewImage || null,
      status: "נקלט",
    };
    all.unshift(order);
    localStorage.setItem("karina_orders", JSON.stringify(all));
    // ננקה עגלה אחרי הזמנה
    cartClear();
    return order;
  }
  return http(`/orders`, {
    method: "POST",
    body: JSON.stringify({ customer, items, totals, notes, previewImage }),
  });
}

export async function getOrders() {
  if (USE_MOCK) {
    return JSON.parse(localStorage.getItem("karina_orders") || "[]");
  }
  return http(`/orders`);
}

export async function getOrderById(id) {
  if (!id) throw new Error("order id is required");
  if (USE_MOCK) {
    const all = JSON.parse(localStorage.getItem("karina_orders") || "[]");
    return all.find((o) => o.id === id) || null;
  }
  return http(`/orders/${encodeURIComponent(id)}`);
}

// ---- צור קשר ----
export async function sendContact({ name, email, message }) {
  if (!name || !email || !message) throw new Error("Missing fields");
  if (USE_MOCK) {
    const inbox = JSON.parse(localStorage.getItem("karina_contact") || "[]");
    inbox.unshift({ id: `C-${Date.now()}`, name, email, message, date: new Date().toISOString() });
    localStorage.setItem("karina_contact", JSON.stringify(inbox));
    return { ok: true };
  }
  return http(`/contact`, {
    method: "POST",
    body: JSON.stringify({ name, email, message }),
  });
}

// ---- משתמש/אימות (מוק בסיסי) ----
export function authGetCurrentUser() {
  if (USE_MOCK) {
    try {
      return JSON.parse(localStorage.getItem("karina_user") || "null");
    } catch {
      return null;
    }
  }
  // בשרת אמיתי היית עושה: return http('/me')
  return null;
}

export function authLoginMock({ name, email }) {
  // דמו בלבד
  const user = { name, email, avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png", joined: "2023-08-15" };
  localStorage.setItem("karina_user", JSON.stringify(user));
  return user;
}

export function authLogoutMock() {
  localStorage.removeItem("karina_user");
  return true;
}

// ---- כלים קטנים ----
export function dataUrlToFile(dataUrl, filename = "file.png") {
  // ממיר dataURL ל-File (למשל כדי לעלות לשרת)
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new File([u8], filename, { type: mime });
}
