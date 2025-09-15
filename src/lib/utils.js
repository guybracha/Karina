// src/lib/utils.js

// === מספרים / מחירים ===
export function formatPrice(n) {
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
  }).format(n);
}

// עיגול מספר ל־2 ספרות אחרי הנקודה
export function round2(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// === טקסט ===
// קיצור טקסט ארוך מדי
export function truncate(str, max = 40) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

// === תאריכים ===
export function formatDate(d) {
  try {
    const date = d instanceof Date ? d : new Date(d);
    return new Intl.DateTimeFormat("he-IL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "";
  }
}

// === אחסון מקומי ===
export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("saveToStorage error", e);
  }
}
export function loadFromStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function removeFromStorage(key) {
  localStorage.removeItem(key);
}

// === מזהי פריטים ===
// מפתח ייחודי למוצר (למיזוג עגלה)
export function variantKey({ slug, color, size }) {
  return `${slug || ""}|${color || ""}|${size || ""}`;
}
