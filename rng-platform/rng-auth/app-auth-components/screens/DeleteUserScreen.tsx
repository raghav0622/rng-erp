'use client';

import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDeleteUser } from '../../app-auth-hooks/useUserManagementMutations';
import { useGetUserById } from '../../app-auth-hooks/useUserQueries';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { AuthLoadingOverlay } from '../boundaries/AuthLoadingOverlay';
import ConfirmationCheckbox from '../components/ConfirmationCheckbox';
import PasswordVerificationModal from '../components/PasswordVerificationModal';
import RoleBadge from '../components/RoleBadge';
import UserInfoTable from '../components/UserInfoTable';
import UserStatusBadge from '../components/UserStatusBadge';
import { ErrorAlert, ScreenContainer, ScreenHeader } from '../shared/ScreenComponents';

export interface DeleteUserScreenProps {
  userId: string;
  onSuccess?: (user: AppUser) => void;
  backPath?: string;
}

/**
 * Delete user screen
 *
 * Features:
 * - Soft-delete user accounts (reversible via RestoreUserScreen)
 * - Shows user details for confirmation
 * - Requires confirmation checkbox
 * - Prevents deleting owner account
 * - Prevents deleting self
 * - Async deletion with error handling
 *
 * Safety:
 * - Password verification required before deletion
 * - Requires explicit confirmation checkbox
 * - Clear warning about consequences
 *
 * @example
 * <DeleteUserScreen userId="user123" backPath="/users" />
 */
export function DeleteUserScreen({
  userId,
  onSuccess,
  backPath = '/users',
}: DeleteUserScreenProps) {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useGetUserById(userId);
  const deleteUser = useDeleteUser();
  const [confirmed, setConfirmed] = useState(false);
  const [showPasswordVerify, setShowPasswordVerify] = useState(false);
  const [externalErrors, setExternalErrors] = useState<string[]>([]);

  if (userLoading) {
    return <AuthLoadingOverlay message="Loading user..." />;
  }

  if (!user) {
    return (
      <ScreenContainer>
        <ErrorAlert
          title="User Not Found"
          description="The user you're trying to delete could not be found."
        />
        <Button onClick={() => router.push(backPath)}>Back to Users</Button>
      </ScreenContainer>
    );
  }

  // Prevent deleting owner
  if (user.role === 'owner') {
    return (
      <ScreenContainer>
        <ErrorAlert
          title="Cannot Delete Owner Account"
          description="Owner account cannot be deleted. If you need to transfer ownership, contact support."
        />
        <Button onClick={() => router.push(backPath)}>Back</Button>
      </ScreenContainer>
    );
  }

  const handleDelete = async () => {
    if (!confirmed) {
      setExternalErrors(['Please confirm the deletion']);
      return;
    }

    // Show password verification modal
    setShowPasswordVerify(true);
  };

  const handleVerifiedDelete = async () => {
    setShowPasswordVerify(false);
    setExternalErrors([]);

    try {
      await deleteUser.mutateAsync({ userId });

      if (onSuccess && user) {
        onSuccess(user);
      }

      // Success - redirect after delay
      setTimeout(() => {
        router.push(backPath);
      }, 1500);
    } catch (error) {
      const appError = error as any;
      setExternalErrors([appError?.message || 'Failed to delete user']);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Delete User"
        description={`Permanently remove ${user.name} from the system`}
        icon={IconTrash}
      />

      <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
        <Stack gap="xs">
          <Text fw={600} size="sm">
            ⚠️ This action is reversible via restore, but will:
          </Text>
          <ul style={{ marginLeft: 16, marginBottom: 0 }}>
            <li>End all active sessions</li>
            <li>Prevent login access</li>
            <li>Mark account as deleted</li>
            <li>Hide from user lists (recoverable)</li>
          </ul>
        </Stack>
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
            { label: 'Status', value: <UserStatusBadge user={user} /> },
          ]}
        />

        <ConfirmationCheckbox
          label={`I confirm deletion of ${user.name} (can be restored later)`}
          checked={confirmed}
          onChange={setConfirmed}
          description="Check to enable delete button"
        />

        <Group justify="space-between">
          <Button variant="subtle" onClick={() => router.push(backPath)}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={handleDelete}
            loading={deleteUser.isPending}
            disabled={!confirmed}
            leftSection={<IconTrash size={16} />}
          >
            Delete User
          </Button>
        </Group>
      </Stack>

      <PasswordVerificationModal
        opened={showPasswordVerify}
        onClose={() => setShowPasswordVerify(false)}
        onVerified={handleVerifiedDelete}
        actionName="delete this user"
        warningMessage={`You are about to permanently delete ${user.name}'s account. This action is reversible via restore.`}
      />
    </ScreenContainer>
  );
}

export default DeleteUserScreen;
