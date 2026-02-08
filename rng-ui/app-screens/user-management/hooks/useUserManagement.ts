'use client';

import { useCurrentUser } from '@/rng-platform/rng-auth';
import { authQueryKeys } from '@/rng-platform/rng-auth/app-auth-hooks/keys';
import {
  useDeleteUser,
  useResendInvite,
  useRestoreUser,
  useRevokeInvite,
  useUpdateUserStatus,
} from '@/rng-platform/rng-auth/app-auth-hooks/useUserManagementMutations';
import { useListUsersPaginated } from '@/rng-platform/rng-auth/app-auth-hooks/useUserQueries';
import type {
  AppUser,
  ListUsersPaginatedResult,
} from '@/rng-platform/rng-auth/app-auth-service/internal-app-user-service/app-user.contracts';
import { useRNGNotification } from '@/rng-ui/ux';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useMemo, useState } from 'react';

type UseUserManagementResult = {
  currentUser: ReturnType<typeof useCurrentUser>['data'];
  users: AppUser[];
  internalUsers: AppUser[];
  clientUsers: AppUser[];
  isLoading: boolean;
  refetchUsers: () => Promise<unknown>;
  handleRefresh: () => Promise<void>;
  isDeleting: boolean;
  isRestoring: boolean;
  isResending: boolean;
  isRevoking: boolean;
  isUpdatingStatus: boolean;
  activeTab: string | null;
  setActiveTab: Dispatch<SetStateAction<string | null>>;
  searchTerm: string;
  setSearchTerm: Dispatch<SetStateAction<string>>;
  selectedUserId: string | null;
  setSelectedUserId: Dispatch<SetStateAction<string | null>>;
  selectedUser: AppUser | null;
  handleResendInvite: (userId: string) => void;
  handleRevokeInvite: (userId: string) => void;
  handleRestore: (userId: string) => void;
  handleStatusChange: (userId: string, isDisabled: boolean) => void;
  handleDelete: (userId: string) => void;
};

