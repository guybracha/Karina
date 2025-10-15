import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeAuth;
    let unsubscribeOrders;

    // מאזין לשינוי מצב ההתחברות
    unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeOrders) {
        unsubscribeOrders(); // נתק מאזין קודם אם קיים
      }

      if (user) {
        // התחבר → טען הזמנות שלו
        const ordersRef = collection(db, "users", user.uid, "orders");
        const q = query(ordersRef, orderBy("createdAt", "desc"));

        unsubscribeOrders = onSnapshot(
          q,
          (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setOrders(data);
            setLoading(false);
          },
          (err) => {
            console.error("Failed to fetch orders:", err);
            setLoading(false);
          }
        );
      } else {
        // לא מחובר → אפס רשימה
        setOrders([]);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, []);

  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">ההזמנות שלי</h1>

      {loading ? (
        <div className="text-center py-4">טוען הזמנות…</div>
      ) : orders.length === 0 ? (
        <div className="alert alert-info">אין לך הזמנות עדיין.</div>
      ) : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>מספר הזמנה</th>
                <th>תאריך</th>
                <th>סטטוס</th>
                <th>מוצרים</th>
                <th>סה״כ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="fw-semibold">{order.id}</td>
                  <td>
                    {order.createdAt?.toDate
                      ? order.createdAt.toDate().toLocaleDateString("he-IL")
                      : order.createdAt
                      ? new Date(order.createdAt).toLocaleDateString("he-IL")
                      : "—"}
                  </td>
                  <td>
                    <span
                      className={
                        "badge " +
                        (order.status === "נשלח"
                          ? "bg-success"
                          : order.status === "בטיפול"
                          ? "bg-warning text-dark"
                          : "bg-secondary")
                      }
                    >
                      {order.status || "—"}
                    </span>
                  </td>
                  <td>
                    <ul className="list-unstyled mb-0 small">
                      {(order.items || []).map((it, idx) => (
                        <li key={idx}>
                          {it.name} × {it.qty}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    {typeof order.total === "number"
                      ? `${order.total.toFixed(2)} ₪`
                      : order.total || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
