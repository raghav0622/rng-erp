'use client';

import { useHealthDashboard } from './hooks/useHealthDashboard';
import { HealthDashboardView } from './ui-components/HealthDashboardView';

export function HealthDashboardScreen() {
  const {
    isOwnerBootstrapped,
    isRefetching,
    totalUsers,
    activeUsers,
    disabledUsers,
    invitedUsers,
    activatedUsers,
    revokedUsers,
    unverifiedEmails,
    orphanedCount,
    healthScore,
    healthColor,
    healthLabel,
    handleRefreshAll,
  } = useHealthDashboard();

  return (
    <HealthDashboardView
      isOwnerBootstrapped={isOwnerBootstrapped}
      isRefetching={isRefetching}
      totalUsers={totalUsers}
      activeUsers={activeUsers}
      disabledUsers={disabledUsers}
      invitedUsers={invitedUsers}
      activatedUsers={activatedUsers}
      revokedUsers={revokedUsers}
      unverifiedEmails={unverifiedEmails}
      orphanedCount={orphanedCount}
      healthScore={healthScore}
      healthColor={healthColor}
      healthLabel={healthLabel}
      onRefresh={handleRefreshAll}
    />
  );
}
