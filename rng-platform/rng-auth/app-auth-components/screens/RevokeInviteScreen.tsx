'use client';

import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconX } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useRevokeInvite } from '../../app-auth-hooks/useUserManagementMutations';
import { useGetUserById } from '../../app-auth-hooks/useUserQueries';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { AuthLoadingOverlay } from '../boundaries/AuthLoadingOverlay';
import ConfirmationCheckbox from '../components/ConfirmationCheckbox';
import InviteStatusBadge from '../components/InviteStatusBadge';
import RoleBadge from '../components/RoleBadge';
import UserInfoTable from '../components/UserInfoTable';
import { ErrorAlert, ScreenContainer, ScreenHeader } from '../shared/ScreenComponents';
import { formatShortDate } from '../utils/dateFormatters';

export interface RevokeInviteScreenProps {
  userId: string;
  onSuccess?: (user: AppUser) => void;
  backPath?: string;
}

/**
 * Revoke invite screen
 *
 * Features:
 * - Cancel pending invitations
 * - Shows original invite date
 * - User must be in 'invited' status
 * - Requires confirmation
 * - User cannot sign up after revocation
 * - Cannot undo after confirmation
 *
 * @example
 * <RevokeInviteScreen userId="user123" backPath="/users" />
 */
export function RevokeInviteScreen({
  userId,
  onSuccess,
  backPath = '/users',
}: RevokeInviteScreenProps) {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useGetUserById(userId);
  const revokeInvite = useRevokeInvite();
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
          description="The user you're trying to revoke could not be found."
        />
        <Button onClick={() => router.push(backPath)}>Back to Users</Button>
      </ScreenContainer>
    );
  }

  // User must be invited (not activated or already revoked)
  if (user.inviteStatus !== 'invited') {
    const statusMessage =
      user.inviteStatus === 'activated'
        ? 'User has already accepted the invitation.'
        : 'User invitation has already been revoked.';
    return (
      <ScreenContainer>
        <ErrorAlert
          title="Cannot Revoke Invite"
          description={`User cannot have their invitation revoked. Status: ${user.inviteStatus}. ${statusMessage}`}
        />
        <Button onClick={() => router.push(backPath)}>Back</Button>
      </ScreenContainer>
    );
  }

  const handleRevoke = async () => {
    if (!confirmed) {
      setExternalErrors(['Please confirm the revocation']);
      return;
    }

    setExternalErrors([]);

    try {
      const revokedUser = await revokeInvite.mutateAsync({ userId });

      if (onSuccess) {
        onSuccess(revokedUser);
      }

      // Success - redirect
      setTimeout(() => {
        router.push(backPath);
      }, 1500);
    } catch (error) {
      const appError = error as any;
      setExternalErrors([appError?.message || 'Failed to revoke invitation']);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Revoke Invitation"
        description={`Cancel pending invitation for ${user.name}`}
        icon={IconX}
      />

      <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light">
        <Stack gap="xs">
          <Text fw={600} size="sm">
            ⚠️ Revoking will:
          </Text>
          <ul style={{ marginLeft: 16, marginBottom: 0 }}>
            <li>Cancel the pending invitation</li>
            <li>Prevent user from signing up</li>
            <li>Invalidate their invitation link</li>
            <li>Require new invitation to join</li>
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
            { label: 'Invite Sent Date', value: formatShortDate(user.inviteSentAt ?? null) },
            { label: 'Current Status', value: <InviteStatusBadge user={user} detailed /> },
          ]}
        />

        <ConfirmationCheckbox
          label={`I confirm revoking ${user.name}'s invitation`}
          checked={confirmed}
          onChange={setConfirmed}
          description="Check to enable revoke button"
        />

        <Group justify="space-between">
          <Button variant="subtle" onClick={() => router.push(backPath)}>
            Cancel
          </Button>
          <Button
            color="orange"
            onClick={handleRevoke}
            loading={revokeInvite.isPending}
            disabled={!confirmed}
            leftSection={<IconX size={16} />}
          >
            Revoke Invitation
          </Button>
        </Group>
      </Stack>
    </ScreenContainer>
  );
}

export default RevokeInviteScreen;
