'use client';

import { InviteUserScreen } from '@/rng-platform/rng-auth/app-auth-components/screens/InviteUserScreen';
import { UpdateUserRoleScreen } from '@/rng-platform/rng-auth/app-auth-components/screens/UpdateUserRoleScreen';
import { UserListScreen } from '@/rng-platform/rng-auth/app-auth-components/screens/UserListScreen';
import { Modal } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function UserManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inviteModalOpened, setInviteModalOpened] = useState(false);
  const [roleModalOpened, setRoleModalOpened] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Open modals based on URL params
  useEffect(() => {
    if (searchParams.get('action') === 'invite') {
      setInviteModalOpened(true);
    }
    if (searchParams.get('action') === 'edit-role') {
      const userId = searchParams.get('userId');
      if (userId) {
        setSelectedUserId(userId);
        setRoleModalOpened(true);
      }
    }
  }, [searchParams]);

  const handleInviteClick = useCallback(() => {
    router.push('/dashboard/user-management?action=invite');
  }, [router]);

  const handleCloseInvite = useCallback(() => {
    setInviteModalOpened(false);
    router.push('/dashboard/user-management');
  }, [router]);

  const handleCloseRole = useCallback(() => {
    setRoleModalOpened(false);
    setSelectedUserId(null);
    router.push('/dashboard/user-management');
  }, [router]);

  const handleInviteSuccess = useCallback(() => {
    setInviteModalOpened(false);
    router.push('/dashboard/user-management');
  }, [router]);

  const handleRoleSuccess = useCallback(() => {
    setRoleModalOpened(false);
    setSelectedUserId(null);
    router.push('/dashboard/user-management');
  }, [router]);

  return (
    <>
      <UserListScreen onInvite={handleInviteClick} detailsPathPrefix="/dashboard/user-management" />

      <Modal
        opened={inviteModalOpened}
        onClose={handleCloseInvite}
        title="Invite Team Member"
        size="lg"
        centered
      >
        <InviteUserScreen onSuccess={handleInviteSuccess} header={null} footer={null} />
      </Modal>

      <Modal
        opened={roleModalOpened}
        onClose={handleCloseRole}
        title="Update User Role"
        size="lg"
        centered
      >
        {selectedUserId && (
          <UpdateUserRoleScreen userId={selectedUserId} onSuccess={handleRoleSuccess} />
        )}
      </Modal>
    </>
  );
}
