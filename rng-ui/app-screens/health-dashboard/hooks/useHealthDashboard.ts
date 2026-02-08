'use client';

import { useIsOwnerBootstrapped, useListOrphanedUsers, useListUsers } from '@/rng-platform';

export function useHealthDashboard() {
  const { data: users, refetch: refetchUsers, isRefetching } = useListUsers();
  const { data: orphanedUsers, refetch: refetchOrphaned } = useListOrphanedUsers();
  const { data: isOwnerBootstrapped } = useIsOwnerBootstrapped();

  const allUsers = users || [];
  const orphaned = orphanedUsers || [];

  const totalUsers = allUsers.length;
  const activeUsers = allUsers.filter((u) => !u.isDisabled).length;
  const disabledUsers = allUsers.filter((u) => u.isDisabled).length;
  const invitedUsers = allUsers.filter((u) => u.inviteStatus === 'invited').length;
  const activatedUsers = allUsers.filter((u) => u.inviteStatus === 'activated').length;
  const revokedUsers = allUsers.filter((u) => u.inviteStatus === 'revoked').length;
  const unverifiedEmails = allUsers.filter((u) => !u.emailVerified).length;
  const orphanedCount = orphaned.length;

  const healthScore = Math.max(0, 100 - orphanedCount * 10 - invitedUsers * 2 - disabledUsers * 1);

  const healthColor: 'green' | 'yellow' | 'red' =
    healthScore >= 80 ? 'green' : healthScore >= 60 ? 'yellow' : 'red';
  const healthLabel =
    healthScore >= 80 ? 'Healthy' : healthScore >= 60 ? 'Fair' : 'Needs Attention';

  const handleRefreshAll = () => {
    refetchUsers();
    refetchOrphaned();
  };

  return {
    users: allUsers,
    orphanedUsers: orphaned,
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
  };
}
