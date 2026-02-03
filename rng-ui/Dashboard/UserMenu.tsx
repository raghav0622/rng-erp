'use client';

import { useAuthSession, useRequireAuthenticated } from '@/rng-platform/rng-auth';
import { UserAvatar, UserProfileCard } from '@/rng-platform/rng-auth/app-auth-components';
import { Divider, Group, Menu, Modal } from '@mantine/core';
import { IconLogout, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function RNGUserMenu({}: {}) {
  useRequireAuthenticated();

  const { user } = useAuthSession();
  const [menuOpened, setMenuOpened] = useState(false);
  const [signoutModalOpened, setSignoutModalOpened] = useState(false);
  const router = useRouter();

  if (!user) return null;

  const handleConfirmSignOut = () => {
    setSignoutModalOpened(false);
    setMenuOpened(false);
    router.push('/signout');
  };

  return (
    <>
      <Menu
        opened={menuOpened}
        onOpen={() => setMenuOpened(true)}
        onClose={() => setMenuOpened(false)}
        position="bottom-end"
      >
        <Menu.Target>
          <Group gap="xs" style={{ cursor: 'pointer' }}>
            <UserAvatar name={user?.name || ''} photoUrl={user?.photoUrl} />
          </Group>
        </Menu.Target>

        <Menu.Dropdown>
          <UserProfileCard showCreatedAt={false} showRegistrationStatus={false} user={user} />
          <Menu.Item leftSection={<IconUser size={14} />} component={Link} href="/profile">
            Profile
          </Menu.Item>
          <Divider />
          <Menu.Item
            color="red"
            leftSection={<IconLogout size={14} />}
            onClick={() => setSignoutModalOpened(true)}
          >
            Sign out
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={signoutModalOpened}
        onClose={() => setSignoutModalOpened(false)}
        title="Sign out?"
        centered
      >
        <div style={{ marginBottom: 16 }}>
          Are you sure you want to sign out? You will need to sign in again to access your account.
        </div>
        <Group justify="flex-end" gap="sm">
          <button
            onClick={() => setSignoutModalOpened(false)}
            style={{
              padding: '8px 16px',
              border: '1px solid var(--mantine-color-gray-3)',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSignOut}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              background: 'var(--mantine-color-red-6)',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </Group>
      </Modal>
    </>
  );
}
