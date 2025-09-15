// src/components/SizePicker.jsx
import React from "react";

export default function SizePicker({ sizes = [], value, onChange }) {
  if (!sizes || sizes.length === 0) {
    return <p className="text-muted small">אין מידות זמינות</p>;
  }

  return (
    <div>
      <label className="form-label fw-semibold">בחר מידה</label>
      <div className="d-flex flex-wrap gap-2">
        {sizes.map((s) => (
          <button
            key={s}
            type="button"
            className={`btn btn-sm ${value === s ? "btn-dark" : "btn-outline-dark"}`}
            onClick={() => onChange(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
