'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconEdit,
  IconEye,
  IconFilter,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useListUsersPaginated } from '../../app-auth-hooks/useUserQueries';
import { OwnerOnly } from '../guards/OwnerOnly';
import { ScreenContainer, ScreenHeader } from '../shared/ScreenComponents';

export interface UserDirectoryScreenProps {
  onSelectUser?: (userId: string) => void;
  detailsPathPrefix?: string;
  editPathPrefix?: string;
  deletePathPrefix?: string;
  pageSize?: number;
}

type SortField = 'name' | 'email' | 'role' | 'roleCategory' | 'status' | 'inviteStatus';
type SortDirection = 'asc' | 'desc';

/**
 * User Directory Screen - Owner Only
 *
 * Features:
 * - View all users using cursor-based pagination (via abstract repo)
 * - Sort by name, email, role, roleCategory, status, inviteStatus
 * - Filter by search term (name/email), role, status
 * - Inline action toolbar per user
 * - Owner-only access
 *
 * Pagination:
 * - Uses cursor-based pagination via useListUsersPaginated hook
 * - Server-side pagination with nextPageToken
 * - Respects abstract repository pagination contract
 *
 * Note: Managers cannot access this view - they are elevated employees with feature access only
 *
 * @example
 * <UserDirectoryScreen
 *   pageSize={20}
 *   detailsPathPrefix="/admin/users"
 *   editPathPrefix="/admin/users/edit"
 *   deletePathPrefix="/admin/users/delete"
 * />
 */
