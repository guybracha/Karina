// src/compLanding/ContactBanner.jsx
import React, { useState, useEffect } from "react";
import contactBtn from "../img/contactbanner.png"; // התמונה הקטנה

export default function ContactBanner() {
  // false = מצב סגור (מציג את הגרפיקה שלך)
  // true = מצב פתוח (מציג את כפתור הוואטסאפ)
  const [open, setOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // אם המשתמש גלל יותר מ-300px בפעם הראשונה
      if (window.scrollY > 300 && !autoOpened) {
        setOpen(true);
        setAutoOpened(true); // לא נפתח שוב
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [autoOpened]);

  return (
    <>
      {/* באנר וואטסאפ פתוח */}
      {open && (
        <div className="contact-banner card-soft">
          <a
            href="https://wa.me/972545042443"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
              alt="WhatsApp"
              style={{ width: "24px", marginInlineEnd: "6px" }}
            />
          </a>
          <button
            className="contact-close"
            onClick={() => setOpen(false)}
            aria-label="סגור באנר"
          >
            ×
          </button>
        </div>
      )}

      {/* גרפיקה PNG כשהבאנר סגור */}
      {!open && (
        <button
          className="contact-fab"
          onClick={() => setOpen(true)}
          aria-label="פתח באנר צור קשר"
        >
          <img
            src={contactBtn}
            alt="צרו קשר"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </button>
      )}
    </>
  );
}
