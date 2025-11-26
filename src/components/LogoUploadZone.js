import React, { useState, useCallback } from 'react';
import './LogoUploadZone.css';

function calculateDPI(width, height, physicalWidthCm = 30, physicalHeightCm = 35) {
  const widthInches = physicalWidthCm / 2.54;
  const heightInches = physicalHeightCm / 2.54;
  
  const dpiX = width / widthInches;
  const dpiY = height / heightInches;
  
  return Math.min(dpiX, dpiY);
}

function getQualityLevel(dpi) {
  if (dpi >= 200) return { level: 'excellent', label: 'מצוין', color: 'success' };
  if (dpi >= 150) return { level: 'good', label: 'סביר', color: 'warning' };
  return { level: 'low', label: 'נמוך', color: 'danger' };
}

export default function LogoUploadZone({ onUpload, side = 'front', accept = 'image/*' }) {
  const [preview, setPreview] = useState(null);
  const [quality, setQuality] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = useCallback((file) => {
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate DPI/quality
        const dpi = calculateDPI(img.width, img.height);
        const qualityInfo = getQualityLevel(dpi);
        
        setQuality({ dpi: Math.round(dpi), ...qualityInfo });
        setPreview(e.target.result);
        setIsProcessing(false);

        // Call parent callback
        if (onUpload) {
          onUpload(file, {
            preview: e.target.result,
            width: img.width,
            height: img.height,
            dpi,
            quality: qualityInfo.level
          });
        }
      };
      img.onerror = () => {
        setIsProcessing(false);
        alert('שגיאה בטעינת התמונה');
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      setIsProcessing(false);
      alert('שגיאה בקריאת הקובץ');
    };
    reader.readAsDataURL(file);
  }, [onUpload]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleReset = useCallback((e) => {
    e.stopPropagation();
    setPreview(null);
    setQuality(null);
    setFileName('');
  }, []);

  return (
    <div className="logo-upload-zone-wrapper">
      <div
        className={`logo-upload-zone ${isDragging ? 'dragging' : ''} ${preview ? 'has-preview' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById(`file-input-${side}`)?.click()}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            document.getElementById(`file-input-${side}`)?.click();
          }
        }}
        aria-label={preview ? 'שנה לוגו' : 'העלה לוגו'}
      >
        <input
          id={`file-input-${side}`}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          style={{ display: 'none' }}
          aria-hidden="true"
        />

        {isProcessing ? (
          <div className="upload-processing">
            <div className="spinner-border text-primary mb-2" role="status">
              <span className="visually-hidden">מעבד קובץ...</span>
            </div>
            <p className="text-muted mb-0">מעבד קובץ...</p>
          </div>
        ) : !preview ? (
          <div className="upload-prompt">
            <div className="upload-icon mb-3">
              📤
            </div>
            <h4 className="mb-2">גרור ושחרר לוגו כאן</h4>
            <p className="text-muted mb-3">או לחץ לבחירת קובץ</p>
            
            <div className="supported-formats mb-3">
              <span className="badge bg-light text-dark me-1">PNG</span>
              <span className="badge bg-light text-dark me-1">JPG</span>
              <span className="badge bg-light text-dark me-1">SVG</span>
              <span className="badge bg-light text-dark">PDF</span>
            </div>
            
            <small className="text-muted d-block">
              💡 מומלץ: קובץ ברזולוציה גבוהה (לפחות 300 DPI)
            </small>
          </div>
        ) : (
          <div className="upload-preview">
            <div className="preview-image-wrapper">
              <img src={preview} alt="תצוגה מקדימה של הלוגו" className="preview-image" />
            </div>
            
            <div className="preview-info mt-3">
              <div className="file-name mb-2">
                <small className="text-muted">📁 {fileName}</small>
              </div>
              
              {quality && (
                <div className="quality-indicator">
                  <span className={`badge bg-${quality.color} fs-6`}>
                    {quality.level === 'excellent' && '✓ '}
                    {quality.level === 'good' && '⚠ '}
                    {quality.level === 'low' && '⚠ '}
                    איכות {quality.label} ({quality.dpi} DPI)
                  </span>
                  
                  {quality.level === 'low' && (
                    <p className="text-danger small mt-2 mb-0">
                      <strong>המלצה:</strong> השתמש בקובץ ברזולוציה גבוהה יותר לתוצאות הדפסה מיטביות
                    </p>
                  )}
                </div>
              )}
              
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary mt-3"
                onClick={handleReset}
              >
                החלף לוגו
              </button>
            </div>
          </div>
        )}

        {isDragging && (
          <div className="drag-overlay">
            <div className="drag-overlay-content">
              <div className="drag-icon">📥</div>
              <p className="mb-0 fw-bold">שחרר כאן</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
