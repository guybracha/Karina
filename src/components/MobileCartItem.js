import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MobileCartItem.css';

export default function MobileCartItem({ item, onUpdateQty, onRemove }) {
  const navigate = useNavigate();

  const handleQtyChange = (newQty) => {
    if (newQty < 1) return;
    if (onUpdateQty) onUpdateQty(item.id, newQty);
  };

  const handleEdit = () => {
    // Navigate to product page with prefill data
    const prefill = {
      variants: item.variants || null,
      lastSelected: item.lastSelected || { color: item.color, size: item.size }
    };
    
    try {
      localStorage.setItem(`karina:productPrefill:${item.slug}`, JSON.stringify(prefill));
    } catch {}
    
    navigate(`/product/${item.slug}`, { state: { from: 'cart', prefill } });
  };

  const totalPrice = (Number(item.price) || 0) * (Number(item.qty) || 1);

  return (
    <div className="mobile-cart-item">
      <div className="item-header">
        <img 
          src={item.img || '/placeholder.png'} 
          alt={item.name}
          className="item-thumb"
          loading="lazy"
        />
        <div className="item-info">
          <h6 className="item-name">{item.name}</h6>
          <div className="item-meta">
            {item.color && <span className="badge bg-light text-dark me-1">צבע: {item.color}</span>}
            {item.size && <span className="badge bg-light text-dark">מידה: {item.size}</span>}
          </div>
        </div>
        <button
          className="btn btn-sm btn-outline-danger ms-2"
          onClick={() => onRemove && onRemove(item.id)}
          aria-label={`הסר ${item.name} מהעגלה`}
        >
          <i className="bi bi-trash"></i>
        </button>
      </div>

      <div className="item-details">
        <div className="detail-row">
          <span className="detail-label">מחיר יחידה:</span>
          <strong className="detail-value">{Number(item.price).toLocaleString('he-IL')} ₪</strong>
        </div>

        <div className="detail-row">
          <span className="detail-label">כמות:</span>
          <div className="qty-controls">
            <button
              type="button"
              className="qty-btn"
              onClick={() => handleQtyChange(item.qty - 1)}
              disabled={item.qty <= 1}
              aria-label="הפחת כמות"
            >
              <i className="bi bi-dash"></i>
            </button>
            <span className="qty-display" aria-live="polite">{item.qty}</span>
            <button
              type="button"
              className="qty-btn"
              onClick={() => handleQtyChange(item.qty + 1)}
              aria-label="הוסף כמות"
            >
              <i className="bi bi-plus"></i>
            </button>
          </div>
        </div>

        <div className="detail-row total-row">
          <span className="detail-label">סה"כ:</span>
          <strong className="detail-value text-primary fs-5">
            {totalPrice.toLocaleString('he-IL')} ₪
          </strong>
        </div>

        {item.variants && (
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary w-100 mt-2"
            onClick={handleEdit}
          >
            <i className="bi bi-pencil me-1"></i>
            ערוך פרטים
          </button>
        )}
      </div>
    </div>
  );
}
