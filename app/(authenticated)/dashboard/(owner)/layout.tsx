'use client';

import { RequireRole } from '@/rng-ui/auth/_RequireRole';
import { ReactNode } from 'react';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}
export default function Layout({ children }: AuthenticatedLayoutProps) {
  return <RequireRole allow={['owner']}>{children}</RequireRole>;
}
