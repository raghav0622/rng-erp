'use client';

import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { IconAlertCircle, IconMail } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useResendInvite } from '../../app-auth-hooks/useUserManagementMutations';
import { useGetUserById } from '../../app-auth-hooks/useUserQueries';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { AuthLoadingOverlay } from '../boundaries/AuthLoadingOverlay';
import InviteStatusBadge from '../components/InviteStatusBadge';
import RoleBadge from '../components/RoleBadge';
import UserInfoTable from '../components/UserInfoTable';
import { ErrorAlert, ScreenContainer, ScreenHeader } from '../shared/ScreenComponents';
import { formatShortDate } from '../utils/dateFormatters';

export interface ResendInviteScreenProps {
  userId: string;
  onSuccess?: (user: AppUser) => void;
  backPath?: string;
}

/**
 * Resend invite screen
 *
 * Features:
 * - Retry sending invitation to user
 * - Shows original invite date
 * - Can force resend even if already sent
 * - User must be in 'invited' status
 * - Updates invite timestamp
 *
 * @example
 * <ResendInviteScreen userId="user123" backPath="/users" />
 */
export function ResendInviteScreen({
  userId,
  onSuccess,
  backPath = '/users',
}: ResendInviteScreenProps) {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useGetUserById(userId);
  const resendInvite = useResendInvite();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  if (userLoading) {
    return <AuthLoadingOverlay message="Loading user..." />;
  }

  if (!user) {
    return (
      <ScreenContainer>
        <ErrorAlert
          title="User Not Found"
          description="The user you're trying to invite could not be found."
        />
        <Button onClick={() => router.push(backPath)}>Back to Users</Button>
      </ScreenContainer>
    );
  }

  // User must be invited (not activated or revoked)
  if (user.inviteStatus !== 'invited') {
    const statusMessage =
      user.inviteStatus === 'activated'
        ? 'User has already accepted the invitation.'
        : 'User invitation has been revoked.';
    return (
      <ScreenContainer>
        <ErrorAlert
          title="Cannot Resend Invite"
          description={`User cannot be re-invited. Status: ${user.inviteStatus}. ${statusMessage}`}
        />
        <Button onClick={() => router.push(backPath)}>Back</Button>
      </ScreenContainer>
    );
  }

  const handleResend = async () => {
    setExternalErrors([]);
    setSuccessMessage('');

    try {
      const updatedUser = await resendInvite.mutateAsync({ userId });

      if (onSuccess) {
        onSuccess(updatedUser);
      }

      setSuccessMessage(`Invitation resent to ${user.email}`);

      // Redirect after delay
      setTimeout(() => {
        router.push(`${backPath}/${userId}`);
      }, 2000);
    } catch (error) {
      const appError = error as any;
      setExternalErrors([appError?.message || 'Failed to resend invitation']);
    }
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Resend Invitation"
        description={`Re-send invite to ${user.name}`}
        icon={IconMail}
      />

      {successMessage && (
        <Alert icon={<IconAlertCircle size={16} />} color="green" variant="light">
          <Text size="sm">{successMessage}</Text>
        </Alert>
      )}

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
            {
              label: 'Original Invite Date',
              value: formatShortDate(user.inviteSentAt ?? null),
            },
            { label: 'Invite Status', value: <InviteStatusBadge user={user} detailed /> },
          ]}
        />

        <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            A new invitation link will be sent to {user.email}. Any previous links will expire.
          </Text>
        </Alert>

        <Group justify="space-between">
          <Button variant="subtle" onClick={() => router.push(backPath)}>
            Cancel
          </Button>
          <Button
            onClick={handleResend}
            loading={resendInvite.isPending}
            leftSection={<IconMail size={16} />}
          >
            Resend Invitation
          </Button>
        </Group>
      </Stack>
    </ScreenContainer>
  );
}

export default ResendInviteScreen;
