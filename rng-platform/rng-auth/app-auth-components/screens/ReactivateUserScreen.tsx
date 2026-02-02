'use client';

import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useReactivateUser } from '../../app-auth-hooks/useUserManagementMutations';
import { useGetUserById } from '../../app-auth-hooks/useUserQueries';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { AuthLoadingOverlay } from '../boundaries/AuthLoadingOverlay';
import ConfirmationCheckbox from '../components/ConfirmationCheckbox';
import RoleBadge from '../components/RoleBadge';
import UserInfoTable from '../components/UserInfoTable';
import UserStatusBadge from '../components/UserStatusBadge';
import { ErrorAlert, ScreenContainer, ScreenHeader } from '../shared/ScreenComponents';

export interface ReactivateUserScreenProps {
  userId: string;
  onSuccess?: (user: AppUser) => void;
  backPath?: string;
}

/**
 * Reactivate disabled user screen
 *
 * Features:
 * - Re-enable previously disabled accounts
 * - Shows disabled timestamp
 * - Requires confirmation
 * - Restores login access
 * - Cannot reactivate owner that's disabled
 *
 * @example
 * <ReactivateUserScreen userId="user123" backPath="/users" />
 */
export function ReactivateUserScreen({
  userId,
  onSuccess,
  backPath = '/users',
}: ReactivateUserScreenProps) {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useGetUserById(userId);
  const reactivateUser = useReactivateUser();
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
          description="The user you're trying to reactivate could not be found."
        />
        <Button onClick={() => router.push(backPath)}>Back to Users</Button>
      </ScreenContainer>
    );
  }

  // User must be disabled to reactivate
  if (!user.isDisabled) {
    return (
      <ScreenContainer>
        <ErrorAlert
          title="User Not Disabled"
          description={`${user.name} is already active and does not need reactivation.`}
        />
        <Button onClick={() => router.push(backPath)}>Back</Button>
      </ScreenContainer>
    );
  }

  const handleReactivate = async () => {
    if (!confirmed) {
      setExternalErrors(['Please confirm the reactivation']);
      return;
    }

    setExternalErrors([]);

    try {
      const reactivatedUser = await reactivateUser.mutateAsync({ userId });

      if (onSuccess) {
        onSuccess(reactivatedUser);
      }

      // Success - redirect
      setTimeout(() => {
        router.push(`${backPath}/${userId}`);
      }, 1500);
    } catch (error) {
      const appError = error as any;
      setExternalErrors([appError?.message || 'Failed to reactivate user']);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Reactivate User"
        description={`Re-enable ${user.name}'s account`}
        icon={IconCheck}
      />

      <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
        <Text size="sm">
          Reactivating this user will restore their login access and enable all account features.
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
            { label: 'Current Status', value: <UserStatusBadge user={user} /> },
          ]}
        />

        <ConfirmationCheckbox
          label={`I confirm reactivating ${user.name}'s account`}
          checked={confirmed}
          onChange={setConfirmed}
          description="Check to enable reactivate button"
        />

        <Group justify="space-between">
          <Button variant="subtle" onClick={() => router.push(backPath)}>
            Cancel
          </Button>
          <Button
            onClick={handleReactivate}
            loading={reactivateUser.isPending}
            disabled={!confirmed}
            leftSection={<IconCheck size={16} />}
          >
            Reactivate User
          </Button>
        </Group>
      </Stack>
    </ScreenContainer>
  );
}

export default ReactivateUserScreen;
