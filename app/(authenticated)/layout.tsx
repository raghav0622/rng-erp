import AuthenticatedLayout from '@/rng-ui/layouts/authenticated/AuthenticatedLayout';
import { ReactNode } from 'react';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: AuthenticatedLayoutProps) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
