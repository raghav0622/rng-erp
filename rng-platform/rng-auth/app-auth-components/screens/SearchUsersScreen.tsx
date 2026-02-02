'use client';

import { Button, Group, Loader, Stack, Text } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSearchUsers } from '../../app-auth-hooks/useUserQueries';
import type { AppUser } from '../../app-auth-service/internal-app-user-service/app-user.contracts';
import { AuthEmptyState } from '../boundaries/AuthEmptyState';
import RoleBadge from '../components/RoleBadge';
import UserSearchInput from '../components/UserSearchInput';
import UserStatusBadge from '../components/UserStatusBadge';
import { ScreenContainer, ScreenHeader } from '../shared/ScreenComponents';

export interface SearchUsersScreenProps {
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
   * Initial search query
   */
  initialQuery?: string;
}

/**
 * Search users screen
 *
 * Features:
 * - Find users by email, name, or role
 * - Real-time search with debouncing
 * - Shows user details (name, email, role, status)
 * - Navigate to user detail page
 * - Shows search results count
 * - Empty state when no results
 *
 * @example
 * <SearchUsersScreen detailsPathPrefix="/users" />
 */
export function SearchUsersScreen({
  detailsPathPrefix = '/users',
  header,
  initialQuery = '',
}: SearchUsersScreenProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const { data: results, isLoading } = useSearchUsers(query ? { email: query } : undefined);
  const searchResults = results?.results || [];

  const handleUserClick = (userId: string) => {
    router.push(`${detailsPathPrefix}/${userId}`);
  };

  return (
    <ScreenContainer>
      <ScreenHeader
        title="Search Users"
        description="Find users by name, email, or role"
        icon={IconSearch}
      />

      <Stack gap="lg">
        <UserSearchInput
          value={query}
          onSearchChange={setQuery}
          disabled={isLoading}
          placeholder="Search by name, email, or role..."
        />

        {isLoading && query && (
          <Group justify="center" py="xl">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Searching...
            </Text>
          </Group>
        )}

        {!isLoading && query && searchResults.length === 0 && (
          <AuthEmptyState title="No Users Found" description="Try adjusting your search query" />
        )}

        {searchResults.length > 0 && (
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
              </Text>
            </Group>

            <Stack gap="sm">
              {searchResults.map((user: AppUser) => (
                <div
                  key={user.id}
                  onClick={() => handleUserClick(user.id)}
                  style={{
                    padding: 12,
                    borderRadius: 6,
                    backgroundColor: 'var(--mantine-color-gray-0)',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    border: '1px solid var(--mantine-color-gray-2)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)';
                    e.currentTarget.style.borderColor = 'var(--mantine-color-gray-3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-0)';
                    e.currentTarget.style.borderColor = 'var(--mantine-color-gray-2)';
                  }}
                >
                  <Group justify="space-between">
                    <div style={{ flex: 1 }}>
                      <Group gap="xs" mb={4}>
                        <Text fw={600} size="sm">
                          {user.name}
                        </Text>
                        <RoleBadge role={user.role} />
                        <UserStatusBadge user={user} onlyShowNonActive />
                      </Group>
                      <Text size="xs" c="dimmed">
                        {user.email}
                      </Text>
                      {user.inviteStatus === 'invited' && !user.isRegisteredOnERP && (
                        <Text size="xs" c="blue" mt={4}>
                          Invitation pending
                        </Text>
                      )}
                    </div>
                    <Button size="xs" variant="light">
                      View
                    </Button>
                  </Group>
                </div>
              ))}
            </Stack>
          </Stack>
        )}

        {!query && (
          <AuthEmptyState
            title="Start Searching"
            description="Enter a name, email, or role to find users"
            icon={<IconSearch size={32} />}
          />
        )}
      </Stack>
    </ScreenContainer>
  );
}

export default SearchUsersScreen;
