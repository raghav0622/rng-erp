import { ReactNode, Suspense } from 'react';

export function ServiceSuspense({
  fallback,
  children,
}: {
  fallback: ReactNode;
  children: ReactNode;
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
