import React from 'react';

/**
 * Optimized image component with lazy loading and WebP support
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  sizes,
  ...props
}) {
  // Convert to WebP if available
  const webpSrc = src?.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  const hasFallback = src !== webpSrc;

  return (
    <picture>
      {hasFallback && (
        <source 
          srcSet={webpSrc} 
          type="image/webp"
          sizes={sizes}
        />
      )}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={className}
        {...(priority && { fetchpriority: 'high' })}
        {...props}
      />
    </picture>
  );
}

/**
 * Responsive image with srcset
 */
export function ResponsiveImage({
  src,
  alt,
  widths = [320, 640, 960, 1280],
  className = '',
  ...props
}) {
  // Generate srcset
  const srcset = widths
    .map(w => {
      const filename = src.replace(/(\.\w+)$/, `-${w}w$1`);
      return `${filename} ${w}w`;
    })
    .join(', ');

  return (
    <img
      src={src}
      srcSet={srcset}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      {...props}
    />
  );
}

/**
 * Avatar/profile image with fallback
 */
export function Avatar({
  src,
  alt,
  size = 48,
  fallback,
  className = '',
  ...props
}) {
  const [error, setError] = React.useState(false);

  const handleError = () => setError(true);

  if (error || !src) {
    return (
      <div
        className={`avatar-fallback ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#e9ecef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size / 2,
          color: '#6c757d',
          fontWeight: 600
        }}
        {...props}
      >
        {fallback || alt?.charAt(0) || '?'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={handleError}
      className={className}
      style={{ borderRadius: '50%', objectFit: 'cover' }}
      {...props}
    />
  );
}
