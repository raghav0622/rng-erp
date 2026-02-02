# app-auth-components: Improvement Opportunities

**Date**: January 31, 2026  
**Current Status**: Production-ready with 100% hook coverage and full standardization

---

## 🔴 High Priority (Improve UX & Usability)

### 1. **Extract UserActionsMenu Callback Logic** (Easy Win)

**Issue**: `UserActionsMenu` accepts 8 handlers (`onEditProfile`, `onChangeRole`, etc.) but doesn't provide a pre-built composition.

**Improvement**: Create a convenience HOC or factory function:

```tsx
export function useUserActionHandlers(userId: string, router: ReturnType<typeof useRouter>) {
  return {
    onEditProfile: () => router.push(`/users/${userId}/edit`),
    onChangeRole: () => router.push(`/users/${userId}/role`),
    onToggleStatus: () => router.push(`/users/${userId}/status`),
    // ... etc
  };
}
```

**Impact**: Removes 20+ lines of handler boilerplate from parent screens.

---

### 2. **Create Inline Error Display Pattern** (Medium)

**Issue**: Currently, screens manually manage `externalErrors` state + `Alert` component.

**Improvement**: Create a reusable `ExternalErrorsDisplay` component:

```tsx
<ExternalErrorsDisplay errors={externalErrors} onDismiss={() => setExternalErrors([])} />
```

**Impact**: Reduces 5-10 lines per screen; consistent error styling.

---

### 3. **Add Loading State Skeleton Components** (Medium)

**Issue**: Screens use generic `AuthLoadingOverlay` but no skeleton placeholders for detail/list views.

**Improvement**: Create skeleton variants:

- `UserDetailSkeleton` — Shows placeholder layout during load
- `UserListSkeleton` — Shows 5-10 placeholder rows
- `UserCardSkeleton` — Quick preview skeleton

**Impact**: Better perceived performance; no layout shift during load.

---

### 4. **Extract Form Error Handling Pattern** (Easy)

**Issue**: `DeleteUserScreen`, `RestoreUserScreen`, etc. all have identical:

```tsx
try {
  await mutation.mutateAsync(data);
} catch (error) {
  setExternalErrors([(error as AppAuthError).message]);
}
```

**Improvement**: Create helper hook:

```tsx
export function useMutationErrorHandler() {
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const handleError = (error: unknown) => {
    setExternalErrors([(error as AppAuthError).message]);
  };
  return { externalErrors, setExternalErrors, handleError };
}
```

**Impact**: Eliminates 200+ lines of try-catch boilerplate.

---

## 🟡 Medium Priority (Enhance Functionality)

### 5. **Add Bulk User Actions** (Component)

**Issue**: Only single-user operations available (`DeleteUserScreen`, `UpdateUserRoleScreen`).

**Improvement**: Create `BulkUserActionsScreen`:

- Select multiple users (checkbox list)
- Bulk actions: disable/enable, change role, delete, export
- Confirmation modal with count

**Impact**: Common admin task; reduces 10+ clicks per operation.

---

### 6. **Create User History/Audit Trail Display** (Component)

**Issue**: No audit trail of when users were created, deleted, role changes.

**Improvement**: Add `UserAuditTimeline` component showing:

- User created at: `formatUserDate(createdAt)`
- Last role change: `formatUserDate(roleUpdatedAt)`
- Last modified: `formatUserDate(updatedAt)`
- Deleted at: `formatUserDate(deletedAt)` (if applicable)

**Impact**: Accountability; useful for compliance/debugging.

---

### 7. **Add Quick-Filter Presets to UserDirectoryScreen** (UI)

**Issue**: `UserDirectoryScreen` supports search but no quick filters.

**Improvement**: Add filter buttons:

- Active Users
- Pending Invites
- Disabled Users
- Deleted Users (soft-deleted recovery view)

**Impact**: Faster navigation for common admin workflows.

---

### 8. **Create User Role Transition Guide** (Component)

**Issue**: `UpdateUserRoleScreen` allows role changes but no clarity on what permissions change.

**Improvement**: Add `RolePermissionComparison` component:

```tsx
<RolePermissionComparison currentRole="employee" newRole="manager" />
```

Shows: "Manager can: [X], [Y], [Z]" vs "Employee can: [A], [B]"

**Impact**: Prevents accidental over-provisioning.

---

## 🟢 Low Priority (Polish & Optimization)

### 9. **Performance: Memoize UserListItem** (Code Quality)

**Issue**: `UserListItem` re-renders on every parent change even if props unchanged.

**Fix**: Add `React.memo`:

```tsx
export default React.memo(UserListItem);
```

