# Quick-Start: Top 5 High-ROI Improvements

**Purpose**: Actionable guide to implement the highest-impact audit recommendations.  
**Target**: 2-3 weeks of focused work  
**Expected Outcome**: Significantly improved UX + admin experience

---

## 🎯 Priority 1: Password Verification Modal

**Impact**: Prevents accidental destructive actions  
**Effort**: 1-2 days  
**Blocks**: Delete operations

### Implementation Steps

#### Step 1: Create Modal Component

```tsx
// modals/PasswordVerificationModal.tsx
'use client';

import { Button, Group, Modal, PasswordInput, Stack, Text } from '@mantine/core';
import { useState } from 'react';

export interface PasswordVerificationModalProps {
  isOpen: boolean;
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
  action: string;
  isLoading?: boolean;
}

export function PasswordVerificationModal({
  isOpen,
  onConfirm,
  onCancel,
  action,
  isLoading = false,
}: PasswordVerificationModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();

  const handleConfirm = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }
    try {
      await onConfirm(password);
      setPassword('');
      setError(undefined);
    } catch (err) {
      setError('Invalid password');
    }
  };

  return (
    <Modal opened={isOpen} onClose={onCancel} title="Verify Your Password">
      <Stack>
        <Text size="sm">
          To confirm <strong>{action}</strong>, please enter your password:
        </Text>
        <PasswordInput
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          error={error}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
          }}
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={isLoading} color="red">
            Verify & {action}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
```

#### Step 2: Update DeleteUserScreen

```tsx
// screens/DeleteUserScreen.tsx
import { PasswordVerificationModal } from '../modals/PasswordVerificationModal';

export function DeleteUserScreen({ userId, onBackClick }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const confirmPassword = useConfirmPassword();
  const deleteUser = useDeleteUser();

  const handleDelete = async () => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = async (password: string) => {
    await confirmPassword.mutateAsync({ password });
    await deleteUser.mutateAsync({ userId });
    onBackClick?.();
  };

  return (
    <>
      <ScreenContainer>
        {/* ... existing content ... */}
        <Button color="red" onClick={handleDelete} disabled={deleteUser.isPending}>
          Delete User
        </Button>
      </ScreenContainer>

      <PasswordVerificationModal
        isOpen={showConfirm}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
        action="Delete User"
        isLoading={deleteUser.isPending}
      />
    </>
  );
}
```

#### Step 3: Export & Update Index

```tsx
// modals/index.ts
export { PasswordVerificationModal } from './PasswordVerificationModal';

// index.ts
export { PasswordVerificationModal } from './modals';
```

---

## 🎯 Priority 2: Bulk User Operations

**Impact**: Huge time-saver for admins (10-50 user operations → 1 click)  
**Effort**: 3-4 days  
**Blocks**: Future Phase-2

### Implementation Steps

#### Step 1: Create Bulk Hook

```tsx
// app-auth-hooks/useBulkUserOperations.ts
'use client';

import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { appAuthService } from './internal/authService';
import { authQueryKeys } from './keys';

export type BulkOperation = 'disable' | 'enable' | 'changeRole' | 'delete' | 'restore';

export interface BulkUserOperationInput {
  userIds: string[];
  operation: BulkOperation;
  roleNewRole?: string; // For changeRole operation
}

export function useBulkUserOperations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: BulkUserOperationInput) => {
      const results = await Promise.allSettled(
        input.userIds.map(async (userId) => {
          switch (input.operation) {
            case 'disable':
              return appAuthService.updateUserStatus(userId, { isDisabled: true });
            case 'enable':
              return appAuthService.updateUserStatus(userId, { isDisabled: false });
            case 'changeRole':
              if (!input.roleNewRole) throw new Error('Role required');
              return appAuthService.updateUserRole(userId, { role: input.roleNewRole });
            case 'delete':
              return appAuthService.deleteUser(userId);
            case 'restore':
              return appAuthService.restoreUser(userId);
          }
        }),
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      return { successful, failed, total: input.userIds.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.users() });
    },
  });
}
```

#### Step 2: Create Bulk Actions Screen

