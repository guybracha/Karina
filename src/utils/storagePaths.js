// סניטציה לשם פרטי/תצוגה כדי שיהיה ידידותי לנתיב
export function sanitizeName(name = "") {
  return String(name)
    .normalize("NFKD")
    // .replace(/[\u0300-\u036f]/g, "")  // מסיר ניקוד יוניקוד
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9-_א-ת]/g, "")
    .toLowerCase();
}

/** בסיס נתיב להזמנה של משתמש: users_prod/{uid}/orders_prod/{orderId}__{firstName} */
export function userOrderBaseDir({ uid, displayName, orderId }) {
  const first = sanitizeName((displayName || "").split(" ")[0] || "user");
  return `users_prod/${uid}/orders_prod/${orderId}__${first}`;
}
