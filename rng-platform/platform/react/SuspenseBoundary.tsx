import { ReactNode, Suspense } from 'react';

interface SuspenseBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

export const SuspenseBoundary = ({ fallback, children }: SuspenseBoundaryProps) => (
  <Suspense fallback={fallback}>{children}</Suspense>
);
