'use client';

import { useEffect } from 'react';

/**
 * Hook to handle dynamic viewport height on mobile devices
 * Sets a CSS custom property --app-height to the actual viewport height
 * This helps fix issues with mobile browser URL bars and toolbars
 */
export function useDynamicViewportHeight() {
  useEffect(() => {
    // Check if device is mobile (max-width: 768px)
    const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
    
    // Function to update the viewport height
    const updateViewportHeight = () => {
      if (isMobile()) {
        const vh = window.innerHeight;
        document.documentElement.style.setProperty('--app-height', `${vh}px`);
      } else {
        // Reset to default for desktop
        document.documentElement.style.removeProperty('--app-height');
      }
    };

    // Update on mount
    updateViewportHeight();

    // Update on resize and orientation change
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
    };
  }, []);
}