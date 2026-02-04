'use client';

import { ActionIcon, Menu } from '@mantine/core';
import {
  IconBan,
  IconCheck,
  IconDotsVertical,
  IconEdit,
  IconMail,
  IconTrash,
  IconUserCheck,
} from '@tabler/icons-react';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';

export interface UserActionsMenuProps {
  user: AppUser;
  /**
   * Current user (for permission checks)
   */
  currentUser: AppUser;
  /**
   * Edit profile handler
   */
  onEditProfile?: () => void;
  /**
   * Enable/disable handler
   */
  onToggleStatus?: () => void;
  /**
   * Delete user handler
   */
  onDelete?: () => void;
  /**
   * Resend invite handler
   */
  onResendInvite?: () => void;
  /**
   * Revoke invite handler
   */
  onRevokeInvite?: () => void;
  /**
   * Restore user handler
   */
  onRestore?: () => void;
  /**
   * Menu position
   * @default 'bottom-end'
   */
  position?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
}

/**
 * User actions dropdown menu with RBAC enforcement
 *
 * Features:
 * - Role-based action visibility
 * - Self-action restrictions (can't disable/delete self)
 * - Owner protection (can't modify owner)
 * - Invite lifecycle actions
 * - Soft-delete recovery
 *
 * @example
 * <UserActionsMenu
 *   user={targetUser}
 *   currentUser={currentUser}
 *   onEditProfile={() => router.push(`/users/${user.id}/edit`)}
 *   onDelete={() => setShowDeleteModal(true)}
 * />
 */
export function UserActionsMenu({
  user,
  currentUser,
  onEditProfile,
  onToggleStatus,
  onDelete,
  onResendInvite,
  onRevokeInvite,
  onRestore,
  position = 'bottom-end',
}: UserActionsMenuProps) {
  const isOwner = currentUser.role === 'owner';
  const isManager = currentUser.role === 'manager' || isOwner;
  const isSelf = currentUser.id === user.id;
  const isTargetOwner = user.role === 'owner';
  const isDeleted = !!user.deletedAt;
  const isInvited = user.inviteStatus === 'invited';

  // Can't modify owner (except self-edit)
  const canModify = !isTargetOwner || isSelf;
  // Owner can modify anyone; manager can't modify owner
  const hasPermission = isOwner || (isManager && !isTargetOwner);
  // Can't disable/delete self
  const canDestructive = !isSelf && hasPermission && canModify;

  return (
    <Menu position={position} shadow="md" width={200}>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray">
          <IconDotsVertical size={16} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        {isDeleted ? (
          <>
            {/* Deleted user actions */}
            {onRestore && hasPermission && (
              <Menu.Item
                leftSection={<IconUserCheck size={16} />}
                onClick={onRestore}
                color="green"
              >
                Restore User
              </Menu.Item>
            )}
          </>
        ) : (
          <>
            {/* Active user actions */}
            {onEditProfile && (isSelf || hasPermission) && (
              <Menu.Item leftSection={<IconEdit size={16} />} onClick={onEditProfile}>
                Edit Profile
              </Menu.Item>
            )}

            {onToggleStatus && canDestructive && (
              <Menu.Item
                leftSection={user.isDisabled ? <IconCheck size={16} /> : <IconBan size={16} />}
                onClick={onToggleStatus}
                color={user.isDisabled ? 'green' : 'orange'}
              >
                {user.isDisabled ? 'Enable' : 'Disable'}
              </Menu.Item>
            )}

            {/* Invite actions */}
            {isInvited && onResendInvite && hasPermission && (
              <Menu.Item leftSection={<IconMail size={16} />} onClick={onResendInvite} color="blue">
                Resend Invite
              </Menu.Item>
            )}

            {isInvited && onRevokeInvite && hasPermission && (
              <Menu.Item
                leftSection={<IconBan size={16} />}
                onClick={onRevokeInvite}
                color="orange"
              >
                Revoke Invite
              </Menu.Item>
            )}

            {onDelete && canDestructive && (
              <>
                <Menu.Divider />
                <Menu.Item leftSection={<IconTrash size={16} />} onClick={onDelete} color="red">
                  Delete User
                </Menu.Item>
              </>
            )}
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}

export default UserActionsMenu;
