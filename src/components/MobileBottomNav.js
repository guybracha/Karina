import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './MobileBottomNav.css';

export default function MobileBottomNav() {
  const location = useLocation();
  const [cartCount, setCartCount] = React.useState(0);

  React.useEffect(() => {
    const updateCartCount = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('karina:cart') || '[]');
        const count = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
        setCartCount(count);
      } catch {
        setCartCount(0);
      }
    };

    updateCartCount();

    window.addEventListener('karina:cartUpdated', updateCartCount);
    window.addEventListener('storage', updateCartCount);

    return () => {
      window.removeEventListener('karina:cartUpdated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, []);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="mobile-bottom-nav d-md-none" role="navigation" aria-label="תפריט ניווט תחתון">
      <Link 
        to="/" 
        className={`nav-item ${isActive('/') ? 'active' : ''}`}
        aria-label="דף הבית"
        aria-current={isActive('/') ? 'page' : undefined}
      >
        <i className="bi bi-house-fill"></i>
        <span className="nav-label">בית</span>
      </Link>

      <Link 
        to="/catalog" 
        className={`nav-item ${isActive('/catalog') ? 'active' : ''}`}
        aria-label="קטלוג מוצרים"
        aria-current={isActive('/catalog') ? 'page' : undefined}
      >
        <i className="bi bi-grid-fill"></i>
        <span className="nav-label">קטלוג</span>
      </Link>

      <Link 
        to="/cart" 
        className={`nav-item ${isActive('/cart') ? 'active' : ''}`}
        aria-label={`עגלת קניות, ${cartCount} פריטים`}
        aria-current={isActive('/cart') ? 'page' : undefined}
      >
        <div className="nav-icon-wrapper">
          <i className="bi bi-cart-fill"></i>
          {cartCount > 0 && (
            <span className="cart-badge" aria-label={`${cartCount} פריטים בעגלה`}>
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </div>
        <span className="nav-label">עגלה</span>
      </Link>

      <Link 
        to="/account" 
        className={`nav-item ${isActive('/account') ? 'active' : ''}`}
        aria-label="החשבון שלי"
        aria-current={isActive('/account') ? 'page' : undefined}
      >
        <i className="bi bi-person-fill"></i>
        <span className="nav-label">חשבון</span>
      </Link>
    </nav>
  );
}
