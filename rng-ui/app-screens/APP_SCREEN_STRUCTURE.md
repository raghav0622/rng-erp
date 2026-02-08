# App-Screen Structure Pattern

## Overview

This document defines the standard pattern for creating new app-screens in the rng-ui library. This pattern ensures consistent code organization, clear separation of concerns, and rapid UI improvement capability.

## File Structure

```
rng-ui/app-screens/[screen-name]/
├── index.tsx                    # Main orchestrator - composes logic + UI
├── hooks/
│   ├── use[ScreenName].ts      # Core business logic and state management
│   └── index.ts                # Hook exports
└── ui-components/
    ├── [ScreenName]Layout.tsx  # Main layout wrapper
    ├── [Component1].tsx        # UI-only component
    ├── [Component2].tsx        # UI-only component
    └── index.ts                # UI component exports
```

## Core Principles

### 1. **Separation of Concerns**

- **Hooks** (`hooks/use[ScreenName].ts`): Handle ALL business logic, state management, API calls, and callbacks
- **UI Components** (`ui-components/`): Pure presentation components - receive all data/callbacks as props, NO logic
- **Orchestrator** (`index.tsx`): Glue layer that connects hooks to UI components

### 2. **UI-Only Components**

UI-only components must:

- Receive all data as props (no queries from hooks)
- Receive all callbacks as props
- Be focused on rendering/presentation
- Have no side effects or business logic
- Be easy to customize visually without touching logic

Example:

```tsx
// ✅ Good - UI-only
interface UserCardProps {
  user: AppUser;
  onEdit: () => void;
  onDelete: () => void;
  isLoading: boolean;
}

export function UserCard({ user, onEdit, onDelete, isLoading }: UserCardProps) {
  return (
    <Card>
      <Text>{user.name}</Text>
      <Button onClick={onEdit}>Edit</Button>
      <Button onClick={onDelete} loading={isLoading}>
        Delete
      </Button>
    </Card>
  );
}
```

### 3. **Hook Patterns**

#### Core Hook Structure

```tsx
export function use[ScreenName]() {
  // State for filters, tabs, pagination (NOT modal state)
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Queries (React Query)
  const { data, isLoading } = useListUsers();
  const { data: currentUser } = useCurrentUser();

  // Mutations
  const deleteUser = useDeleteUser();
  const updateUser = useUpdateUser();

  // Handlers/Callbacks
  const handleDelete = useCallback(async (id: string) => {
    await deleteUser.mutateAsync(id);
    // Don't close modal here - modal manages its own state
  }, [deleteUser]);

  // Derived state for filtering
  const filteredData = useMemo(() => {
    return data?.filter(item => item.name.includes(searchTerm));
  }, [data, searchTerm]);

  return {
    // UI State
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,

    // Data
    data: filteredData,
    isLoading,
    currentUser,

    // Handlers
    handleDelete,
  };
}
```

**Key Principle:**

- ✅ Hooks manage: Data queries, mutations, business logic, filter/search state
- ✅ Components manage: Modal open/close state via RNGConfirmationModal
- ❌ Don't manage: `activeModal`, `openModal()`, `closeModal()` - let modals be self-contained

### 4. **Orchestrator (index.tsx) Pattern**

```tsx
'use client';

import { use[ScreenName] } from './hooks/use[ScreenName]';
import { [ScreenName]Layout, [Component1], [Component2] } from './ui-components';

export function [ScreenName]Screen() {
  const {
    // All state/data/handlers from hook
    selectedId,
    activeModal,
    data,
    isLoading,
    handleDelete,
  } = use[ScreenName]();

  return (
    <[ScreenName]Layout
      // Props for layout
    >
      <[Component1]
        data={data}
        isLoading={isLoading}
        onAction={handleDelete}
      />
      <[Component2]
        // Props...
      />
    </[ScreenName]Layout>
  );
}
```

## Components & Features

### RNG Standard Components

#### Loading States

- **Use**: `RNGLoadingOverlay` (from `@/rng-ui/ux`)
- **❌ Don't use**: `<Loader />` from Mantine directly
- **Usage**: `<RNGLoadingOverlay />` or `<RNGLoadingOverlay message="Loading..." />`

#### Modals

**For modals with trigger buttons:**

- **Use**: `RNGModal` (from `@/rng-ui/ux`)
- **Pattern**: Requires `renderTrigger` and children as function

```tsx
<RNGModal title="Title" renderTrigger={({ onClick }) => <Button onClick={onClick}>Open</Button>}>
  {(onClose) => (
    <Stack>
      <Text>Content here</Text>
      <Button onClick={onClose}>Close</Button>
    </Stack>
  )}
</RNGModal>
```

