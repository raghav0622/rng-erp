'use client';

import { RequireRole } from '@/rng-ui/auth/_RequireRole';
import { ReactNode } from 'react';

interface OwnerOnlyLayoutProps {
  children: ReactNode;
}

export function OwnerOnlyLayout({ children }: OwnerOnlyLayoutProps) {
  return <RequireRole allow={['owner']}>{children}</RequireRole>;
}
