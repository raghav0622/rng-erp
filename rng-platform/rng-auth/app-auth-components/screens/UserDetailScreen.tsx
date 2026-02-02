'use client';

import {
  ActionIcon,
  Alert,
  Button,
  Container,
  Group,
  Menu,
  Modal,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconBan,
  IconCheck,
  IconChevronLeft,
  IconDots,
  IconMail,
  IconPencil,
  IconTrash,
  IconUserCheck,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  useDeleteUser,
  useResendInvite,
  useRestoreUser,
  useRevokeInvite,
  useUpdateUserStatus,
} from '../../app-auth-hooks/useUserManagementMutations';
import { useGetUserById } from '../../app-auth-hooks/useUserQueries';
import type { AppAuthError } from '../../app-auth-service/app-auth.errors';
import { AuthLoadingOverlay } from '../boundaries/AuthLoadingOverlay';
import EmailVerificationBadge from '../components/EmailVerificationBadge';
import RoleBadge from '../components/RoleBadge';
import UserStatusBadge from '../components/UserStatusBadge';
import { formatUserDate } from '../utils/dateFormatters';

export interface UserDetailScreenProps {
  /**
   * User ID to display
   */
  userId: string;
  /**
   * Path to navigate back to
   * @default '/users'
   */
  backPath?: string;
  /**
   * Path to edit user (userId will be appended)
   * @default '/users/edit'
   */
  editPathPrefix?: string;
  /**
   * Custom header content
   */
  header?: React.ReactNode;
  /**
   * Show action buttons
   * @default true
   */
  showActions?: boolean;
}

/**
 * User detail screen
 *
 * Features:
 * - Shows user profile details
 * - User status management (disable, enable)
 * - Invite management (resend, revoke)
 * - Soft delete/restore
 * - Role and profile editing (navigation)
 *
 * @example
 * <UserDetailScreen userId="abc123" backPath="/users" />
 */
