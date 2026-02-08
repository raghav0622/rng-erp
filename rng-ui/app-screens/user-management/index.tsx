'use client';

import type { AppUser } from '@/rng-platform/rng-auth/app-auth-service/internal-app-user-service/app-user.contracts';
import { useUserManagement } from './hooks/useUserManagement';
import { UserCardModal, UserManagementLayout, UsersTabPanel } from './ui-components';

export function UserManagementScreen() {
  const {
    currentUser,
    users,
    internalUsers,
    clientUsers,
    isLoading,
    handleRefresh,
    isDeleting,
    isUpdatingStatus,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    handleResendInvite,
    handleRevokeInvite,
    handleRestore,
    handleStatusChange,
    handleDelete,
  } = useUserManagement();

  const canManage = currentUser?.role === 'owner';

  const renderUserCard = (user: AppUser) => (
    <UserCardModal
      key={user.id}
      user={user}
      canManage={!!canManage}
      currentUser={currentUser}
      onToggleStatus={() => handleStatusChange(user.id, !user.isDisabled)}
      onDelete={() => handleDelete(user.id)}
      onResendInvite={() => handleResendInvite(user.id)}
      onRevokeInvite={() => handleRevokeInvite(user.id)}
      onRestore={() => handleRestore(user.id)}
      isUpdatingStatus={isUpdatingStatus}
      isDeleting={isDeleting}
    />
  );

  return (
    <>
      <UserManagementLayout
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
        internalContent={
          <UsersTabPanel
            users={internalUsers}
            isLoading={isLoading}
            emptyLabel="No internal users found."
            renderUser={renderUserCard}
          />
        }
        clientContent={
          <UsersTabPanel
            users={clientUsers}
            isLoading={isLoading}
            emptyLabel="No client users found."
            renderUser={renderUserCard}
          />
        }
      />
    </>
  );
}
