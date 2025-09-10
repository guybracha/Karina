import React, { useState } from "react";

export default function A11yFab({ side = "left" }) {
  const [pressed, setPressed] = useState(false);

  const toggleAll = () => {
    setPressed((v) => !v);
    window.dispatchEvent(new CustomEvent("a11y:toggle-all"));
  };

  return (
    <button
      className={`a11y-fab ${side === "right" ? "is-right" : "is-left"}`}
      aria-label="פתח/סגור כלי נגישות והקראה"
      aria-pressed={pressed}
      onClick={toggleAll}
    >
      {/* אייקון "נגישות" (Universal Access) */}
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path fill="currentColor" d="M12 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm7 6h-5v13h-2V8H5V6h14v2Zm-7 4c-2.21 0-4 1.79-4 4h2a2 2 0 1 1 4 0h2c0-2.21-1.79-4-4-4Z"/>
      </svg>
    </button>
  );
}
