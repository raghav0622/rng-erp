import { ReactNode } from 'react';

interface UnauthenticatedLayoutProps {
  children: ReactNode;
}

/**
 * Unauthenticated layout - protected by middleware.
 * Middleware validates auth and redirects authenticated users
 * BEFORE this component renders, eliminating all page flashing.
 */
export default function UnauthenticatedLayout({ children }: UnauthenticatedLayoutProps) {
  return <>{children}</>;
}
