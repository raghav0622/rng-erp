'use client';

import { useDashboard } from './hooks/useDashboard';
import { DashboardView } from './ui-components/DashboardView';

export function DashboardScreen() {
  const { welcomeMessage } = useDashboard();

  return <DashboardView welcomeMessage={welcomeMessage} />;
}
