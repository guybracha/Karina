import { useEffect, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';

/**
 * Auto-save hook that saves data to localStorage after a delay
 * @param {string} key - LocalStorage key
 * @param {any} data - Data to save
 * @param {number} delay - Delay in milliseconds (default: 2000)
 * @param {boolean} showToast - Show success toast (default: false)
 */
export function useAutoSave(key, data, delay = 2000, showToast = false) {
  const toast = useToast();
  const isFirstRun = useRef(true);

  useEffect(() => {
    // Skip on first render
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    const timer = setTimeout(() => {
      try {
        const serialized = JSON.stringify(data);
        localStorage.setItem(key, serialized);
        
        if (showToast && toast) {
          toast.success('הנתונים נשמרו אוטומטית ✓', 1500);
        }
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('autoSave', { 
          detail: { key, timestamp: Date.now() } 
        }));
      } catch (err) {
        console.error('AutoSave failed:', err);
        if (toast) {
          toast.error('שגיאה בשמירה אוטומטית', 2000);
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [key, data, delay, showToast, toast]);
}

/**
 * Load saved data from localStorage
 * @param {string} key - LocalStorage key
 * @param {any} defaultValue - Default value if nothing is saved
 * @returns {any} Saved data or default value
 */
export function loadAutoSaved(key, defaultValue = null) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (err) {
    console.error('Failed to load auto-saved data:', err);
    return defaultValue;
  }
}
