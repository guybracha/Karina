// src/components/ColorSwatches.jsx
import React from "react";

// מיפוי שמות צבעים לקודי צבע
const COLOR_MAP = {
  "שחור": "#000000",
  "לבן": "#FFFFFF",
  "נייבי": "#000080",
  "אפור": "#808080",
  "צהוב": "#FFD700",
  "כתום": "#FF8C00",
  "ירוק": "#228B22",
  "כחול": "#4169E1",
  "בז׳": "#D2B48C",
  "שחור/כחול": "linear-gradient(90deg, #000000 50%, #000080 50%)",
};

export default function ColorSwatches({ colors = [], value, onChange }) {
  if (!colors || colors.length === 0) {
    return <p className="text-muted small">אין צבעים זמינים</p>;
  }

  return (
    <div>
      <label className="form-label fw-semibold">בחר צבע</label>
      <div className="d-flex flex-wrap gap-3 align-items-center">
        {colors.map((c) => {
          const colorValue = COLOR_MAP[c] || "#CCCCCC";
          const isGradient = colorValue.includes("gradient");
          const isSelected = value === c;
          
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              title={c}
              aria-label={c}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: isSelected ? "3px solid #0066cc" : "2px solid #dee2e6",
                background: colorValue,
                cursor: "pointer",
                boxShadow: isSelected ? "0 0 0 3px rgba(0, 102, 204, 0.2)" : "0 1px 3px rgba(0,0,0,0.1)",
                transition: "all 0.2s ease",
                outline: c === "לבן" ? "1px solid #dee2e6" : "none",
                padding: 0,
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = "scale(1.1)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                }
              }}
            />
          );
        })}
      </div>
      {value && (
        <div className="mt-2">
          <small className="text-muted">צבע נבחר: {value}</small>
        </div>
      )}
    </div>
  );
}
