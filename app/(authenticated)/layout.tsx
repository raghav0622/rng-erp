import { ReactNode } from 'react';
import { DashboardLayout } from './DashboardLayout';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export default function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
