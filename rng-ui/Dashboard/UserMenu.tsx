'use client';

import { useAuthSession, useRequireAuthenticated } from '@/rng-platform/rng-auth';
import { UserAvatar, UserProfileCard } from '@/rng-platform/rng-auth/app-auth-components';
import { ActionIcon, Button, Group, Menu, Modal, Text } from '@mantine/core';
import { IconLogout, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Beautiful user menu with avatar, profile card, and sign out
 * Shows user info in dropdown with smooth animations
 */
export function RNGUserMenu() {
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
        shadow="md"
        width={280}
      >
        <Menu.Target>
          <ActionIcon variant="subtle" size="lg" style={{ cursor: 'pointer' }}>
            <UserAvatar name={user?.name || ''} photoUrl={user?.photoUrl} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <UserProfileCard showCreatedAt={false} showRegistrationStatus={false} user={user} />
          <Menu.Divider />
          <Menu.Item leftSection={<IconUser size={16} />} component={Link} href="/profile">
            Profile
          </Menu.Item>
          <Menu.Item
            color="red"
            leftSection={<IconLogout size={16} />}
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
        <Text mb="md">
          Are you sure you want to sign out? You will need to sign in again to access your account.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setSignoutModalOpened(false)}>
            Cancel
          </Button>
          <Button color="red" onClick={handleConfirmSignOut}>
            Sign out
          </Button>
        </Group>
      </Modal>
    </>
  );
}
