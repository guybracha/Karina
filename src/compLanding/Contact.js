import React from 'react';

export default function Contact() {
  return (
    <div className="text-center my-4">
      <a
        href="https://wa.me/972545042443"
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-success d-inline-flex align-items-center"
        aria-label="ביצוע ההזמנה כנסו לוואטסאפ"
        style={{ gap: '8px' }}
      >
        <span>לביצוע ההזמנה — כנסו</span>
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
          alt=""
          width="22"
          height="22"
        />
      </a>
    </div>
  );
}