export function UserDirectoryScreen({
  detailsPathPrefix = '/admin/users',
  editPathPrefix = '/admin/users/edit',
  deletePathPrefix = '/admin/users/delete',
  pageSize: initialPageSize = 20,
}: UserDirectoryScreenProps) {
  const router = useRouter();

  // Pagination state - cursor-based via abstract repo
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pageTokens, setPageTokens] = useState<string[]>(['']); // Stack of page tokens
  const currentPageIndex = pageTokens.length - 1;
  const currentPageToken = pageTokens[currentPageIndex];

  // Fetch current page from abstract repo
  const {
    data: paginatedResult = { data: [], nextPageToken: undefined, hasMore: false },
    isLoading,
  } = useListUsersPaginated(pageSize, currentPageToken);

  const users = paginatedResult.data || [];
  const hasNextPage = paginatedResult.hasMore;

  // Client-side sorting & filtering on current page
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [inviteStatusFilter, setInviteStatusFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort current page
  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
      );
    }

    // Role filter
    if (roleFilter && roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      const isDisabled = statusFilter === 'disabled';
      filtered = filtered.filter((u) => u.isDisabled === isDisabled);
    }

    // Invite status filter
    if (inviteStatusFilter && inviteStatusFilter !== 'all') {
      filtered = filtered.filter((u) => u.inviteStatus === inviteStatusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();

      if (aVal === bVal) return 0;
      const result = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? result : -result;
    });

    return filtered;
  }, [users, searchTerm, roleFilter, statusFilter, inviteStatusFilter, sortField, sortDirection]);

  // Pagination handlers
  const handleNextPage = () => {
    if (hasNextPage && paginatedResult.nextPageToken) {
      setPageTokens([...pageTokens, paginatedResult.nextPageToken]);
    }
  };

  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      setPageTokens(pageTokens.slice(0, -1));
    }
  };

  const handleReset = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
    setInviteStatusFilter('');
    setPageTokens(['']);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />;
  };

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <Button
      variant="subtle"
      size="xs"
      onClick={() => handleSort(field)}
      rightSection={<SortIcon field={field} />}
      style={{ fontWeight: sortField === field ? 600 : 400 }}
    >
      {label}
    </Button>
  );

  return (
    <OwnerOnly>
      <ScreenContainer>
        <ScreenHeader
          title="User Directory"
          description="Manage all users, roles, and permissions"
          icon={IconUsers}
        />

        {/* Toolbar */}
        <Stack gap="md">
          {/* Search & Refresh */}
          <Group justify="space-between">
            <TextInput
              placeholder="Search by name or email..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
              style={{ flex: 1, maxWidth: 300 }}
            />
            <Tooltip label="Refresh current page">
              <ActionIcon
                variant="light"
                onClick={() => setPageTokens([currentPageToken || ''])}
                loading={isLoading}
                size="lg"
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>

          {/* Filters */}
          <Group gap="sm">
            <Badge size="lg" variant="light" leftSection={<IconFilter size={14} />}>
              Filters
            </Badge>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.currentTarget.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--mantine-radius-sm)',
                border: '1px solid var(--mantine-color-gray-3)',
              }}
            >
              <option value="">All Roles</option>
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="employee">Employee</option>
              <option value="client">Client</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.currentTarget.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--mantine-radius-sm)',
                border: '1px solid var(--mantine-color-gray-3)',
              }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>

            <select
              value={inviteStatusFilter}
              onChange={(e) => setInviteStatusFilter(e.currentTarget.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--mantine-radius-sm)',
                border: '1px solid var(--mantine-color-gray-3)',
              }}
            >
              <option value="">All Invite Status</option>
              <option value="invited">Invited</option>
              <option value="activated">Activated</option>
              <option value="revoked">Revoked</option>
            </select>

            <Button variant="subtle" size="sm" onClick={handleReset}>
              Clear Filters
            </Button>
          </Group>

          {/* Results info */}
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Showing {filteredUsers.length} users on this page (page size: {pageSize})
            </Text>
            <Group gap="xs" align="center">
              <Text size="xs" c="dimmed">
                Page {currentPageIndex + 1}
              </Text>
            </Group>
          </Group>
        </Stack>

        {/* Table */}
        {isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : filteredUsers.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">No users found on this page</Text>
          </Center>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: 200 }}>
                    <SortButton field="name" label="Name" />
                  </Table.Th>
                  <Table.Th style={{ width: 200 }}>
                    <SortButton field="email" label="Email" />
                  </Table.Th>
                  <Table.Th style={{ width: 120 }}>
                    <SortButton field="role" label="Role" />
                  </Table.Th>
                  <Table.Th style={{ width: 150 }}>
                    <SortButton field="roleCategory" label="Category" />
                  </Table.Th>
                  <Table.Th style={{ width: 120 }}>
                    <SortButton field="status" label="Status" />
                  </Table.Th>
                  <Table.Th style={{ width: 130 }}>
                    <SortButton field="inviteStatus" label="Invite" />
                  </Table.Th>
                  <Table.Th style={{ width: 200 }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredUsers.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <div>
                          <Text fw={500} size="sm">
                            {user.name}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {user.email}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="light"
                        color={user.role === 'owner' ? 'red' : 'blue'}
                      >
                        {user.role}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {user.roleCategory || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" color={user.isDisabled ? 'red' : 'green'} variant="light">
                        {user.isDisabled ? 'Disabled' : 'Active'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="dot">
                        {user.inviteStatus}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="View details">
                          <ActionIcon
                            size="sm"
                            variant="light"
                            onClick={() => router.push(`${detailsPathPrefix}/${user.id}`)}
                          >
                            <IconEye size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Edit profile">
                          <ActionIcon
                            size="sm"
                            variant="light"
                            onClick={() => router.push(`${editPathPrefix}/${user.id}`)}
                          >
                            <IconEdit size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete user">
                          <ActionIcon
                            size="sm"
                            color="red"
                            variant="light"
                            onClick={() => router.push(`${deletePathPrefix}/${user.id}`)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        )}

        {/* Pagination Controls - Cursor-based */}
        <Center pt="md">
          <Group gap="xs">
            <Button
              variant="subtle"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPageIndex === 0 || isLoading}
              leftSection={<IconChevronLeft size={14} />}
            >
              Previous
            </Button>

            <Text size="sm" c="dimmed" style={{ minWidth: 60, textAlign: 'center' }}>
              Page {currentPageIndex + 1}
            </Text>

            <Button
              variant="subtle"
              size="sm"
              onClick={handleNextPage}
              disabled={!hasNextPage || isLoading}
              rightSection={<IconChevronRight size={14} />}
            >
              Next
            </Button>
          </Group>
        </Center>
      </ScreenContainer>
    </OwnerOnly>
  );
}

export default UserDirectoryScreen;
