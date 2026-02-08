import { OwnerOnlyLayout } from '@/rng-ui/layouts';
import { ReactNode } from 'react';

interface OwnerOnlyLayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: OwnerOnlyLayoutProps) {
  return <OwnerOnlyLayout>{children}</OwnerOnlyLayout>;
}
