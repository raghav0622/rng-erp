'use client';

import { useOrphanedCleanupScreen } from './hooks/useOrphanedCleanupScreen';
import { OrphanedCleanupView } from './ui-components/OrphanedCleanupView';

export function OrphanedCleanupScreen() {
  const { orphanedUsers, externalErrors, cleaningUserId, handleCleanup, handleRefresh } =
    useOrphanedCleanupScreen();

  return (
    <OrphanedCleanupView
      orphanedUsers={orphanedUsers}
      externalErrors={externalErrors}
      cleaningUserId={cleaningUserId}
      onCleanup={handleCleanup}
      onRefresh={handleRefresh}
    />
  );
}
