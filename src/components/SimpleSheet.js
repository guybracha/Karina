import React, { useEffect } from "react";

export default function SimpleSheet({
  open,
  onClose,
  side = "end", // "end" | "start" | "bottom"
  width = 360,
  children,
  backdropOpacity = 0.5,
  labelledBy,
}) {
  // נועל גלילה כשפתוח
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ESC לסגירה
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isBottom = side === "bottom";
  const inlineStart = side === "start";
  const inlineEnd = side === "end";

  return (
    <div
      aria-hidden={!open}
      className="sheet-root"
      style={{ pointerEvents: open ? "auto" : "none" }}
    >
      {/* Backdrop */}
      <div
        className="sheet-backdrop"
        onClick={onClose}
        style={{
          opacity: open ? 1 : 0,
          background: `rgba(0,0,0,${backdropOpacity})`,
          transition: "opacity .18s ease",
        }}
      />
      {/* Panel */}
      <aside
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{
          width: isBottom ? "100%" : width,
          insetInlineStart: inlineStart ? 0 : "auto",
          insetInlineEnd: inlineEnd ? 0 : "auto",
          insetBlockEnd: isBottom ? 0 : "auto",
          transform: open
            ? "translate3d(0,0,0)"
            : isBottom
            ? "translate3d(0,100%,0)"
            : inlineEnd
            ? "translate3d(100%,0,0)"
            : "translate3d(-100%,0,0)",
        }}
      >
        {children}
      </aside>
    </div>
  );
}
