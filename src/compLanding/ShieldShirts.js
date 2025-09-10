import React from 'react';
import safety from '../img/safety.png';

function ShieldShirts({ onScrollToShield = () => {} }) {
  return (
    <div className="shield-container text-center">
      <h1>מוצרי בטיחות</h1>
      <div className="image-wrapper" onClick={onScrollToShield}>
        <img
          src={safety}
          alt="מוצרי בטיחות"
          className="img-fluid clickable-image"
        />
      </div>
    </div>
  );
}

export default ShieldShirts;
