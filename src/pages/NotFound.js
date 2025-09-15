// src/pages/NotFound.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="container py-5 text-center">
      <h1 className="display-4 fw-bold mb-3">404</h1>
      <p className="lead mb-4">העמוד שחיפשת לא נמצא.</p>
      
      <div className="d-flex justify-content-center gap-3">
        <Link to="/" className="btn btn-primary">
          חזרה לדף הבית
        </Link>
        <Link to="/catalog" className="btn btn-outline-secondary">
          לקטלוג המוצרים
        </Link>
      </div>

      <div className="mt-5">
        <img
          src="https://cdn-icons-png.flaticon.com/512/2748/2748558.png"
          alt="Not found illustration"
          style={{ maxWidth: "200px", opacity: 0.7 }}
        />
      </div>
    </div>
  );
}
