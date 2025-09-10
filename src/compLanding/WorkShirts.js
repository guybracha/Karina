import React from 'react';
import Work from '../img/work.png';

function WorkShirts({ onScrollToWork = () => {} }) {
  return (
    <div className="work-container text-center">
      <h1>בגדי עבודה</h1>
      <div className="image-wrapper" onClick={onScrollToWork}>
        <img
          src={Work}
          alt="בגדי עבודה"
          className="img-fluid clickable-image"
        />
      </div>
    </div>
  );
}

export default WorkShirts;