export function useUserManagement(): UseUserManagementResult {
  const queryClient = useQueryClient();
  const rngNotifications = useRNGNotification();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('internal');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: currentUser } = useCurrentUser();
  const {
    data: paginatedResult,
    isLoading,
    refetch: refetchUsers,
  } = useListUsersPaginated(100, undefined);
  const users: AppUser[] = paginatedResult?.data || [];

  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const { mutate: restoreUser, isPending: isRestoring } = useRestoreUser();
  const { mutate: resendInvite, isPending: isResending } = useResendInvite();
  const { mutate: revokeInvite, isPending: isRevoking } = useRevokeInvite();
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdateUserStatus();

  const usersPaginatedKey = authQueryKeys.usersPaginated(100, undefined);
  const updateUsersCache = useCallback(
    (updater: (current: AppUser[]) => AppUser[]) => {
      queryClient.setQueryData<ListUsersPaginatedResult | undefined>(
        usersPaginatedKey,
        (previous) => {
          if (!previous) return previous;
          return {
            ...previous,
            data: updater(previous.data),
          };
        },
      );
    },
    [queryClient, usersPaginatedKey],
  );

  const { internalUsers, clientUsers } = useMemo(() => {
    const filtered: AppUser[] = users.filter(
      (user: AppUser) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    const roleOrder = { owner: 0, manager: 1, employee: 2, client: 3 };
    const sorted: AppUser[] = filtered.sort(
      (a: AppUser, b: AppUser) =>
        roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder],
    );

    return {
      internalUsers: sorted.filter((u: AppUser) => u.role !== 'client'),
      clientUsers: sorted.filter((u: AppUser) => u.role === 'client'),
    };
  }, [users, searchTerm]);

  const handleResendInvite = useCallback(
    (userId: string) => {
      resendInvite(
        { userId },
        {
          onSuccess: () => {
            rngNotifications.showSuccess('Invitation email has been sent', 'Invite Resent', {
              dedupeKey: `invite-resent-${userId}`,
              autoClose: 3000,
            });
          },
          onError: (error: any) => {
            let errorMessage = error?.message || 'Could not resend invitation';

            if (error?.hoursRemaining) {
              if (error.hoursRemaining > 1) {
                errorMessage = `Invitation can be resent in ${error.hoursRemaining} hours`;
              } else if (error?.minutesRemaining) {
                errorMessage = `Invitation can be resent in ${error.minutesRemaining} minutes`;
              }
            }

            rngNotifications.showError(errorMessage, 'Failed to Resend', {
              dedupeKey: `invite-resent-error-${userId}`,
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
            rngNotifications.showSuccess('User invitation has been cancelled', 'Invite Revoked', {
              dedupeKey: `invite-revoked-${userId}`,
              autoClose: 3000,
            });
          },
          onError: (error: any) => {
            rngNotifications.showError(
              error?.message || 'Could not revoke invitation',
              'Failed to Revoke',
              {
                dedupeKey: `invite-revoked-error-${userId}`,
                autoClose: 3000,
              },
            );
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
            rngNotifications.showSuccess(
              'User account has been restored successfully',
              'User Restored',
              {
                dedupeKey: `user-restored-${userId}`,
                autoClose: 3000,
              },
            );
          },
          onError: (error: any) => {
            rngNotifications.showError(
              error?.message || 'Could not restore user',
              'Failed to Restore',
              {
                dedupeKey: `user-restored-error-${userId}`,
                autoClose: 3000,
              },
            );
          },
        },
      );
    },
    [restoreUser],
  );

  const handleStatusChange = useCallback(
    (userId: string, isDisabled: boolean) => {
      const previous = queryClient.getQueryData<ListUsersPaginatedResult | undefined>(
        usersPaginatedKey,
      );
      updateUsersCache((current) =>
        current.map((user) => (user.id === userId ? { ...user, isDisabled } : user)),
      );
      updateStatus(
        { userId, data: { isDisabled } },
        {
          onSuccess: () => {
            rngNotifications.showSuccess(
              `User has been ${isDisabled ? 'disabled' : 'enabled'} successfully`,
              isDisabled ? 'User Disabled' : 'User Enabled',
              {
                dedupeKey: `user-status-${userId}-${isDisabled ? 'disabled' : 'enabled'}`,
                autoClose: 3000,
              },
            );
            setSelectedUserId(null);
          },
          onError: (error: any) => {
            if (previous) {
              queryClient.setQueryData(usersPaginatedKey, previous);
            }
            rngNotifications.showError(
              error?.message || 'Could not update user status',
              'Failed to Update Status',
              {
                dedupeKey: `user-status-error-${userId}`,
                autoClose: 3000,
              },
            );
          },
        },
      );
    },
    [queryClient, updateStatus, updateUsersCache, usersPaginatedKey],
  );

  const handleDelete = useCallback(
    (userId: string) => {
      const previous = queryClient.getQueryData<ListUsersPaginatedResult | undefined>(
        usersPaginatedKey,
      );
      updateUsersCache((current) => current.filter((user) => user.id !== userId));
      deleteUser(
        { userId },
        {
          onSuccess: () => {
            rngNotifications.showSuccess(
              'User account has been deleted successfully',
              'User Deleted',
              {
                dedupeKey: `user-deleted-${userId}`,
                autoClose: 3000,
              },
            );
            setSelectedUserId(null);
          },
          onError: (error: any) => {
            if (previous) {
              queryClient.setQueryData(usersPaginatedKey, previous);
            }
            rngNotifications.showError(
              error?.message || 'Could not delete user',
              'Failed to Delete',
              {
                dedupeKey: `user-deleted-error-${userId}`,
                autoClose: 3000,
              },
            );
          },
        },
      );
    },
    [deleteUser, queryClient, updateUsersCache, usersPaginatedKey],
  );

  const handleRefresh = useCallback(async () => {
    const notificationId = 'user-list-refresh';
    notifications.show({
      id: notificationId,
      loading: true,
      title: 'Refreshing',
      message: 'Fetching the latest user list...',
      autoClose: false,
      withCloseButton: false,
    });

    try {
      await refetchUsers();
      notifications.show({
        id: notificationId,
        color: 'teal',
        title: 'Refreshed',
        message: 'User list updated successfully',
        autoClose: 3000,
      });
    } catch (error) {
      notifications.show({
        id: notificationId,
        color: 'red',
        title: 'Error',
        message: 'Failed to refresh user list',
        autoClose: 3000,
      });
    }
  }, [refetchUsers]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [users, selectedUserId],
  );

  return {
    currentUser,
    users,
    internalUsers,
    clientUsers,
    isLoading,
    refetchUsers,
    handleRefresh,
    isDeleting,
    isRestoring,
    isResending,
    isRevoking,
    isUpdatingStatus,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    selectedUserId,
    setSelectedUserId,
    selectedUser,
    handleResendInvite,
    handleRevokeInvite,
    handleRestore,
    handleStatusChange,
    handleDelete,
  };
}
