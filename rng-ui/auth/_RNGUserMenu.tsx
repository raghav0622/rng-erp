'use client';

import { useAuthSession, useRequireAuthenticated } from '@/rng-platform/rng-auth';
import { ActionIcon, Button, Group, Menu, Modal, Text } from '@mantine/core';
import { IconLogout, IconUser } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserAvatar } from './_UserAvatar';
import { UserProfileCard } from './_UserProfileCard';
import { useMenuState, useModalState } from './utils';

/**
 * Clean and sleek user menu with avatar, profile card, and sign out
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
        width={320}
        offset={8}
      >
        <Menu.Target>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            radius="xl"
            aria-label="User menu"
          >
            <UserAvatar name={user?.name || ''} photoUrl={user?.photoUrl} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown p="md">
          <UserProfileCard showCreatedAt={false} showRegistrationStatus={false} user={user} />
          <Menu.Divider my="sm" />
          <Menu.Item leftSection={<IconUser size={16} />} component={Link} href="/profile">
            Profile Settings
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
        title="Sign out"
        centered
        radius="lg"
      >
        <Text size="sm" c="dimmed" mb="lg">
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
