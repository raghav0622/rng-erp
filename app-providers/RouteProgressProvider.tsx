'use client';

import { nprogress } from '@mantine/nprogress';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Route progress provider for Next.js App Router
 * Works with @mantine/nprogress NavigationProgress component
 *
 * On navigation start: shows progress bar
 * On navigation complete: completes progress bar
 */
export function RouteProgressProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Intercept navigation methods
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      nprogress.start();
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      nprogress.start();
      return originalReplaceState.apply(this, args);
    };

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (target && target.href && target.href.startsWith(window.location.origin)) {
        nprogress.start();
      }
    };

    document.addEventListener('click', handleClick);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      document.removeEventListener('click', handleClick);
    };
  }, []);

  useEffect(() => {
    // Complete progress when pathname or searchParams change
    nprogress.complete();
  }, [pathname, searchParams]);

  return null;
}