```tsx
// screens/BulkUserActionsScreen.tsx
'use client';

import { Button, Checkbox, Group, Modal, Select, Stack, Table, Text, Title } from '@mantine/core';
import { useMemo, useState } from 'react';
import { useListUsers } from '../../app-auth-hooks/useUserQueries';
import { useBulkUserOperations } from '../../app-auth-hooks/useBulkUserOperations';
import UserListItem from '../components/UserListItem';

type BulkOp = 'disable' | 'enable' | 'changeRole' | 'delete' | 'restore';

export function BulkUserActionsScreen() {
  const { data: allUsers = [] } = useListUsers();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [operation, setOperation] = useState<BulkOp>('disable');
  const [newRole, setNewRole] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState(false);
  const bulkMutation = useBulkUserOperations();

  const selectedUsers = useMemo(
    () => allUsers.filter((u) => selectedIds.has(u.id)),
    [allUsers, selectedIds],
  );

  const handleSelectAll = () => {
    if (selectedIds.size === allUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allUsers.map((u) => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedIds(newSet);
  };

  const handleExecute = async () => {
    await bulkMutation.mutateAsync({
      userIds: Array.from(selectedIds),
      operation,
      roleNewRole: newRole,
    });
    setSelectedIds(new Set());
    setShowConfirm(false);
  };

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Title order={2}>Bulk User Operations</Title>
        <Text c="dimmed">Select users and choose an action to perform in bulk.</Text>
      </Stack>

      {/* Operation Selector */}
      <Select
        label="Select Operation"
        value={operation}
        onChange={(value) => setOperation(value as BulkOp)}
        data={[
          { value: 'disable', label: 'Disable Users' },
          { value: 'enable', label: 'Enable Users' },
          { value: 'changeRole', label: 'Change Role' },
          { value: 'delete', label: 'Delete Users' },
          { value: 'restore', label: 'Restore Users' },
        ]}
      />

      {operation === 'changeRole' && (
        <Select
          label="New Role"
          placeholder="Select new role"
          value={newRole}
          onChange={(value) => setNewRole(value || '')}
          data={[
            { value: 'manager', label: 'Manager' },
            { value: 'employee', label: 'Employee' },
            { value: 'client', label: 'Client' },
          ]}
        />
      )}

      {/* User Selection Table */}
      <Table striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>
              <Checkbox
                checked={selectedIds.size === allUsers.length && allUsers.length > 0}
                onChange={handleSelectAll}
                aria-label="Select all users"
              />
            </Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Role</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {allUsers.map((user) => (
            <Table.Tr key={user.id}>
              <Table.Td>
                <Checkbox
                  checked={selectedIds.has(user.id)}
                  onChange={() => handleSelectUser(user.id)}
                />
              </Table.Td>
              <Table.Td>{user.name}</Table.Td>
              <Table.Td>{user.email}</Table.Td>
              <Table.Td>{user.role}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {/* Action Bar */}
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {selectedIds.size} of {allUsers.length} users selected
        </Text>
        <Button
          onClick={() => setShowConfirm(true)}
          disabled={selectedIds.size === 0}
          loading={bulkMutation.isPending}
        >
          Execute ({selectedIds.size})
        </Button>
      </Group>

      {/* Confirmation Modal */}
      <Modal opened={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Action">
        <Stack>
          <Text>
            About to perform <strong>{operation}</strong> on <strong>{selectedIds.size}</strong>{' '}
            users:
          </Text>
          <ul>
            {selectedUsers.slice(0, 5).map((user) => (
              <li key={user.id}>{user.name}</li>
            ))}
            {selectedUsers.length > 5 && <li>... and {selectedUsers.length - 5} more</li>}
          </ul>
          <Text c="red" size="sm">
            This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecute} loading={bulkMutation.isPending} color="red">
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
```

#### Step 3: Export & Add to Routes

```tsx
// screens/index.ts
export { BulkUserActionsScreen } from './BulkUserActionsScreen';

// utils/authRoutes.ts
export const authRoutes = {
  // ... existing ...
  bulkUserActions: () => '/users/bulk-actions',
};
```

---

## 🎯 Priority 3: Session Expiry Warning

**Impact**: Prevents data loss from unexpected logout  
**Effort**: 1 day  
**Blocks**: User experience

### Implementation Steps

```tsx
// components/SessionExpiryWarning.tsx
'use client';

import { Alert, Button, Group, Text } from '@mantine/core';
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useAuthSession } from '../../app-auth-hooks/useAuthSession';

const WARNING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function SessionExpiryWarning() {
  const session = useAuthSession();
  const [showWarning, setShowWarning] = useState(false);
  const [minutesRemaining, setMinutesRemaining] = useState<number>();

  useEffect(() => {
    if (!session.sessionExpiresAt) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const expiry = session.sessionExpiresAt!.getTime();
      const remaining = expiry - now;

      if (remaining <= 0) {
        setShowWarning(false);
        clearInterval(timer);
      } else if (remaining <= WARNING_THRESHOLD_MS) {
        setShowWarning(true);
        setMinutesRemaining(Math.ceil(remaining / 60000));
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(timer);
  }, [session.sessionExpiresAt]);

  if (!showWarning || minutesRemaining === undefined) return null;

  return (
    <Alert icon={<IconAlertCircle />} color="yellow" title="Session Expiring Soon">
      <Group justify="space-between">
        <Text>Your session expires in {minutesRemaining} minutes.</Text>
        <Button
          size="xs"
          leftSection={<IconRefresh size={14} />}
          onClick={() => {
            // Trigger a query refresh to keep session alive
            window.location.href = '/dashboard';
          }}
        >
          Keep Me Signed In
        </Button>
      </Group>
    </Alert>
  );
}
```

