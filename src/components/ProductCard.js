// src/components/ProductCard.js
import React from "react";
import "./ProductCard.css";

/**
 * ProductCard - כרטיס מוצר אינטראקטיבי לשימוש בצ'אטבוט
 * מציג תמונה, פרטים, מחיר וכפתורי פעולה
 */
export default function ProductCard({ 
  product, 
  onCalculatePrice, 
  onViewDetails,
  showActions = true 
}) {
  if (!product) return null;

  const handleWhatsApp = () => {
    const phone = "972557212443";
    const message = `שלום, אני מעוניין במוצר: ${product.name}\nמחיר: ₪${product.price}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleViewProduct = () => {
    if (onViewDetails) {
      onViewDetails(product);
    } else {
      window.location.href = `/product/${product.slug}`;
    }
  };

  return (
    <div className="product-card">
      <div className="product-card-image">
        {product.images && product.images.length > 0 ? (
          <img 
            src={product.images[0]} 
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              e.target.src = '/img/placeholder-product.png';
            }}
          />
        ) : (
          <div className="product-card-placeholder">
            <i className="bi bi-image"></i>
          </div>
        )}
        {product.isNew && (
          <span className="product-card-badge new">חדש!</span>
        )}
        {product.isPopular && (
          <span className="product-card-badge popular">🔥 פופולרי</span>
        )}
      </div>

      <div className="product-card-content">
        <h4 className="product-card-title">{product.name}</h4>
        
        <div className="product-card-details">
          {product.colors && product.colors.length > 0 && (
            <div className="product-detail">
              <i className="bi bi-palette"></i>
              <span>{product.colors.length} צבעים</span>
            </div>
          )}
          
          {product.sizes && product.sizes.length > 0 && (
            <div className="product-detail">
              <i className="bi bi-rulers"></i>
              <span>{product.sizes[0]} - {product.sizes[product.sizes.length - 1]}</span>
            </div>
          )}
        </div>

        <div className="product-card-price">
          <span className="price-label">החל מ-</span>
          <span className="price-value">₪{product.price}</span>
          <span className="price-unit">ליחידה</span>
        </div>

        {product.description && (
          <p className="product-card-description">{product.description}</p>
        )}

        {showActions && (
          <div className="product-card-actions">
            <button 
              className="btn-action primary"
              onClick={() => onCalculatePrice && onCalculatePrice(product)}
              title="חשב מחיר"
            >
              <i className="bi bi-calculator"></i>
              <span>חשב מחיר</span>
            </button>
            
            <button 
              className="btn-action secondary"
              onClick={handleViewProduct}
              title="פרטים מלאים"
            >
              <i className="bi bi-eye"></i>
            </button>
            
            <button 
              className="btn-action success"
              onClick={handleWhatsApp}
              title="שלח ב-WhatsApp"
            >
              <i className="bi bi-whatsapp"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ProductCarousel - קרוסלת מוצרים
 */
export function ProductCarousel({ products, onCalculatePrice, onViewDetails }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="product-carousel">
      <div className="product-carousel-container">
        {products.map(product => (
          <ProductCard
            key={product.slug || product.id}
            product={product}
            onCalculatePrice={onCalculatePrice}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
      {products.length > 3 && (
        <div className="product-carousel-hint">
          <i className="bi bi-arrow-left-right"></i>
          <span>גלול לצדדים לעוד מוצרים</span>
        </div>
      )}
    </div>
  );
}
