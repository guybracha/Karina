import React from 'react';
import './LoadingStates.css';

// Skeleton loader for products
export function ProductSkeleton() {
  return (
    <div className="product-skeleton" aria-busy="true" aria-label="טוען מוצר">
      <div className="skeleton-img skeleton-shimmer"></div>
      <div className="skeleton-content">
        <div className="skeleton-title skeleton-shimmer"></div>
        <div className="skeleton-text skeleton-shimmer"></div>
        <div className="skeleton-price skeleton-shimmer"></div>
      </div>
    </div>
  );
}

// Grid of product skeletons
export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="row g-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="col-6 col-md-4 col-lg-3">
          <ProductSkeleton />
        </div>
      ))}
    </div>
  );
}

// Loading spinner with message
export function LoadingSpinner({ message = 'טוען...', size = 'md' }) {
  const sizeClasses = {
    sm: 'spinner-border-sm',
    md: '',
    lg: 'spinner-border-lg'
  };

  return (
    <div className="loading-spinner text-center py-4" role="status">
      <div className={`spinner-border text-primary ${sizeClasses[size]}`}>
        <span className="visually-hidden">{message}</span>
      </div>
      {message && <p className="mt-2 text-muted small">{message}</p>}
    </div>
  );
}

// Full page loading overlay
export function LoadingOverlay({ message = 'טוען...', show = true }) {
  if (!show) return null;

  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-overlay-content">
        <div className="spinner-border text-light mb-3" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">{message}</span>
        </div>
        <p className="text-light">{message}</p>
      </div>
    </div>
  );
}

// Progress bar for uploads
export function UploadProgress({ progress = 0, fileName = '', showPercent = true }) {
  return (
    <div className="upload-progress">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <span className="small text-truncate" style={{ maxWidth: '70%' }}>
          {fileName || 'מעלה קובץ...'}
        </span>
        {showPercent && (
          <span className="small fw-semibold text-primary">{Math.round(progress)}%</span>
        )}
      </div>
      <div className="progress" style={{ height: '8px' }}>
        <div
          className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
          role="progressbar"
          style={{ width: `${progress}%` }}
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
        ></div>
      </div>
    </div>
  );
}

// Inline text skeleton
export function TextSkeleton({ width = '100%', height = '1em' }) {
  return (
    <span 
      className="skeleton-text skeleton-shimmer d-inline-block"
      style={{ width, height }}
      aria-hidden="true"
    ></span>
  );
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="card">
      <div className="skeleton-img skeleton-shimmer" style={{ height: '200px' }}></div>
      <div className="card-body">
        <div className="skeleton-title skeleton-shimmer mb-2"></div>
        <div className="skeleton-text skeleton-shimmer mb-2" style={{ width: '80%' }}></div>
        <div className="skeleton-text skeleton-shimmer" style={{ width: '60%' }}></div>
      </div>
    </div>
  );
}

// Pulse animation for loading states
export function PulseLoader({ count = 3 }) {
  return (
    <div className="pulse-loader d-flex gap-2 justify-content-center align-items-center">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="pulse-dot"
          style={{ animationDelay: `${i * 0.15}s` }}
        ></div>
      ))}
    </div>
  );
}