Add to app shell:

```tsx
// shell/AuthAppShell.tsx
<SessionExpiryWarning />
```

---

## 🎯 Priority 4: Advanced Search & Filtering

**Impact**: Admin can find users 10x faster  
**Effort**: 2 days  
**Blocks**: User discovery

### Implementation Steps

```tsx
// components/UserSearchFilters.tsx
'use client';

import { Button, Checkbox, Group, MultiSelect, Select, Stack, TextInput } from '@mantine/core';
import { IconSearch, IconX } from '@tabler/icons-react';
import { useState } from 'react';

export interface UserFilters {
  email?: string;
  roles?: string[];
  isDisabled?: boolean;
  inviteStatus?: string[];
  createdSince?: Date;
  createdUntil?: Date;
}

export interface UserSearchFiltersProps {
  filters: UserFilters;
  onChange: (filters: UserFilters) => void;
  onClear: () => void;
}

export function UserSearchFilters({ filters, onChange, onClear }: UserSearchFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Stack gap="md">
      {/* Main Search */}
      <TextInput
        placeholder="Search by email or name..."
        icon={<IconSearch size={14} />}
        value={filters.email || ''}
        onChange={(e) => onChange({ ...filters, email: e.currentTarget.value })}
        rightSection={
          (filters.email || Object.keys(filters).length > 1) && (
            <Button size="xs" variant="subtle" onClick={onClear} rightSection={<IconX size={14} />}>
              Clear
            </Button>
          )
        }
      />

      {/* Advanced Filters (collapsible) */}
      {expanded && (
        <>
          <MultiSelect
            label="Role"
            placeholder="Filter by role"
            data={[
              { value: 'owner', label: 'Owner' },
              { value: 'manager', label: 'Manager' },
              { value: 'employee', label: 'Employee' },
              { value: 'client', label: 'Client' },
            ]}
            value={filters.roles || []}
            onChange={(roles) => onChange({ ...filters, roles })}
            clearable
            searchable
          />

          <MultiSelect
            label="Invite Status"
            placeholder="Filter by invite status"
            data={[
              { value: 'invited', label: 'Invited' },
              { value: 'activated', label: 'Activated' },
              { value: 'revoked', label: 'Revoked' },
            ]}
            value={filters.inviteStatus || []}
            onChange={(inviteStatus) => onChange({ ...filters, inviteStatus })}
            clearable
            searchable
          />

          <Checkbox
            label="Show Disabled Users Only"
            checked={filters.isDisabled === true}
            onChange={(e) =>
              onChange({
                ...filters,
                isDisabled: e.currentTarget.checked ? true : undefined,
              })
            }
          />
        </>
      )}

      <Group>
        <Button size="xs" variant="subtle" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide' : 'Show'} Advanced Filters
        </Button>
      </Group>
    </Stack>
  );
}
```

---

## 🎯 Priority 5: Expand Storybook Coverage

**Impact**: Improves interactive documentation + developer confidence  
**Effort**: 1 day  
**Blocks**: Better onboarding

```tsx
// stories/AuthComponents.stories.tsx (additions)

export const SignInScreenDefault: Story = {
  render: () => <SignInScreen />,
};

export const SignInScreenWithError: Story = {
  render: () => (
    <ErrorBoundary
      fallback={
        <Alert icon={<IconAlertCircle />} color="red">
          Invalid credentials
        </Alert>
      }
    >
      <SignInScreen />
    </ErrorBoundary>
  ),
};

export const BulkUserActionsDemo: Story = {
  render: () => <BulkUserActionsScreen />,
};

export const PasswordVerificationDemo: Story = {
  render: () => (
    <PasswordVerificationModal
      isOpen={true}
      onConfirm={async () => console.log('confirmed')}
      onCancel={() => console.log('cancelled')}
      action="Delete User"
    />
  ),
};
```

---

# Implementation Timeline

| Week   | Priority | Task                                                   | Days |
| ------ | -------- | ------------------------------------------------------ | ---- |
| Week 1 | P1       | Password verification modal + DeleteUserScreen updates | 1-2  |
| Week 1 | P1       | Session expiry warning banner                          | 0.5  |
| Week 2 | P1       | Bulk user operations (hook + screen)                   | 3-4  |
| Week 2 | P1       | Advanced search + filtering                            | 2    |
| Week 3 | P1       | Storybook expansion + documentation                    | 1-2  |

**Total**: 7-14 days (1-2 weeks at half-time focus)

---

# Post-Implementation Checklist

- [ ] All new components have JSDoc comments
- [ ] TypeScript compilation clean (npx tsc --noEmit)
- [ ] All exports added to index.ts
- [ ] Storybook stories run successfully (npm run storybook)
- [ ] Manual testing: happy path + error scenarios
- [ ] Update README with new features
- [ ] Create PR with description + screenshots
- [ ] Request review from product/design
