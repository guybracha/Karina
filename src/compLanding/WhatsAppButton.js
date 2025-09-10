import React from "react";
import "../style/Landing.css"; // לוודא שמיובא ה־CSS

export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/972545042443" // כאן להכניס את המספר שלך בפורמט בינלאומי
      className="whatsapp-float"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
        alt="WhatsApp"
        className="whatsapp-icon"
      />
    </a>
  );
}
