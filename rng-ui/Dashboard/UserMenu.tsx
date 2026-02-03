'use client';

import { useAuthSession, useRequireAuthenticated, useSignOut } from '@/rng-platform/rng-auth';
import { UserAvatar, UserProfileCard } from '@/rng-platform/rng-auth/app-auth-components';
import { Divider, Group, Menu } from '@mantine/core';
import { IconLogout, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { useState } from 'react';

export function RNGUserMenu({}: {}) {
  useRequireAuthenticated();

  const { user } = useAuthSession();
  const [menuOpened, setMenuOpened] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { mutateAsync: signout } = useSignOut();

  if (!user) return null;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signout();
  };

  return (
    <Menu
      opened={menuOpened && !isSigningOut}
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
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
