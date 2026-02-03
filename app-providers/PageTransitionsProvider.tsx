'use client';

import { useEffect } from 'react';

/**
 * Page transition styles - smooth fade in for all pages
 * Injects CSS for page transition animations
 */
export function PageTransitionsProvider() {
  useEffect(() => {
    // Create and inject styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      body {
        animation: fadeIn 0.3s ease-in-out;
      }

      /* Smooth transitions for common elements */
      * {
        transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
      }

      /* But disable transitions on page load */
      .no-transition {
        transition: none !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
}
