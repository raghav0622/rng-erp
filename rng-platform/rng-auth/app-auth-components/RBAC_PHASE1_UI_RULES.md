# RBAC Phase-1 UI Rules

**Purpose**: Document Phase-1 RBAC limitations and UI patterns.

## Overview

Phase-1 RBAC is intentionally simple: **one role per user**, no multi-role, no assignment-based access.

## Core Principle

```typescript
type AppUserRole = 'owner' | 'manager' | 'employee' | 'client';

interface AppUser {
  id: string;
  role: AppUserRole; // Single role, immutable during session
  // ... other fields
}
```

**Key**: User has exactly one role. No arrays, no assignments, no feature flags.

## Role Hierarchy

No formal hierarchy, but permissions are roughly:

```
owner > manager > employee > client
```

**Critical**: This is UI convention only, not enforced by service.

## UI Patterns

### Pattern 1: Role-Based Rendering

```tsx
const { data: user } = useCurrentUser();

switch (user.role) {
  case 'owner':
    return <OwnerDashboard />;
  case 'manager':
    return <ManagerDashboard />;
  case 'employee':
    return <EmployeeDashboard />;
  case 'client':
    return <ClientDashboard />;
}
```

### Pattern 2: Role Guards

```tsx
// Single role
<RequireRole allow={['owner']}>
  <AdminPanel />
</RequireRole>

// Multiple roles
<RequireRole allow={['owner', 'manager']}>
  <TeamManagement />
</RequireRole>
```

### Pattern 3: Conditional Features

```tsx
const { data: user } = useCurrentUser();

return (
  <Stack>
    <UserList />
    {user.role === 'owner' && <InviteButton />}
    {['owner', 'manager'].includes(user.role) && <ExportButton />}
  </Stack>
);
```

### Pattern 4: Disabled UI Elements

```tsx
<Button disabled={user.role !== 'owner'} onClick={deleteUser}>
  Delete User
</Button>
```

## Role-Specific Capabilities (UI Only)

### Owner

**Full Access**:

- Invite users
- Delete users (except self)
- Change user roles (except own)
- Disable/enable users (except self)
- View all users
- Access all features

**Restrictions**:

- Cannot delete own account
- Cannot disable own account
- Cannot change own role

### Manager

**Permissions**:

- View all users (read-only)
- Manage team members (employee, client)
- Access team features

**Restrictions**:

- Cannot invite users
- Cannot change roles
- Cannot disable users
- Cannot access owner-only features

### Employee

**Permissions**:

- View own profile
- Update own profile
- Access employee features

**Restrictions**:

- Cannot view other users
- Cannot manage users
- Cannot access admin features

### Client

**Permissions**:

- View own profile
- Update own profile (limited)
- Access client portal

**Restrictions**:

- Most restrictive role
- Cannot access internal features

## Phase-1 Limitations

### ❌ No Multi-Role

Users **cannot** have multiple roles simultaneously.

**Example**: User cannot be both `manager` and `employee`.

### ❌ No Role Assignments

Roles are **not** assigned to resources. No "user X has role Y on project Z".

**Example**: Cannot assign "manager role on Project Alpha only".

### ❌ No Feature Flags

No fine-grained permissions. Role defines **all** permissions.

**Example**: Cannot enable "export feature" for specific managers only.

### ❌ No Temporary Roles

Roles are permanent until explicitly changed by owner.

**Example**: Cannot grant "temporary manager access for 1 week".

### ❌ No Role Inheritance

Roles do not inherit permissions from other roles.

**Example**: Manager does not inherit owner permissions.

## UI Anti-Patterns

### ❌ Don't: Check Multiple Roles

```tsx
// Wrong (implies multi-role)
if (user.roles.includes('owner')) {
}
```

**✅ Do: Single Role Check**

```tsx
// Correct
if (user.role === 'owner') {
}
```

### ❌ Don't: Check Permissions

```tsx
// Wrong (implies feature flags)
if (user.permissions.includes('delete_users')) {
}
```

**✅ Do: Check Role**

```tsx
// Correct
if (user.role === 'owner') {
  // Owner can delete users
}
```

### ❌ Don't: Dynamic Role Assignment

```tsx
// Wrong (implies runtime assignment)
<AssignRoleButton roles={['manager', 'employee']} />
```

**✅ Do: Single Role Selector**

```tsx
// Correct
<RoleSelector
  value={user.role}
  onChange={updateUserRole}
  options={['owner', 'manager', 'employee', 'client']}
/>
```

## Phase-2 Considerations (Future)

Phase-2 RBAC **may** include:

- Multi-role support (`user.roles: AppUserRole[]`)
- Assignment-based access (`user.assignments: { resourceId: role }`)
- Feature flags (`user.features: string[]`)
- Temporary roles (`user.roleExpiresAt: Date`)

**Impact**: Breaking changes to:

- `AppUser` interface
- `RequireRole` guard API
- All role checks in UI

**Version**: Phase-2 requires v2.0.0 (major breaking change).

## Migration Path (Future)

If Phase-2 is implemented:

1. **Deprecate** `user.role` (single role)
2. **Add** `user.roles` (array)
3. **Update** `RequireRole` to support arrays
4. **Audit** all UI role checks
5. **Migrate** role-based rendering

**Timeline**: Not planned for v1.

## Testing Patterns

### Test Role-Based Rendering

```tsx
import { useCurrentUser } from '../app-auth-hooks';

jest.mock('../app-auth-hooks', () => ({
  useCurrentUser: jest.fn(),
}));

test('owner sees admin panel', () => {
  (useCurrentUser as jest.Mock).mockReturnValue({
    data: { role: 'owner', ...mockUser },
  });

  render(<Dashboard />);
  expect(screen.getByText('Admin Panel')).toBeInTheDocument();
});

test('employee does not see admin panel', () => {
  (useCurrentUser as jest.Mock).mockReturnValue({
    data: { role: 'employee', ...mockUser },
  });

  render(<Dashboard />);
  expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
});
```

### Test Role Guards

```tsx
test('RequireRole allows owner', () => {
  (useRequireAuthenticated as jest.Mock).mockReturnValue({
    role: 'owner',
  });

  render(
    <RequireRole allow={['owner']}>
      <AdminPanel />
    </RequireRole>,
  );

  expect(screen.getByText('Admin Panel')).toBeInTheDocument();
});

test('RequireRole blocks employee', () => {
  (useRequireAuthenticated as jest.Mock).mockReturnValue({
    role: 'employee',
  });

  expect(() => {
    render(
      <RequireRole allow={['owner']}>
        <AdminPanel />
      </RequireRole>,
    );
  }).toThrow(NotAuthorizedError);
});
```

## Summary

Phase-1 RBAC is **deliberately simple**:

- One role per user
- No assignments
- No feature flags
- UI-only permissions (backend remains authoritative)

This simplicity:

- ✅ Reduces complexity
- ✅ Easier to understand
- ✅ Faster to implement
- ✅ Fewer edge cases

Trade-offs:

- ❌ No fine-grained access
- ❌ No context-specific roles
- ❌ No temporary permissions

**Decision**: Phase-1 covers 95% of ERP needs. Phase-2 only if customer demand justifies complexity.

---

**Status**: Phase-1 policy (frozen v1)  
**Last Updated**: January 30, 2026  
**Next Phase**: v2.0.0 (breaking changes)
