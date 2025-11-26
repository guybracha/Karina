import React from 'react';
import './OrderProgressBar.css';

const steps = [
  { id: 1, label: 'בחירת מוצר', icon: '🛍️', path: '/catalog' },
  { id: 2, label: 'העלאת לוגו', icon: '🎨', path: '/product' },
  { id: 3, label: 'עגלה', icon: '🛒', path: '/cart' },
  { id: 4, label: 'פרטי משלוח', icon: '📦', path: '/cart' },
  { id: 5, label: 'תשלום', icon: '💳', path: '/checkout' }
];

export default function OrderProgressBar({ currentStep = 1 }) {
  return (
    <div className="order-progress-bar py-3" role="navigation" aria-label="התקדמות הזמנה">
      <div className="container">
        <div className="steps-container">
          {steps.map((step, idx) => (
            <div key={step.id} className="step-wrapper">
              <div 
                className={`step ${currentStep >= step.id ? 'completed' : ''} ${currentStep === step.id ? 'active' : ''}`}
                aria-current={currentStep === step.id ? 'step' : undefined}
              >
                <div className="step-circle">
                  {currentStep > step.id ? (
                    <span className="step-check">✓</span>
                  ) : (
                    <>
                      <span className="step-icon d-none d-md-inline" aria-hidden="true">{step.icon}</span>
                      <span className="step-number">{step.id}</span>
                    </>
                  )}
                </div>
              </div>
              <span className="step-label d-none d-sm-inline">{step.label}</span>
              {idx < steps.length - 1 && (
                <div className={`step-line ${currentStep > step.id ? 'completed' : ''}`} aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