export function UserDetailScreen({
  userId,
  backPath = '/users',
  editPathPrefix = '/users/edit',
  header,
  showActions = true,
}: UserDetailScreenProps) {
  const router = useRouter();
  const { data: user, isLoading } = useGetUserById(userId);
  const updateStatus = useUpdateUserStatus();
  const resendInvite = useResendInvite();
  const revokeInvite = useRevokeInvite();
  const deleteUser = useDeleteUser();
  const restoreUser = useRestoreUser();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);

  if (isLoading) {
    return <AuthLoadingOverlay message="Loading user details..." />;
  }

  if (!user) {
    return (
      <Container size="md" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="User Not Found"
          color="red"
          variant="light"
        >
          <Text size="sm">The requested user could not be found.</Text>
        </Alert>
      </Container>
    );
  }

  const handleBack = () => {
    router.push(backPath);
  };

  const handleEdit = () => {
    router.push(`${editPathPrefix}/${userId}`);
  };

  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
    confirmLabel?: string;
    color?: string;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);

  const openConfirm = (state: {
    title: string;
    message: string;
    action: () => Promise<void>;
    confirmLabel?: string;
    color?: string;
  }) => {
    setConfirmState(state);
  };

  const handleConfirm = async () => {
    if (!confirmState) return;
    setConfirming(true);
    try {
      await confirmState.action();
      setConfirmState(null);
    } finally {
      setConfirming(false);
    }
  };

  const handleDisable = async () => {
    openConfirm({
      title: 'Disable User',
      message: 'Are you sure you want to disable this user?',
      confirmLabel: 'Disable',
      color: 'orange',
      action: async () => {
        try {
          await updateStatus.mutateAsync({ userId, data: { isDisabled: true } });
        } catch (error) {
          setExternalErrors([(error as AppAuthError).message]);
        }
      },
    });
  };

  const handleEnable = async () => {
    try {
      await updateStatus.mutateAsync({ userId, data: { isDisabled: false } });
    } catch (error) {
      setExternalErrors([(error as AppAuthError).message]);
    }
  };

  const handleResendInvite = async () => {
    try {
      await resendInvite.mutateAsync({ userId });
      setExternalErrors([]); // Clear errors on success
    } catch (error) {
      setExternalErrors([(error as AppAuthError).message]);
    }
  };

  const handleRevokeInvite = async () => {
    openConfirm({
      title: 'Revoke Invitation',
      message: 'Are you sure you want to revoke this invitation?',
      confirmLabel: 'Revoke',
      color: 'orange',
      action: async () => {
        try {
          await revokeInvite.mutateAsync({ userId });
        } catch (error) {
          setExternalErrors([(error as AppAuthError).message]);
        }
      },
    });
  };

  const handleDelete = async () => {
    openConfirm({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This can be undone.',
      confirmLabel: 'Delete',
      color: 'red',
      action: async () => {
        try {
          await deleteUser.mutateAsync({ userId });
          router.push(backPath);
        } catch (error) {
          setExternalErrors([(error as AppAuthError).message]);
        }
      },
    });
  };

  const handleRestore = async () => {
    try {
      await restoreUser.mutateAsync({ userId });
    } catch (error) {
      setExternalErrors([(error as AppAuthError).message]);
    }
  };

  return (
    <Container size="md" py="xl">
      <Modal
        opened={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.title}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{confirmState?.message}</Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={() => setConfirmState(null)} disabled={confirming}>
              Cancel
            </Button>
            <Button color={confirmState?.color} onClick={handleConfirm} loading={confirming}>
              {confirmState?.confirmLabel || 'Confirm'}
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <Button variant="subtle" leftSection={<IconChevronLeft size={16} />} onClick={handleBack}>
            Back to Users
          </Button>
          {showActions && user.role !== 'owner' && (
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="subtle" size="lg">
                  <IconDots size={20} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Actions</Menu.Label>
                <Menu.Item leftSection={<IconPencil size={14} />} onClick={handleEdit}>
                  Edit Profile
                </Menu.Item>
                {user.inviteStatus === 'invited' && (
                  <>
                    <Menu.Item leftSection={<IconMail size={14} />} onClick={handleResendInvite}>
                      Resend Invite
                    </Menu.Item>
                    <Menu.Item leftSection={<IconBan size={14} />} onClick={handleRevokeInvite}>
                      Revoke Invite
                    </Menu.Item>
                  </>
                )}
                {!user.deletedAt && (
                  <>
                    <Menu.Divider />
                    {user.isDisabled ? (
                      <Menu.Item
                        leftSection={<IconUserCheck size={14} />}
                        onClick={handleEnable}
                        color="green"
                      >
                        Enable User
                      </Menu.Item>
                    ) : (
                      <Menu.Item
                        leftSection={<IconBan size={14} />}
                        onClick={handleDisable}
                        color="orange"
                      >
                        Disable User
                      </Menu.Item>
                    )}
                    <Menu.Divider />
                    <Menu.Item
                      leftSection={<IconTrash size={14} />}
                      onClick={handleDelete}
                      color="red"
                    >
                      Delete User
                    </Menu.Item>
                  </>
                )}
                {user.deletedAt && (
                  <Menu.Item
                    leftSection={<IconCheck size={14} />}
                    onClick={handleRestore}
                    color="green"
                  >
                    Restore User
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>

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

        {header}

        <Paper shadow="sm" p="xl" radius="md" withBorder>
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
              <Stack gap="xs">
                <Title order={2}>{user.name}</Title>
                <Text c="dimmed">{user.email}</Text>
                <EmailVerificationBadge user={user} inline />
              </Stack>
              <Group gap="xs">
                <UserStatusBadge user={user} />
                <RoleBadge role={user.role} size="lg" />
              </Group>
            </Group>

            {user.roleCategory && (
              <Paper p="md" withBorder>
                <Text size="sm" c="dimmed">
                  Category
                </Text>
                <Text size="sm" fw={600}>
                  {user.roleCategory}
                </Text>
              </Paper>
            )}

            <Group grow>
              <Paper p="md" withBorder>
                <Text size="sm" c="dimmed">
                  Email Verified
                </Text>
                <Text size="sm" fw={600}>
                  {user.emailVerified ? 'Yes' : 'No'}
                </Text>
              </Paper>
              <Paper p="md" withBorder>
                <Text size="sm" c="dimmed">
                  Registered on ERP
                </Text>
                <Text size="sm" fw={600}>
                  {user.isRegisteredOnERP ? 'Yes' : 'No'}
                </Text>
              </Paper>
            </Group>

            <Paper p="md" withBorder>
              <Stack gap="xs">
                <Text size="sm" c="dimmed">
                  Invite Status
                </Text>
                <Text size="sm" fw={600}>
                  {user.inviteStatus}
                </Text>
                {user.inviteSentAt && (
                  <Text size="xs" c="dimmed">
                    Sent: {formatUserDate(user.inviteSentAt)}
                  </Text>
                )}
                {user.inviteRespondedAt && (
                  <Text size="xs" c="dimmed">
                    Responded: {formatUserDate(user.inviteRespondedAt)}
                  </Text>
                )}
              </Stack>
            </Paper>

            <Group grow>
              <Paper p="md" withBorder>
                <Text size="sm" c="dimmed">
                  Created
                </Text>
                <Text size="xs" fw={600}>
                  {formatUserDate(user.createdAt)}
                </Text>
              </Paper>
              <Paper p="md" withBorder>
                <Text size="sm" c="dimmed">
                  Updated
                </Text>
                <Text size="xs" fw={600}>
                  {formatUserDate(user.updatedAt)}
                </Text>
              </Paper>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
