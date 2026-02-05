'use client';

import { useCurrentUser } from '@/rng-platform/rng-auth';
import {
  useDeleteUser,
  useResendInvite,
  useRestoreUser,
  useRevokeInvite,
  useUpdateUserStatus,
} from '@/rng-platform/rng-auth/app-auth-hooks/useUserManagementMutations';
import { useListUsersPaginated } from '@/rng-platform/rng-auth/app-auth-hooks/useUserQueries';
import type { AppUser } from '@/rng-platform/rng-auth/app-auth-service/internal-app-user-service/app-user.contracts';
import {
  UserActionsMenu,
  UserCardDesign,
  UserInfoTable,
  UserSearchInput,
  UserStatusBadge,
} from '@/rng-ui/auth';
import EmailVerificationBadge from '@/rng-ui/auth/_EmailVerificationBadge';
import { RNGPageContent } from '@/rng-ui/ux';
import { RNGModal } from '@/rng-ui/ux/_RNGModal';
import {
  Avatar,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUserPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

export default function UserManagementPage() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'status' | 'delete' | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('internal');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: currentUser } = useCurrentUser();
  const {
    data: paginatedResult = { data: [], nextPageToken: undefined, hasMore: false },
    isLoading,
  } = useListUsersPaginated(100, '');
  const users = paginatedResult.data || [];

  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const { mutate: restoreUser, isPending: isRestoring } = useRestoreUser();
  const { mutate: resendInvite, isPending: isResending } = useResendInvite();
  const { mutate: revokeInvite, isPending: isRevoking } = useRevokeInvite();
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateUserStatus();

  // Filter and sort users
  const { internalUsers, clientUsers } = useMemo(() => {
    const filtered = users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    // Sort by role: owner > manager > employee > client
    const roleOrder = { owner: 0, manager: 1, employee: 2, client: 3 };
    const sorted = filtered.sort(
      (a, b) =>
        roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder],
    );

    return {
      internalUsers: sorted.filter((u) => u.role !== 'client'),
      clientUsers: sorted.filter((u) => u.role === 'client'),
    };
  }, [users, searchTerm]);

  const handleResendInvite = useCallback(
    (userId: string) => {
      resendInvite(
        { userId },
        {
          onSuccess: () => {
            notifications.show({
              title: 'Invite Resent',
              message: 'Invitation email has been sent',
              color: 'green',
              autoClose: 3000,
            });
          },
          onError: (error: any) => {
            let errorMessage = error?.message || 'Could not resend invitation';

            // Enhance error message with cooldown time if available
            if (error?.hoursRemaining) {
              if (error.hoursRemaining > 1) {
                errorMessage = `Invitation can be resent in ${error.hoursRemaining} hours`;
              } else if (error?.minutesRemaining) {
                errorMessage = `Invitation can be resent in ${error.minutesRemaining} minutes`;
              }
            }

            notifications.show({
              title: 'Failed to Resend',
              message: errorMessage,
              color: 'red',
              autoClose: 4000,
            });
          },
        },
      );
    },
    [resendInvite],
  );

  const handleRevokeInvite = useCallback(
    (userId: string) => {
      revokeInvite(
        { userId },
        {
          onSuccess: () => {
            notifications.show({
              title: 'Invite Revoked',
              message: 'User invitation has been cancelled',
              color: 'green',
              autoClose: 3000,
            });
          },
          onError: (error: any) => {
            notifications.show({
              title: 'Failed to Revoke',
              message: error?.message || 'Could not revoke invitation',
              color: 'red',
              autoClose: 3000,
            });
          },
        },
      );
    },
    [revokeInvite],
  );

  const handleRestore = useCallback(
    (userId: string) => {
      restoreUser(
        { userId },
        {
          onSuccess: () => {
            notifications.show({
              title: 'User Restored',
              message: 'User account has been restored successfully',
              color: 'green',
              autoClose: 3000,
            });
          },
          onError: (error: any) => {
            notifications.show({
              title: 'Failed to Restore',
              message: error?.message || 'Could not restore user',
              color: 'red',
              autoClose: 3000,
            });
          },
        },
      );
    },
    [restoreUser],
  );

  const handleStatusChange = useCallback(
    (userId: string, isDisabled: boolean, onClose?: () => void) => {
      updateStatus(
        { userId, data: { isDisabled } },
        {
          onSuccess: () => {
            notifications.show({
              title: isDisabled ? 'User Disabled' : 'User Enabled',
              message: `User has been ${isDisabled ? 'disabled' : 'enabled'} successfully`,
              color: 'green',
              autoClose: 3000,
            });
            onClose?.();
          },
          onError: (error: any) => {
            notifications.show({
              title: 'Failed to Update Status',
              message: error?.message || 'Could not update user status',
              color: 'red',
              autoClose: 3000,
            });
          },
        },
      );
    },
    [updateStatus],
  );

  const handleDelete = useCallback(
    (userId: string, onClose?: () => void) => {
      deleteUser(
        { userId },
        {
          onSuccess: () => {
            notifications.show({
              title: 'User Deleted',
              message: 'User account has been deleted successfully',
              color: 'green',
              autoClose: 3000,
            });
            onClose?.();
          },
          onError: (error: any) => {
            notifications.show({
              title: 'Failed to Delete',
              message: error?.message || 'Could not delete user',
              color: 'red',
              autoClose: 3000,
            });
          },
        },
      );
    },
    [deleteUser],
  );

  const openModal = useCallback((type: 'status' | 'delete', userId: string) => {
    setSelectedUserId(userId);
    setActiveModal(type);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedUserId(null);
    setActiveModal(null);
  }, []);

  const renderUserCard = (user: AppUser) => {
    const canManage = currentUser?.role === 'owner';

    return (
      <div key={user.id}>
        <RNGModal
          title="User Details"
          size="lg"
          renderTrigger={(props) => (
            <UserCardDesign
              user={user}
              showDetailsButton={true}
              onShowDetails={props.onClick}
              actions={
                canManage && user.role !== 'owner' ? (
                  <UserActionsMenu
                    user={user}
                    currentUser={currentUser!}
                    onToggleStatus={() => openModal('status', user.id)}
                    onDelete={() => openModal('delete', user.id)}
                    onResendInvite={() => handleResendInvite(user.id)}
                    onRevokeInvite={() => handleRevokeInvite(user.id)}
                    onRestore={() => handleRestore(user.id)}
                    position="bottom-end"
                  />
                ) : undefined
              }
            />
          )}
        >
          {(onClose) => {
            const detailUser = users.find((u) => u.id === user.id);

            if (!detailUser) return null;

            const infoItems = [
              { label: 'Email', value: detailUser.email },
              { label: 'Role', value: <Badge>{detailUser.role}</Badge> },
            ];

            // Add optional fields only if they exist
            if (detailUser.roleCategory) {
              infoItems.push({
                label: 'Category',
                value: detailUser.roleCategory,
              });
            }

            // Add invite lifecycle information
            if (detailUser.inviteStatus === 'invited') {
              infoItems.push({
                label: 'Invite Status',
                value: (
                  <Badge color="yellow" variant="light">
                    Pending
                  </Badge>
                ),
              });
            } else if (detailUser.inviteStatus === 'activated') {
              infoItems.push({
                label: 'Invite Status',
                value: (
                  <Badge color="green" variant="light">
                    Activated
                  </Badge>
                ),
              });
            }

            if (detailUser.inviteSentAt) {
              infoItems.push({
                label: 'Invite Sent',
                value: new Date(detailUser.inviteSentAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              });
            }

            if (detailUser.lastLoginAt) {
              infoItems.push({
                label: 'Last Login',
                value: new Date(detailUser.lastLoginAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              });
            }

            if (detailUser.createdAt) {
              infoItems.push({
                label: 'Account Created',
                value: new Date(detailUser.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                }),
              });
            }

            return (
              <Stack gap="lg">
                {/* User Header */}
                <Group>
                  <Avatar src={detailUser.photoUrl} size="xl" radius="xl" />
                  <Stack gap={0}>
                    <Text fw={600} size="lg">
                      {detailUser.name}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {detailUser.email}
                    </Text>
                  </Stack>
                </Group>

                {/* Status Section */}
                <Stack
                  gap="xs"
                  style={{ borderTop: '1px solid var(--mantine-color-gray-2)', paddingTop: '1rem' }}
                >
                  <Group>
                    <Text size="sm" c="dimmed" fw={500}>
                      Account Status:
                    </Text>
                    <UserStatusBadge user={detailUser} />
                  </Group>
                  <EmailVerificationBadge user={detailUser} inline />
                </Stack>

                {/* User Information Table */}
                <UserInfoTable items={infoItems} columns={2} />

                {/* Close Button */}
                <Group justify="flex-end">
                  <Button variant="default" onClick={onClose}>
                    Close
                  </Button>
                </Group>
              </Stack>
            );
          }}
        </RNGModal>
      </div>
    );
  };

  return (
    <RNGPageContent
      title="User Management"
      description="Manage your organization's team members"
      actions={
        <Button
          leftSection={<IconUserPlus size={16} />}
          component={Link}
          href="/dashboard/user-management/invite"
        >
          Invite Team Member
        </Button>
      }
    >
      <Stack gap="lg">
        {/* Search */}
        <UserSearchInput
          value={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search by name or email..."
          debounceMs={300}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab
              value="internal"
              rightSection={
                <Badge w={24} h={24} size="sm" variant="filled" p={0}>
                  {internalUsers.length}
                </Badge>
              }
            >
              Team
            </Tabs.Tab>
            <Tabs.Tab
              value="clients"
              rightSection={
                <Badge w={24} h={24} size="sm" variant="filled" p={0}>
                  {clientUsers.length}
                </Badge>
              }
            >
              Clients
            </Tabs.Tab>
          </Tabs.List>

          {/* Internal Tab */}
          <Tabs.Panel value="internal" pt="lg">
            {isLoading ? (
              <Center py="lg">
                <Loader />
              </Center>
            ) : internalUsers.length === 0 ? (
              <Center py="lg">
                <Text c="dimmed">No team members found</Text>
              </Center>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
                {internalUsers.map((user) => renderUserCard(user))}
              </SimpleGrid>
            )}
          </Tabs.Panel>

          {/* Clients Tab */}
          <Tabs.Panel value="clients" pt="lg">
            {isLoading ? (
              <Center py="lg">
                <Loader />
              </Center>
            ) : clientUsers.length === 0 ? (
              <Center py="lg">
                <Text c="dimmed">No clients found</Text>
              </Center>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
                {clientUsers.map((user) => renderUserCard(user))}
              </SimpleGrid>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Status Modal */}
      {selectedUserId && activeModal === 'status' && (
        <RNGModal
          title={
            users.find((u) => u.id === selectedUserId)?.isDisabled ? 'Enable User' : 'Disable User'
          }
          size="sm"
          initialOpened
          renderTrigger={() => null}
        >
          {(onClose) => {
            const user = users.find((u) => u.id === selectedUserId);
            return (
              <Stack gap="md">
                <Text>
                  {user?.isDisabled
                    ? 'This user will be able to access the application again.'
                    : 'This user will no longer be able to access the application.'}
                </Text>
                <Group justify="flex-end">
                  <Button
                    variant="default"
                    onClick={() => {
                      closeModal();
                      onClose();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (user) {
                        handleStatusChange(selectedUserId, !user.isDisabled, () => {
                          closeModal();
                          onClose();
                        });
                      }
                    }}
                  >
                    Confirm
                  </Button>
                </Group>
              </Stack>
            );
          }}
        </RNGModal>
      )}

      {/* Delete Modal */}
      {selectedUserId && activeModal === 'delete' && (
        <RNGModal title="Delete User" size="sm" initialOpened renderTrigger={() => null}>
          {(onClose) => (
            <Stack gap="md">
              <Text>
                Are you sure you want to delete this user? They will no longer have access to the
                application.
              </Text>
              <Group justify="flex-end">
                <Button
                  variant="default"
                  onClick={() => {
                    closeModal();
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleDelete(selectedUserId, () => {
                      closeModal();
                      onClose();
                    });
                  }}
                >
                  Delete User
                </Button>
              </Group>
            </Stack>
          )}
        </RNGModal>
      )}
    </RNGPageContent>
  );
}
