// src/components/PriceCalculatorWidget.js
import React, { useState, useEffect } from "react";
import { priceForItem, getDiscountPct } from "../lib/pricing";
import { PRODUCTS } from "../lib/products";
import "./PriceCalculatorWidget.css";

/**
 * PriceCalculatorWidget - מחשבון מחירים אינטראקטיבי
 * עם slider לכמות וחישוב מיידי של הנחות
 */
export default function PriceCalculatorWidget({ 
  product, 
  initialQuantity = 10,
  onWhatsAppShare 
}) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [pricing, setPricing] = useState(null);
  const [discount, setDiscount] = useState(0);

  // חישוב מחיר בכל שינוי
  useEffect(() => {
    if (product) {
      const calc = priceForItem({ slug: product.slug, qty: quantity }, PRODUCTS);
      const disc = getDiscountPct(quantity);
      setPricing(calc);
      setDiscount(disc);
    }
  }, [product, quantity]);

  if (!product || !pricing) return null;

  const handleSliderChange = (e) => {
    setQuantity(parseInt(e.target.value));
  };

  const handleQuantityInput = (e) => {
    const value = parseInt(e.target.value) || 1;
    setQuantity(Math.max(1, Math.min(500, value)));
  };

  const handleWhatsApp = () => {
    const phone = "972557212443";
    const message = `שלום! 👋

אני מעוניין בהצעת מחיר:

📦 *מוצר:* ${product.name}
📊 *כמות:* ${quantity} יחידות
${discount > 0 ? `🎁 *הנחה:* ${(discount * 100).toFixed(2)}%\n` : ''}
💰 *מחיר ליחידה:* ₪${pricing.unitAfter}
🏷️ *סה"כ:* ₪${pricing.lineTotal}

הגעתי מהאתר דרך הצ'אט בוט 🤖`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    if (onWhatsAppShare) {
      onWhatsAppShare({ product, quantity, pricing });
    }
  };

  // מציאת הרמה הבאה של הנחה
  const getNextTier = () => {
    const tiers = [10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];
    const next = tiers.find(t => t > quantity);
    if (next) {
      const nextPricing = priceForItem({ slug: product.slug, qty: next }, PRODUCTS);
      const nextDiscount = getDiscountPct(next);
      return { quantity: next, pricing: nextPricing, discount: nextDiscount };
    }
    return null;
  };

  const nextTier = getNextTier();
  const savings = discount > 0 ? (pricing.baseUnit - pricing.unitAfter) * quantity : 0;

  return (
    <div className="price-calculator-widget">
      {/* Header */}
      <div className="calculator-header">
        <div className="calculator-icon">
          <i className="bi bi-calculator-fill"></i>
        </div>
        <div className="calculator-title">
          <h4>{product.name}</h4>
          <p>מחשבון מחירים אינטראקטיבי</p>
        </div>
      </div>

      {/* Quantity Selector */}
      <div className="quantity-selector">
        <label htmlFor="quantity-slider">
          <span>כמות יחידות:</span>
          <input 
            type="number" 
            value={quantity}
            onChange={handleQuantityInput}
            min="1"
            max="500"
            className="quantity-input"
          />
        </label>
        
        <div className="slider-container">
          <input
            id="quantity-slider"
            type="range"
            min="1"
            max="200"
            value={quantity}
            onChange={handleSliderChange}
            className="quantity-slider"
            style={{
              background: `linear-gradient(to left, #667eea ${((quantity / 200) * 100)}%, #e9ecef ${((quantity / 200) * 100)}%)`
            }}
          />
          <div className="slider-labels">
            <span>1</span>
            <span>50</span>
            <span>100</span>
            <span>200</span>
          </div>
        </div>
      </div>

      {/* Discount Badge */}
      {discount > 0 && (
        <div className="discount-badge">
          <i className="bi bi-gift-fill"></i>
          <span>הנחת כמות: <strong>{(discount * 100).toFixed(2)}%</strong></span>
        </div>
      )}

      {/* Price Breakdown */}
      <div className="price-breakdown">
        <div className="price-row">
          <span className="label">מחיר בסיס:</span>
          <span className="value">₪{pricing.baseUnit} ליחידה</span>
        </div>
        
        {discount > 0 && (
          <>
            <div className="price-row discount">
              <span className="label">אחרי הנחה:</span>
              <span className="value highlight">₪{pricing.unitAfter} ליחידה</span>
            </div>
            <div className="price-row savings">
              <span className="label">
                <i className="bi bi-piggy-bank"></i>
                חיסכון:
              </span>
              <span className="value success">₪{savings.toFixed(2)}</span>
            </div>
          </>
        )}

        <div className="price-row total">
          <span className="label">סה"כ לתשלום:</span>
          <span className="value total-value">₪{pricing.lineTotal}</span>
        </div>
      </div>

      {/* Next Tier Suggestion */}
      {nextTier && (
        <div className="next-tier-suggestion">
          <div className="suggestion-icon">💡</div>
          <div className="suggestion-content">
            <strong>שדרג את ההזמנה!</strong>
            <p>
              בהזמנה של <strong>{nextTier.quantity}</strong> יחידות:
            </p>
            <ul>
              <li>הנחה: <strong>{(nextTier.discount * 100).toFixed(2)}%</strong></li>
              <li>מחיר ליחידה: <strong>₪{nextTier.pricing.unitAfter}</strong></li>
              <li>סה"כ: <strong>₪{nextTier.pricing.lineTotal}</strong></li>
            </ul>
            <button 
              className="btn-upgrade"
              onClick={() => setQuantity(nextTier.quantity)}
            >
              שדרג ל-{nextTier.quantity} יחידות
            </button>
          </div>
        </div>
      )}

      {quantity >= 100 && (
        <div className="max-discount-badge">
          <i className="bi bi-star-fill"></i>
          <span>מעולה! קיבלת את ההנחה המקסימלית!</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="calculator-actions">
        <button 
          className="btn-whatsapp"
          onClick={handleWhatsApp}
        >
          <i className="bi bi-whatsapp"></i>
          <span>שלח הצעת מחיר ב-WhatsApp</span>
        </button>
        
        <button 
          className="btn-view-product"
          onClick={() => window.location.href = `/product/${product.slug}`}
        >
          <i className="bi bi-eye"></i>
          <span>פרטים מלאים</span>
        </button>
      </div>

      {/* Discount Chart Mini */}
      <div className="discount-info">
        <div className="info-header">
          <i className="bi bi-info-circle"></i>
          <span>מדרגות הנחה</span>
        </div>
        <div className="discount-tiers">
          <div className={`tier ${quantity >= 10 && quantity < 20 ? 'active' : ''}`}>
            10-19: 2.39%
          </div>
          <div className={`tier ${quantity >= 20 && quantity < 30 ? 'active' : ''}`}>
            20-29: 7.17%
          </div>
          <div className={`tier ${quantity >= 50 && quantity < 60 ? 'active' : ''}`}>
            50-59: 21.54%
          </div>
          <div className={`tier ${quantity >= 100 ? 'active' : ''}`}>
            100+: עד 45%!
          </div>
        </div>
      </div>
    </div>
  );
}
