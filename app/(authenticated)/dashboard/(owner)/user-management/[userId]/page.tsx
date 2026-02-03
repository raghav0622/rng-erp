'use client';

import { UpdateUserRoleScreen } from '@/rng-platform/rng-auth/app-auth-components/screens/UpdateUserRoleScreen';
import { UserDetailScreen } from '@/rng-platform/rng-auth/app-auth-components/screens/UserDetailScreen';
import { Modal } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { use, useCallback, useState } from 'react';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default function UserDetailPage({ params }: PageProps) {
  const { userId } = use(params);
  const router = useRouter();
  const [roleModalOpened, setRoleModalOpened] = useState(false);

  const handleEditRole = useCallback(() => {
    setRoleModalOpened(true);
  }, []);

  const handleCloseRole = useCallback(() => {
    setRoleModalOpened(false);
  }, []);

  const handleRoleSuccess = useCallback(() => {
    handleCloseRole();
  }, [handleCloseRole]);

  return (
    <>
      <UserDetailScreen
        userId={userId}
        backPath="/dashboard/user-management"
        onEditRole={handleEditRole}
      />

      <Modal
        opened={roleModalOpened}
        onClose={handleCloseRole}
        title="Update User Role"
        size="lg"
        centered
      >
        <UpdateUserRoleScreen userId={userId} onSuccess={handleRoleSuccess} />
      </Modal>
    </>
  );
}