**Impact**: Small rendering performance boost in large lists.

---

### 10. **Add Empty State Components** (UX)

**Issue**: Screens show empty containers when no data.

**Improvement**: Create empty state templates:

- `NoUsersEmptyState` — Shows "No users found" with action
- `NoInvitesEmptyState` — Shows "Create your first invite"
- `NoOrphanedUsersEmptyState` — Shows "System clean!"

**Impact**: Better UX feedback; clear next action.

---

### 11. **Export Typed Route Builders** (DX)

**Issue**: Developers hardcode route paths: `/users/${id}/edit`.

**Improvement**: Create route builder utilities:

```tsx
export const authRoutes = {
  userDetail: (id: string) => `/users/${id}`,
  userEdit: (id: string) => `/users/${id}/edit`,
  userRole: (id: string) => `/users/${id}/role`,
  // ... etc
};
```

**Usage**: `router.push(authRoutes.userEdit(userId))`

**Impact**: Single source of truth for routes; refactoring safety.

---

### 12. **Add useAsync Hook for Common Patterns** (Utility)

**Issue**: Screens manage `isLoading`, `error`, `data` individually.

**Improvement**: Already have this via React Query hooks—but add simplified wrapper:

```tsx
export function useSimpleAsync<T>(fn: () => Promise<T>) {
  const [state, setState] = useState({ isLoading: false, error: null, data: null });
  // ...
}
```

**Impact**: Consistency; easier one-off operations.

---

### 13. **Create Accessibility (a11y) Audit Report** (Quality)

**Issue**: No formal accessibility testing mentioned.

**Improvement**: Add:

- Keyboard navigation matrix (Tab, Enter, Escape flow for each screen)
- Screen reader testing notes
- WCAG 2.1 AA compliance checklist

**Impact**: Production-ready for accessibility standards.

---

### 14. **Add Storybook Stories for All Components** (Documentation)

**Issue**: Components exist but no interactive documentation.

**Improvement**: Create `.stories.tsx` for:

- All badge components (UserStatusBadge, RoleBadge, etc.)
- All screens with mock data
- Error states
- Loading states

**Usage**: `npm run storybook`

**Impact**: Living documentation; easier QA.

---

## 📊 Impact Priority Matrix

| Item                        | Effort | Impact | Priority |
| --------------------------- | ------ | ------ | -------- |
| 1. UserActionsMenu handlers | 1h     | Medium | 🟡       |
| 2. ExternalErrorsDisplay    | 30m    | High   | 🔴       |
| 3. Skeleton loaders         | 2h     | Medium | 🟡       |
| 4. useMutationErrorHandler  | 1h     | High   | 🔴       |
| 5. Bulk actions             | 4h     | Medium | 🟡       |
| 6. Audit timeline           | 2h     | Low    | 🟢       |
| 7. Filter presets           | 1h     | High   | 🔴       |
| 8. Role permissions guide   | 2h     | Medium | 🟡       |
| 9. Memoize components       | 30m    | Low    | 🟢       |
| 10. Empty states            | 1h     | High   | 🔴       |
| 11. Route builders          | 1h     | Medium | 🟡       |
| 12. useAsync hook           | 1h     | Low    | 🟢       |
| 13. A11y audit              | 2h     | High   | 🔴       |
| 14. Storybook               | 3h     | Medium | 🟡       |

---

## 🎯 Recommended Next Phase (Prioritized)

### Phase 4: Developer Ergonomics (2-3 days)

1. ✅ Extract `useMutationErrorHandler` hook
2. ✅ Create `ExternalErrorsDisplay` component
3. ✅ Export `authRoutes` builder
4. ✅ Add quick filter presets to UserDirectoryScreen
5. ✅ Create empty state components

### Phase 5: UX Polish (1-2 days)

6. ✅ Add skeleton loaders for detail/list views
7. ✅ Create `BulkUserActionsScreen` (optional but high-value)
8. ✅ Add filter badges to show active filters

### Phase 6: Documentation (1 day)

9. ✅ Add Storybook stories for key components
10. ✅ A11y audit + fixes

---

## ❌ Not Recommended (Out of Scope)

- **2FA Support**: Not available in frozen auth service
- **Session Analytics**: Would require service changes
- **Advanced Pagination Cache**: React Query already handles efficiently
- **Custom Form Components**: rng-forms is the form library

---

## Summary

✅ **Current State**: Production-ready, 100% feature complete  
🚀 **Recommended**: Focus Phase 4 (ergonomics) for developer happiness  
📈 **Long-term**: Phases 5-6 for polish and documentation

The component library is complete and battle-tested. These improvements are all **additive enhancements** that don't affect core functionality.
