import { useEffect, useRef } from 'react';

/**
 * Focus trap hook for modals and dialogs
 * Traps keyboard focus within a container element
 * @param {boolean} isActive - Whether the focus trap is active
 * @returns {React.RefObject} Ref to attach to the container element
 */
export function useFocusTrap(isActive = false) {
  const containerRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // Store the currently focused element
    previouslyFocusedElement.current = document.activeElement;

    // Get all focusable elements
    const getFocusableElements = () => {
      return container.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]):not(:disabled), [contenteditable="true"]'
      );
    };

    const focusableElements = getFocusableElements();
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    if (firstElement) {
      setTimeout(() => firstElement.focus(), 100);
    }

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      const currentFocusableElements = getFocusableElements();
      const currentFirst = currentFocusableElements[0];
      const currentLast = currentFocusableElements[currentFocusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === currentFirst) {
          e.preventDefault();
          currentLast?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === currentLast) {
          e.preventDefault();
          currentFirst?.focus();
        }
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        // Trigger close event
        container.dispatchEvent(new CustomEvent('escapekeydown'));
      }
    };

    container.addEventListener('keydown', handleTab);
    container.addEventListener('keydown', handleEscape);

    return () => {
      container.removeEventListener('keydown', handleTab);
      container.removeEventListener('keydown', handleEscape);

      // Restore focus to previously focused element
      if (previouslyFocusedElement.current) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Lock body scroll when modal is open
 * @param {boolean} isLocked - Whether scroll should be locked
 */
export function useScrollLock(isLocked = false) {
  useEffect(() => {
    if (!isLocked) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Get scrollbar width
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Lock scroll
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isLocked]);
}

/**
 * Announce content to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 */
export function announce(message, priority = 'polite') {
  const announcer = document.getElementById('sr-announcer') || createAnnouncer();
  announcer.setAttribute('aria-live', priority);
  announcer.textContent = message;

  // Clear after announcement
  setTimeout(() => {
    announcer.textContent = '';
  }, 1000);
}

function createAnnouncer() {
  const announcer = document.createElement('div');
  announcer.id = 'sr-announcer';
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.style.position = 'absolute';
  announcer.style.left = '-10000px';
  announcer.style.width = '1px';
  announcer.style.height = '1px';
  announcer.style.overflow = 'hidden';
  document.body.appendChild(announcer);
  return announcer;
}