**For simple confirmation/controlled modals:**

- **Use**: `RNGConfirmationModal` (from `@/rng-ui/ux`)
- **Pattern**: Stateful component with render props - manages its own open/close state

```tsx
<RNGConfirmationModal
  title="Confirm Action"
  renderTrigger={({ onClick }) => <Button onClick={onClick}>Delete</Button>}
>
  {(onClose) => (
    <Stack>
      <Text>Are you sure?</Text>
      <Group>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            handleConfirm();
            onClose();
          }}
          color="red"
        >
          Confirm
        </Button>
      </Group>
    </Stack>
  )}
</RNGConfirmationModal>
```

**Creating reusable confirmation buttons:**

For common confirmation patterns, wrap RNGConfirmationModal in a button component for easier reuse:

```tsx
interface DeleteButtonProps {
  onConfirm: () => void;
  isLoading: boolean;
}

export function DeleteButton({ onConfirm, isLoading }: DeleteButtonProps) {
  return (
    <RNGConfirmationModal
      title="Delete Item"
      renderTrigger={({ onClick }) => (
        <Button onClick={onClick} color="red" loading={isLoading}>
          Delete
        </Button>
      )}
    >
      {(onClose) => (
        <Stack>
          <Text>This action cannot be undone</Text>
          <Group>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              color="red"
            >
              Delete
            </Button>
          </Group>
        </Stack>
      )}
    </RNGConfirmationModal>
  );
}
```

#### Page Content

- **Use**: `RNGPageContent` (from `@/rng-ui/ux`)
- **Provides**: Standard page layout with title, description, actions, warnings

#### Forms

- **Use**: `RNGForm` (from `@/rng-forms`)
- **Pattern**: Declarative schema-based form builder

#### Search Input

- **Use**: `UserSearchInput` (from `@/rng-ui/auth`)
- **Props**: `value`, `onSearchChange` (NOT `onChange`)

### Notifications

- **Use**: `useRNGNotification()` hook
- **Methods**: `success()`, `error()`, `info()`, `warning()`

## Detailed Example: User Management Screen

```
rng-ui/app-screens/user-management/
├── index.tsx                          # Orchestrator
├── hooks/
│   └── useUserManagement.ts          # All business logic
└── ui-components/
    ├── UserManagementLayout.tsx      # Main layout
    ├── UsersTabPanel.tsx             # Tab content
    ├── UserCardModal.tsx             # User detail modal
    ├── UserCardDesign.tsx            # User card display
    ├── StatusConfirmModal.tsx        # Confirmation modal
    ├── DeleteConfirmModal.tsx        # Delete confirmation
    └── index.ts                      # Exports
```

### Key Files

**hooks/useUserManagement.ts** (200+ lines)

- State: `activeTab`, `searchTerm` (filters only, no modal state)
- Queries: `useListUsersPaginated`, `useCurrentUser`
- Mutations: `useDeleteUser`, `useRestoreUser`, `useUpdateUserStatus`
- Handlers: `handleDelete`, `handleStatusChange`, `handleResendInvite`, etc.
- All handlers are mutation callbacks, not modal state management

**index.tsx** (50 lines)

- Uses `useUserManagement()` hook
- Renders `UserManagementLayout` with tabbed content
- Renders `UserCardModal` which internally uses `StatusToggleButton` and `DeleteUserButton`
- Simple, focused rendering with minimal state passing

**ui-components/UserCardModal.tsx**

- Props: `user`, `currentUser`, `onToggleStatus`, `onDelete`, `onResendInvite`, `onRevokeInvite`, `onRestore`
- No business logic - just renders UI and calls callbacks
- Uses `RNGModal` with `renderTrigger` for user details modal
- Renders `StatusToggleButton` and `DeleteUserButton` which manage their own modal state

**ui-components/StatusToggleButton.tsx** (NEW PATTERN)

- Wrapper around `StatusConfirmModal`
- Props: `onConfirm`, `isDisabled`, `isLoading`
- Renders a button trigger and confirmation dialog
- Creates reusable, self-contained confirmation dialogs
- Modal state is completely internal

**ui-components/DeleteUserButton.tsx** (NEW PATTERN)

- Wrapper around `DeleteConfirmModal`
- Props: `onConfirm`, `isLoading`
- Same self-contained pattern as `StatusToggleButton`
- Easy to test, customize, and reuse

## Best Practices

### ✅ Do's

