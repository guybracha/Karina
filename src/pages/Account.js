// src/pages/Account.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Account() {
  // בעתיד: למשוך מ-Auth/Firebase
  const user = {
    name: "גיא ברכה",
    email: "guy@example.com",
    avatar: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    joined: "2023-08-15",
  };

  const orders = [
    { id: "ORD123", date: "2025-09-01", total: 250, status: "נשלח" },
    { id: "ORD122", date: "2025-08-12", total: 120, status: "הושלם" },
  ];

  const statusBadge = (status) => {
    const map = {
      "נשלח": "bg-success",
      "הושלם": "bg-primary",
      "בטיפול": "bg-warning text-dark",
      "התקבלה": "bg-info text-dark",
      "בוטלה": "bg-danger",
    };
    return `badge ${map[status] || "bg-secondary"}`;
  };

  return (
    <div className="container py-5">
      <h1 className="mb-4">החשבון שלי</h1>

      {/* פרטי משתמש */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body d-flex align-items-center gap-3">
          <img
            src={user.avatar}
            alt={user.name}
            className="rounded-circle"
            style={{ width: 80, height: 80, objectFit: "cover" }}
          />
          <div>
            <h5 className="mb-1">{user.name}</h5>
            <p className="mb-1 text-muted">{user.email}</p>
            <small className="text-muted">משתמש מאז: {new Date(user.joined).toLocaleDateString("he-IL")}</small>
          </div>
        </div>
      </div>

      {/* הזמנות אחרונות */}
      <h5 className="mb-3">הזמנות אחרונות</h5>
      {orders.length > 0 ? (
        <div className="table-responsive mb-4">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>מספר הזמנה</th>
                <th>תאריך</th>
                <th>סה״כ</th>
                <th>סטטוס</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="fw-semibold">
                    <Link to={`/orders/${o.id}`} className="link-primary text-decoration-none">
                      {o.id}
                    </Link>
                  </td>
                  <td>{new Date(o.date).toLocaleDateString("he-IL")}</td>
                  <td>{o.total} ₪</td>
                  <td><span className={statusBadge(o.status)}>{o.status}</span></td>
                  <td className="text-end">
                    <Link to={`/orders/${o.id}`} className="btn btn-sm btn-outline-primary">
                      פרטי הזמנה
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted">לא נמצאו הזמנות.</p>
      )}

      {/* פעולות */}
      <div className="d-flex gap-2">
        <Link to="/catalog" className="btn btn-outline-primary">
          המשך בקניות
        </Link>
        <button className="btn btn-danger">התנתק</button>
      </div>
    </div>
  );
}
