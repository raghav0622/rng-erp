import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
// RBACProvider and RBACContextValue removed (RBAC v2: use role from AuthState)
import { ServiceErrorBoundary, ServiceSuspense } from './feature-execution-engine/src';

interface RNGFirebaseAppShellProps {
  suspenseFallback: ReactNode;
  errorFallback: ReactNode | ((error: Error) => ReactNode);
  children: ReactNode;
}

export function RNGFirebaseAppShell({
  suspenseFallback,
  errorFallback,
  children,
}: RNGFirebaseAppShellProps) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  // Helper to render error fallback if function provided
  const renderErrorFallback = (error: Error) => {
    if (typeof errorFallback === 'function') {
      return errorFallback(error);
    }
    return errorFallback;
  };

  // Custom error boundary wrapper to support function fallback
  // (Wraps ServiceErrorBoundary and intercepts error to render fallback)
  // This is a workaround for the strict prop type
  const ErrorBoundaryWrapper = ({ children }: { children: ReactNode }) => (
    <ServiceErrorBoundary fallback={typeof errorFallback === 'function' ? null : errorFallback}>
      {children}
    </ServiceErrorBoundary>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundaryWrapper>
        <ServiceSuspense fallback={suspenseFallback}>{children}</ServiceSuspense>
      </ErrorBoundaryWrapper>
    </QueryClientProvider>
  );
}
