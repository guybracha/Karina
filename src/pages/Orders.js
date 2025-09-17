// src/pages/Orders.jsx
import React, { useState } from "react";

export default function Orders() {
  // דמו – בעתיד תחליף בנתונים מהשרת
  const [orders] = useState([
    {
      id: "ORD1234",
      date: "2025-09-15",
      status: "נשלח",
      total: 290,
      items: [
        { name: "קפוצ׳ון נייבי", qty: 1, price: 120 },
        { name: "חולצת טריקו אפורה", qty: 2, price: 85 },
      ],
    },
    {
      id: "ORD1235",
      date: "2025-09-10",
      status: "בטיפול",
      total: 150,
      items: [{ name: "קסדת בטיחות", qty: 3, price: 50 }],
    },
  ]);

  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">ההזמנות שלי</h1>

      {orders.length === 0 ? (
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
                  <td>{new Date(order.date).toLocaleDateString("he-IL")}</td>
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
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <ul className="list-unstyled mb-0 small">
                      {order.items.map((it, idx) => (
                        <li key={idx}>
                          {it.name} × {it.qty}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>{order.total} ₪</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
