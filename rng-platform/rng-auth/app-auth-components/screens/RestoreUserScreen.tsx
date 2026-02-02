'use client';

import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconRestore } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useRestoreUser } from '../../app-auth-hooks/useUserManagementMutations';
import { useGetUserById } from '../../app-auth-hooks/useUserQueries';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { AuthLoadingOverlay } from '../boundaries/AuthLoadingOverlay';
import ConfirmationCheckbox from '../components/ConfirmationCheckbox';
import RoleBadge from '../components/RoleBadge';
import UserInfoTable from '../components/UserInfoTable';
import { ErrorAlert, ScreenContainer, ScreenHeader } from '../shared/ScreenComponents';
import { formatShortDate } from '../utils/dateFormatters';

export interface RestoreUserScreenProps {
  userId: string;
  onSuccess?: (user: AppUser) => void;
  backPath?: string;
}

/**
 * Restore deleted user screen
 *
 * Features:
 * - Recover soft-deleted user accounts
 * - Shows deletion timestamp
 * - Requires confirmation
 * - Restores user to active state
 * - Re-enables login access
 *
 * @example
 * <RestoreUserScreen userId="user123" backPath="/users" />
 */
export function RestoreUserScreen({
  userId,
  onSuccess,
  backPath = '/users',
}: RestoreUserScreenProps) {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useGetUserById(userId);
  const restoreUser = useRestoreUser();
  const [confirmed, setConfirmed] = useState(false);
  const [externalErrors, setExternalErrors] = useState<string[]>([]);

  if (userLoading) {
    return <AuthLoadingOverlay message="Loading user..." />;
  }

  if (!user) {
    return (
      <ScreenContainer>
        <ErrorAlert
          title="User Not Found"
          description="The user you're trying to restore could not be found."
        />
        <Button onClick={() => router.push(backPath)}>Back to Users</Button>
      </ScreenContainer>
    );
  }

  // User must be deleted to restore
  if (!user.deletedAt) {
    return (
      <ScreenContainer>
        <ErrorAlert
          title="User Not Deleted"
          description={`${user.name} is not deleted and does not need restoration.`}
        />
        <Button onClick={() => router.push(backPath)}>Back</Button>
      </ScreenContainer>
    );
  }

  const handleRestore = async () => {
    if (!confirmed) {
      setExternalErrors(['Please confirm the restoration']);
      return;
    }

    setExternalErrors([]);

    try {
      const restoredUser = await restoreUser.mutateAsync({ userId });

      if (onSuccess) {
        onSuccess(restoredUser);
      }

      // Success - redirect
      setTimeout(() => {
        router.push(`${backPath}/${userId}`);
      }, 1500);
    } catch (error) {
      const appError = error as any;
      setExternalErrors([appError?.message || 'Failed to restore user']);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Restore User"
        description={`Recover deleted account for ${user.name}`}
        icon={IconRestore}
      />

      <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
        <Text size="sm">
          Restoring this user will re-enable their account and allow login access again.
        </Text>
      </Alert>

      {externalErrors.length > 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          <Stack gap="xs">
            {externalErrors.map((error, idx) => (
              <Text key={idx} size="sm">
                {error}
              </Text>
            ))}
          </Stack>
        </Alert>
      )}

      <Stack gap="lg">
        <UserInfoTable
          items={[
            { label: 'User Name', value: user.name },
            { label: 'Email', value: user.email },
            { label: 'Role', value: <RoleBadge role={user.role} /> },
            { label: 'Deleted On', value: formatShortDate(user.deletedAt ?? null) },
          ]}
        />

        <ConfirmationCheckbox
          label={`I confirm restoring ${user.name}'s account`}
          checked={confirmed}
          onChange={setConfirmed}
          description="Check to enable restore button"
        />

        <Group justify="space-between">
          <Button variant="subtle" onClick={() => router.push(backPath)}>
            Cancel
          </Button>
          <Button
            onClick={handleRestore}
            loading={restoreUser.isPending}
            disabled={!confirmed}
            leftSection={<IconRestore size={16} />}
          >
            Restore User
          </Button>
        </Group>
      </Stack>
    </ScreenContainer>
  );
}

export default RestoreUserScreen;