1. Keep hooks focused on one responsibility (business logic)
2. Keep UI components pure and stateless
3. Pass all data/callbacks as props to UI components
4. Use `useCallback` for handler functions to prevent unnecessary re-renders
5. Use TypeScript interfaces for all component props
6. Document complex logic with comments
7. Use `RNGLoadingOverlay` for all loading states
8. Use RNG modals (RNGModal or RNGConfirmationModal) for all dialogs
9. Extract custom hooks when logic becomes complex
10. Maintain consistent naming: `use[ScreenName]`, `[ScreenName]Screen`, `[ScreenName]Layout`

### ❌ Don'ts

1. Put business logic in UI components
2. Have UI components fetch data from hooks directly (pass as props)
3. Use different loading/modal patterns
4. Create massive monolithic components (break into smaller UI components)
5. Pass event handlers that should be in the hook to UI components
6. Mutate state directly (use useState setters)
7. Have circular dependencies between files
8. Use modal libraries other than RNG modals
9. Hardcode values in UI components
10. Skip TypeScript types in props interfaces

## Migration Guide: Converting Existing Screens

When converting an existing monolithic screen to this pattern:

1. **Extract Business Logic** → Create `hooks/use[ScreenName].ts`
   - Move useState hooks
   - Move API query hooks
   - Move mutation handlers
   - Move calculated values

2. **Create UI Components** → Create files in `ui-components/`
   - One component per responsibility
   - Pass all data/callbacks as props
   - No imports of queries/mutations

3. **Create Layout Wrapper** → `ui-components/[ScreenName]Layout.tsx`
   - Provides consistent page structure
   - Accepts content props
   - Handles responsive layout

4. **Create Orchestrator** → `index.tsx`
   - Import hook
   - Import UI components
   - Compose them together
   - Pass all props explicitly

5. **Update Page Route**
   - Change from monolithic component to: `<[ScreenName]Screen />`
   - Page should be ~3 lines of code

6. **Create Re-export** (for backwards compatibility)
   - File: `rng-ui/app-screens/[ScreenName]Screen.tsx`
   - Content: `export { [ScreenName]Screen } from './[screen-name]';`

## Testing

### Hook Testing

Test business logic in isolation:

```tsx
const { result } = renderHook(() => useUserManagement());
expect(result.current.activeModal).toBe(null);
// Simulate user actions, query loading, etc.
```

### Component Testing

Test UI components with different props:

```tsx
render(<UserCard user={mockUser} onEdit={mockOnEdit} onDelete={mockOnDelete} isLoading={false} />);
// Test rendering, user interactions
```

### Integration Testing

Test screen composition:

```tsx
render(<UserManagementScreen />);
// Test full user workflows
```

## Debugging Tips

1. **UI not updating?** Check that hook is calling setters for state changes
2. **Stale data?** Verify React Query key is unique and invalidated after mutations
3. **Modal not opening?** Ensure `openModal()` is being called from UI component callback
4. **Props not passed?** Search for component usage and verify all required props are passed
5. **Type errors?** Ensure UI component interfaces match what orchestrator passes

## Common Patterns

### Loading States

```tsx
if (isLoading) return <RNGLoadingOverlay />;
```

### List Rendering

```tsx
<UsersTabPanel
  users={users}
  isLoading={isLoading}
  emptyLabel="No users found"
  renderUser={(user) => <UserCard user={user} />}
/>
```

### Confirmation Dialogs

```tsx
<DeleteConfirmModal
  opened={activeModal === 'delete' && !!selectedUser}
  onClose={closeModal}
  onConfirm={() => handleDelete(selectedUser.id, closeModal)}
  isLoading={isDeleting}
/>
```

### Search Input

```tsx
<UserSearchInput
  value={searchTerm}
  onSearchChange={setSearchTerm}
  placeholder="Search by name..."
/>
```

## File Size Guidelines

- **Hooks**: 100-400 lines (business logic)
- **Layout component**: 50-150 lines
- **Individual UI components**: 50-150 lines
- **Orchestrator**: 50-100 lines
- **Total screen**: 500-900 lines (vs. 1000-2000 lines for monolithic)

## Next Steps

When creating a new screen:

1. Review this document
2. Check `user-management` as reference implementation
3. Create folder structure
4. Start with hook (business logic)
5. Create UI components (presentation)
6. Create orchestrator (composition)
7. Test each layer independently
8. Update page routes

---

**Last Updated**: February 7, 2026  
**Pattern Version**: 1.0  
**Reference Implementation**: `rng-ui/app-screens/user-management/`
