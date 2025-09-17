// src/pages/OrderDetail.jsx
import React from "react";
import { useParams, Link } from "react-router-dom";

export default function OrderDetail() {
  const { orderId } = useParams();

  // כאן רשימת הזמנות זמנית (בעתיד תגיע מ־Context או Firebase)
  const orders = [
    { id: "ORD123", date: "2025-09-01", total: 250, status: "נשלח", items: [
      { name: "קפוצ׳ון נייבי", qty: 1, price: 120 },
      { name: "חולצת טריקו אפורה", qty: 2, price: 65 },
    ]},
    { id: "ORD122", date: "2025-08-12", total: 120, status: "הושלם", items: [
      { name: "קסדת בטיחות", qty: 1, price: 120 },
    ]},
  ];

  const order = orders.find((o) => o.id === orderId);

  if (!order) {
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

  return (
    <div className="container py-5">
      <h1 className="mb-4">פרטי הזמנה #{order.id}</h1>

      <p><strong>תאריך:</strong> {new Date(order.date).toLocaleDateString("he-IL")}</p>
      <p><strong>סטטוס:</strong> {order.status}</p>
      <p><strong>סה״כ לתשלום:</strong> {order.total} ₪</p>

      <h5 className="mt-4 mb-3">מוצרים בהזמנה</h5>
      <ul className="list-group mb-4">
        {order.items.map((item, idx) => (
          <li key={idx} className="list-group-item d-flex justify-content-between">
            <span>{item.name} × {item.qty}</span>
            <span>{item.price * item.qty} ₪</span>
          </li>
        ))}
      </ul>

      <Link to="/account" className="btn btn-secondary">
        חזרה להזמנות שלי
      </Link>
    </div>
  );
}
