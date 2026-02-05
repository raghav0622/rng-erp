'use client';

import { useAuthSession, useRequireAuthenticated } from '@/rng-platform/rng-auth';
import { Button, Group, Menu, Modal, Text } from '@mantine/core';
import { IconLogout, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserAvatar } from './_UserAvatar';
import { UserProfileCard } from './_UserProfileCard';
import { useMenuState, useModalState } from './utils';

/**
 * Beautiful user menu with avatar, profile card, and sign out
 * Shows user info in dropdown with smooth animations
 *
 * Uses auth context to display current user info and handle sign out
 * Implements DRY patterns with useMenuState and useModalState hooks
 */
export function RNGUserMenu() {
  useRequireAuthenticated();

  const { user } = useAuthSession();
  const menuState = useMenuState();
  const signoutModalState = useModalState();
  const router = useRouter();

  if (!user) return null;

  const handleConfirmSignOut = () => {
    signoutModalState.close();
    menuState.close();
    router.push('/signout');
  };

  return (
    <>
      <Menu
        opened={menuState.opened}
        onOpen={menuState.open}
        onClose={menuState.close}
        position="bottom-end"
        shadow="md"
        width={280}
      >
        <Menu.Target>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
            aria-label="User menu"
          >
            <UserAvatar name={user?.name || ''} photoUrl={user?.photoUrl} />
          </button>
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
            onClick={signoutModalState.open}
          >
            Sign out
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Modal
        opened={signoutModalState.opened}
        onClose={signoutModalState.close}
        title="Sign out?"
        centered
      >
        <Text mb="md">
          Are you sure you want to sign out? You will need to sign in again to access your account.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={signoutModalState.close}>
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
