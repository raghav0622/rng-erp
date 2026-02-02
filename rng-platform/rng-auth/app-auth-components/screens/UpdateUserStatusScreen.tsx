'use client';

import { Alert, Button, Group, Stack, Switch, Text } from '@mantine/core';
import { IconAlertCircle, IconLock } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useUpdateUserStatus } from '../../app-auth-hooks/useUserManagementMutations';
import { useGetUserById } from '../../app-auth-hooks/useUserQueries';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { AuthLoadingOverlay } from '../boundaries/AuthLoadingOverlay';
import RoleBadge from '../components/RoleBadge';
import UserStatusBadge from '../components/UserStatusBadge';
import { ErrorAlert, ScreenContainer, ScreenHeader } from '../shared/ScreenComponents';

export interface UpdateUserStatusScreenProps {
  userId: string;
  onSuccess?: (user: AppUser) => void;
  backPath?: string;
}

/**
 * Update user status screen
 *
 * Features:
 * - Enable/disable user accounts
 * - Shows current account status
 * - Prevents disabling owner account
 * - Async status validation
 *
 * Actions:
 * - Disable: Prevents login, clears sessions
 * - Enable: Re-enables previously disabled account
 *
 * @example
 * <UpdateUserStatusScreen userId="user123" backPath="/users" />
 */
export function UpdateUserStatusScreen({
  userId,
  onSuccess,
  backPath = '/users',
}: UpdateUserStatusScreenProps) {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useGetUserById(userId);
  const updateStatus = useUpdateUserStatus();
  const [newDisabledState, setNewDisabledState] = useState<boolean | null>(null);
  const [externalErrors, setExternalErrors] = useState<string[]>([]);

  if (userLoading) {
    return <AuthLoadingOverlay message="Loading user..." />;
  }

  if (!user) {
    return (
      <ScreenContainer>
        <ErrorAlert
          title="User Not Found"
          description="The user you're trying to update could not be found."
        />
        <Button onClick={() => router.push(backPath)}>Back to Users</Button>
      </ScreenContainer>
    );
  }

  // Cannot disable owner
  const isOwner = user.role === 'owner';

  const handleStatusChange = async (disabled: boolean) => {
    if (isOwner && disabled) {
      setExternalErrors(['Cannot disable owner account']);
      return;
    }

    if (disabled === user.isDisabled) {
      setExternalErrors(['User is already in this state']);
      return;
    }

    setExternalErrors([]);
    setNewDisabledState(disabled);

    try {
      const updatedUser = await updateStatus.mutateAsync({
        userId,
        data: { isDisabled: disabled },
      });

      if (onSuccess) {
        onSuccess(updatedUser);
      }

      // Success - redirect
      setTimeout(() => {
        router.push(`${backPath}/${userId}`);
      }, 1500);
    } catch (error) {
      setNewDisabledState(null);
      const appError = error as any;
      setExternalErrors([appError?.message || 'Failed to update user status']);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Update User Status"
        description={`Manage account status for ${user.name}`}
        icon={IconLock}
      />

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
        <Stack gap="md">
          <div>
            <Text size="sm" c="dimmed">
              Role
            </Text>
            <RoleBadge role={user.role} />
          </div>

          <div>
            <Text size="sm" c="dimmed" mb="xs">
              Current Status
            </Text>
            <UserStatusBadge user={user} />
          </div>
        </Stack>

        <Stack
          gap="md"
          p="md"
          style={{
            backgroundColor: 'var(--mantine-color-gray-0)',
            borderRadius: 'var(--mantine-radius-md)',
          }}
        >
          <Switch
            label={user.isDisabled ? 'Enable account' : 'Disable account'}
            description={
              user.isDisabled
                ? 'User will be able to sign in again'
                : 'User will not be able to sign in. Existing sessions will end.'
            }
            checked={!user.isDisabled}
            onChange={(e) => handleStatusChange(!e.currentTarget.checked)}
            disabled={updateStatus.isPending || isOwner}
          />

          {isOwner && (
            <Alert
              icon={<IconAlertCircle size={16} />}
              color="yellow"
              variant="light"
              title="Owner Account"
            >
              <Text size="sm">Owner account cannot be disabled.</Text>
            </Alert>
          )}
        </Stack>

        <Group justify="space-between">
          <Button variant="subtle" onClick={() => router.push(backPath)}>
            Cancel
          </Button>
          <Button
            loading={updateStatus.isPending || newDisabledState !== null}
            disabled={isOwner && !user.isDisabled}
          >
            {updateStatus.isPending ? 'Updating...' : 'Update Status'}
          </Button>
        </Group>
      </Stack>
    </ScreenContainer>
  );
}

export default UpdateUserStatusScreen;
