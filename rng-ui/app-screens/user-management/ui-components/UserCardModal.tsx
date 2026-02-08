'use client';

import type { AppUser } from '@/rng-platform/rng-auth/app-auth-service/internal-app-user-service/app-user.contracts';
import { UserActionsMenu, UserCardDesign, UserInfoTable, UserStatusBadge } from '@/rng-ui/auth';
import EmailVerificationBadge from '@/rng-ui/auth/_EmailVerificationBadge';
import { RNGModal } from '@/rng-ui/ux/_RNGModal';
import { Avatar, Badge, Group, Stack, Text } from '@mantine/core';
import { DeleteUserButton } from './DeleteUserButton';
import { StatusToggleButton } from './StatusToggleButton';

interface UserCardModalProps {
  user: AppUser;
  canManage: boolean;
  currentUser: AppUser | null | undefined;
  onResendInvite: () => void;
  onRevokeInvite: () => void;
  onRestore: () => void;
  onToggleStatus: () => void;
  onDelete: () => void;
  isUpdatingStatus: boolean;
  isDeleting: boolean;
}

export function UserCardModal({
  user,
  canManage,
  currentUser,
  onResendInvite,
  onRevokeInvite,
  onRestore,
  onToggleStatus,
  onDelete,
  isUpdatingStatus,
  isDeleting,
}: UserCardModalProps) {
  const infoItems = [
    { label: 'Email', value: user.email },
    { label: 'Role', value: user.role },
    { label: 'Invite Status', value: user.inviteStatus },
    { label: 'Email Verified', value: user.emailVerified ? 'Yes' : 'No' },
    { label: 'Status', value: user.isDisabled ? 'Disabled' : 'Active' },
  ];

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
                  currentUser={currentUser as AppUser}
                  onToggleStatus={onToggleStatus}
                  onDelete={onDelete}
                  onResendInvite={onResendInvite}
                  onRevokeInvite={onRevokeInvite}
                  onRestore={onRestore}
                />
              ) : null
            }
          />
        )}
      >
        {(onClose) => (
          <Stack gap="md">
            <Group>
              <Avatar src={user.photoUrl} size={64} radius="xl">
                {user.name[0]}
              </Avatar>
              <div>
                <Group gap="xs">
                  <Text fw={600}>{user.name}</Text>
                  <UserStatusBadge user={user} />
                </Group>
                <Text size="sm" c="dimmed">
                  {user.email}
                </Text>
                <Group gap="xs" mt={4}>
                  <Badge size="sm" variant="light">
                    {user.role}
                  </Badge>
                  {user.roleCategory && (
                    <Badge size="sm" variant="light" color="gray">
                      {user.roleCategory}
                    </Badge>
                  )}
                </Group>
              </div>
            </Group>

            <UserInfoTable items={infoItems} />

            <Stack gap="xs">
              <Text size="sm" fw={600}>
                Email Verification
              </Text>
              <EmailVerificationBadge user={user} />
            </Stack>

            {canManage && user.role !== 'owner' && (
              <Group justify="flex-end" gap="xs">
                <StatusToggleButton
                  isDisabled={!!user.isDisabled}
                  isLoading={isUpdatingStatus}
                  onConfirm={onToggleStatus}
                />
                <DeleteUserButton isLoading={isDeleting} onConfirm={onDelete} />
              </Group>
            )}
          </Stack>
        )}
      </RNGModal>
    </div>
  );
}
