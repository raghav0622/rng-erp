import { AuthenticatedLayout } from '@/rng-ui/layouts/authenticated';
import { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
