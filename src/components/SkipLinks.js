import React from 'react';
import './SkipLinks.css';

export default function SkipLinks() {
  return (
    <div className="skip-links" aria-label="קישורי דילוג">
      <a href="#main-content" className="skip-link">
        דלג לתוכן הראשי
      </a>
      <a href="#navigation" className="skip-link">
        דלג לתפריט ניווט
      </a>
      <a href="#search" className="skip-link">
        דלג לחיפוש
      </a>
      <a href="#footer" className="skip-link">
        דלג לתחתית הדף
      </a>
    </div>
  );
}
