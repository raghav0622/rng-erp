'use client';

import {
  Button,
  Collapse,
  Group,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconFilter, IconSearch, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import type {
  AppUserInviteStatus,
  AppUserRole,
} from '../../app-auth-service/internal-app-user-service/app-user.contracts';

export interface UserSearchFiltersState {
  search: string;
  roles: AppUserRole[];
  inviteStatuses: AppUserInviteStatus[];
  disabled: boolean | null;
  emailVerified: boolean | null;
}

export interface UserSearchFiltersProps {
  /**
   * Current filter state
   */
  filters: UserSearchFiltersState;
  /**
   * Called when filters change
   */
  onChange: (filters: UserSearchFiltersState) => void;
  /**
   * Show email verified filter (default: true)
   */
  showEmailVerified?: boolean;
  /**
   * Show disabled filter (default: true)
   */
  showDisabled?: boolean;
  /**
   * Show invite status filter (default: true)
   */
  showInviteStatus?: boolean;
  /**
   * Compact mode (inline layout)
   */
  compact?: boolean;
}

/**
 * Advanced User Search & Filtering Component
 *
 * Provides comprehensive filtering for user lists:
 * - Search by name/email
 * - Filter by roles (multi-select)
 * - Filter by invite status
 * - Filter by disabled state
 * - Filter by email verified state
 * - Collapsible UI
 *
 * Features:
 * - Controlled component
 * - Clear all filters
 * - Compact & expanded modes
 * - Active filter count badge
 *
 * @example
 * ```tsx
 * const [filters, setFilters] = useState<UserSearchFiltersState>({
 *   search: '',
 *   roles: [],
 *   inviteStatuses: [],
 *   disabled: null,
 *   emailVerified: null,
 * });
 *
 * <UserSearchFilters filters={filters} onChange={setFilters} />
 * ```
 */
export function UserSearchFilters({
  filters,
  onChange,
  showEmailVerified = true,
  showDisabled = true,
  showInviteStatus = true,
  compact = false,
}: UserSearchFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const roleOptions = [
    { value: 'owner', label: 'Owner' },
    { value: 'manager', label: 'Manager' },
    { value: 'employee', label: 'Employee' },
    { value: 'client', label: 'Client' },
  ];

  const inviteStatusOptions = [
    { value: 'invited', label: 'Invited' },
    { value: 'activated', label: 'Activated' },
    { value: 'revoked', label: 'Revoked' },
  ];

  const disabledOptions = [
    { value: 'true', label: 'Disabled' },
    { value: 'false', label: 'Active' },
  ];

  const emailVerifiedOptions = [
    { value: 'true', label: 'Verified' },
    { value: 'false', label: 'Unverified' },
  ];

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    filters.roles.length +
    filters.inviteStatuses.length +
    (filters.disabled !== null ? 1 : 0) +
    (filters.emailVerified !== null ? 1 : 0);

  const handleClearAll = () => {
    onChange({
      search: '',
      roles: [],
      inviteStatuses: [],
      disabled: null,
      emailVerified: null,
    });
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <TextInput
          placeholder="Search by name or email..."
          leftSection={<IconSearch size={16} />}
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.currentTarget.value })}
          style={{ flex: 1 }}
          rightSection={
            filters.search ? (
              <IconX
                size={16}
                style={{ cursor: 'pointer' }}
                onClick={() => onChange({ ...filters, search: '' })}
              />
            ) : undefined
          }
        />

        <Button
          variant={expanded ? 'filled' : 'light'}
          leftSection={<IconFilter size={16} />}
          rightSection={expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          onClick={() => setExpanded(!expanded)}
        >
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="subtle" leftSection={<IconX size={16} />} onClick={handleClearAll}>
            Clear All
          </Button>
        )}
      </Group>

      <Collapse in={expanded}>
        <Stack
          gap="md"
          p="md"
          style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}
        >
          <Text size="sm" fw={600}>
            Filter Options
          </Text>

          <MultiSelect
            label="Roles"
            placeholder="Select roles to filter by"
            data={roleOptions}
            value={filters.roles}
            onChange={(value) => onChange({ ...filters, roles: value as AppUserRole[] })}
            clearable
            searchable
          />

          {showInviteStatus && (
            <MultiSelect
              label="Invite Status"
              placeholder="Select invite statuses"
              data={inviteStatusOptions}
              value={filters.inviteStatuses}
              onChange={(value) =>
                onChange({ ...filters, inviteStatuses: value as AppUserInviteStatus[] })
              }
              clearable
              searchable
            />
          )}

          {showDisabled && (
            <Select
              label="Account Status"
              placeholder="Filter by disabled status"
              data={disabledOptions}
              value={filters.disabled === null ? null : filters.disabled.toString()}
              onChange={(value) =>
                onChange({ ...filters, disabled: value === null ? null : value === 'true' })
              }
              clearable
            />
          )}

          {showEmailVerified && (
            <Select
              label="Email Verification"
              placeholder="Filter by verification status"
              data={emailVerifiedOptions}
              value={filters.emailVerified === null ? null : filters.emailVerified.toString()}
              onChange={(value) =>
                onChange({ ...filters, emailVerified: value === null ? null : value === 'true' })
              }
              clearable
            />
          )}
        </Stack>
      </Collapse>
    </Stack>
  );
}

export default UserSearchFilters;
