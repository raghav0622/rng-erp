'use client';

import { nprogress } from '@mantine/nprogress';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function RouteProgressProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      // Defer nprogress.start() to avoid useInsertionEffect scheduling conflict
      setTimeout(() => nprogress.start(), 0);
    };

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      start();
      return originalPushState.apply(this, args as any);
    };

    history.replaceState = function (...args) {
      start();
      return originalReplaceState.apply(this, args as any);
    };

    const handlePopState = () => start();
    window.addEventListener('popstate', handlePopState);

    return () => {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    if (!startedRef.current) return;

    nprogress.complete();
    startedRef.current = false;
  }, [pathname, searchParams]);

  return null;
}
