// src/components/ColorSwatches.jsx
import React from "react";

export default function ColorSwatches({ colors = [], value, onChange }) {
  if (!colors || colors.length === 0) {
    return <p className="text-muted small">אין צבעים זמינים</p>;
  }

  return (
    <div>
      <label className="form-label fw-semibold">בחר צבע</label>
      <div className="d-flex flex-wrap gap-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            className={`btn btn-sm ${value === c ? "btn-dark" : "btn-outline-dark"}`}
            onClick={() => onChange(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
