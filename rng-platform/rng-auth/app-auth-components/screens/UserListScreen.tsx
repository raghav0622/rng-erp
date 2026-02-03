'use client';

import { Button, Container, Group, Stack, Text, Title } from '@mantine/core';
import { IconUserPlus } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useListUsers } from '../../app-auth-hooks/useUserQueries';
import { AuthEmptyState } from '../boundaries/AuthEmptyState';
import { AuthLoadingOverlay } from '../boundaries/AuthLoadingOverlay';
import UserListItem from '../components/UserListItem';
import UserSearchInput from '../components/UserSearchInput';

export interface UserListScreenProps {
  /**
   * Path to navigate to when creating a new user
   * @default '/users/invite'
   */
  invitePath?: string;
  /**
   * Callback when invite button is clicked (overrides invitePath)
   */
  onInvite?: () => void;
  /**
   * Path pattern for user details (userId will be appended)
   * @default '/users'
   */
  detailsPathPrefix?: string;
  /**
   * Custom header content
   */
  header?: React.ReactNode;
  /**
   * Show invite button
   * @default true
   */
  showInviteButton?: boolean;
}

/**
 * User list/directory screen
 *
 * Features:
 * - Lists all users
 * - Search/filter by name, email, role
 * - Navigate to user details
 * - Invite new users
 * - Shows user status (active, disabled, invited)
 *
 * @example
 * <UserListScreen invitePath="/users/invite" detailsPathPrefix="/users" />
 */
export function UserListScreen({
  invitePath = '/users/invite',
  onInvite,
  detailsPathPrefix = '/users',
  header,
  showInviteButton = true,
}: UserListScreenProps) {
  const router = useRouter();
  const { data: users = [], isLoading } = useListUsers();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return <AuthLoadingOverlay message="Loading users..." />;
  }

  const handleUserClick = (userId: string) => {
    router.push(`${detailsPathPrefix}/${userId}`);
  };

  const handleInviteClick = () => {
    if (onInvite) {
      onInvite();
    } else {
      router.push(invitePath);
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {header || (
          <Group justify="space-between" align="center">
            <Stack gap={4}>
              <Title order={1}>Team Directory</Title>
              <Text c="dimmed" size="sm">
                Manage your organization's users
              </Text>
            </Stack>
            {showInviteButton && (
              <Button leftSection={<IconUserPlus size={16} />} onClick={handleInviteClick}>
                Invite User
              </Button>
            )}
          </Group>
        )}

        <UserSearchInput value={searchQuery} onSearchChange={setSearchQuery} />

        {filteredUsers.length === 0 ? (
          searchQuery ? (
            <AuthEmptyState
              title="No users found"
              description={`No users match "${searchQuery}"`}
              actionLabel="Clear search"
              onAction={() => setSearchQuery('')}
            />
          ) : (
            <AuthEmptyState
              title="No users yet"
              description="Invite your first team member to get started"
              actionLabel="Invite User"
              onAction={handleInviteClick}
            />
          )
        ) : (
          <Stack gap="md">
            {filteredUsers.map((user) => (
              <UserListItem key={user.id} user={user} onClick={() => handleUserClick(user.id)} />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
