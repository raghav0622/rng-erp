# Auth Hook Return Semantics

This document clarifies the return values and error handling for auth hooks.

## `useCurrentUser()` Null Semantics

### Return Value

```tsx
const { data: user, error } = useCurrentUser();
```

**`data` can be:**

- **`AppUser`** (object) — User is authenticated and exists
- **`null`** — User is not authenticated or has deleted their account
- **`undefined`** — Query is still loading (due to Suspense boundary)

**`error` can be:**

- **`undefined`** — Normal operation
- **`AppAuthError`** — Network failure, service error, or other exception

### Key Rule: Null is NOT an Error

```tsx
// ✅ CORRECT: Null means "not authenticated"
const { data: user } = useCurrentUser();
if (user) {
  return <Dashboard user={user} />;
}
return <LoginPrompt />;

// ❌ WRONG: Treating null as exceptional
const { data: user, error } = useCurrentUser();
if (!user || error) {
  // Don't lump null with errors
  return <ErrorScreen />;
}
```

### Why This Matters

- **Normal UX flow**: Unauthenticated → Login form → Authenticated → Dashboard
- **Errors are exceptional**: Network timeouts, permission violations, server crashes
- **Null is state**: "User has not logged in yet" is a valid state, not an error

## Error Boundary Handling

Use error boundaries **only** for actual errors, not for null:

```tsx
// App layout
<ErrorBoundary fallback={<ErrorScreen />}>
  <Suspense fallback={<LoadingSpinner />}>
    <AuthenticatedApp />
  </Suspense>
</ErrorBoundary>;

// Inside AuthenticatedApp
function AuthenticatedApp() {
  const { data: user } = useCurrentUser();

  if (!user) {
    // Not an error—redirect to login
    return <Navigate to="/login" />;
  }

  return <Dashboard user={user} />;
}
```

## Other Query Hooks

All other query hooks (`useListUsers`, `useGetUserById`, etc.) follow the same pattern:

- **Suspense** handles loading states
- **Error boundary** catches `AppAuthError`
- Return values (objects, arrays, null) are normal states, never errors

## Cache Invalidation Strategy

Understand when to invalidate which keys:

### Session Lifecycle (Sign In / Sign Out)

```tsx
const signIn = useSignIn();
const queryClient = useQueryClient();

signIn.mutate(data, {
  onSuccess: () => {
    // Invalidate ALL auth queries (user identity changed)
    queryClient.invalidateQueries({ queryKey: authQueryKeys.all });
  },
});
```

**When to use**: Auth state changes (sign in, sign out, disablement)
**Scope**: All auth caches cleared (session, user detail, user list)
**Reason**: User identity changed; all cached data may be stale

### Profile Updates (Name, Email, Photo)

```tsx
const updateProfile = useUpdateUserProfile();

updateProfile.mutate(data, {
  onSuccess: () => {
    // Invalidate only current user + specific detail
    queryClient.invalidateQueries({ queryKey: authQueryKeys.currentUser() });
    queryClient.invalidateQueries({ queryKey: authQueryKeys.userDetail(userId) });
  },
});
```

**When to use**: User profile changes (name, photo, email)
**Scope**: Targeted keys only (current user + specific detail)
**Reason**: Only this user changed; other users' data is unaffected

### User Roster Changes (Invite, Delete, Restore)

```tsx
const inviteUser = useInviteUser();

inviteUser.mutate(data, {
  onSuccess: () => {
    // Invalidate user lists only (not individual details)
    queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
    queryClient.invalidateQueries({ queryKey: authQueryKeys.userSearch() });
  },
});
```

**When to use**: User roster changes (invite, delete, restore)
**Scope**: List and search queries only
**Reason**: Roster changed; individual users' details remain valid

---

## Cache Key Considerations

### `useCurrentUser()` Cache Key

```typescript
authQueryKeys.currentUser(); // Single, stable key
```

- Query key is always the same (no parameters)
- Cache entry is updated via mutations (sign in/out, profile updates)
- Recommended: Invalidate on session changes only

### `useSearchUsers(query)` Cache Key

```typescript
authQueryKeys.userSearch(JSON.stringify(query));
```

- Key includes canonicalized query object
- Large query objects produce large keys (acceptable for private ERP with small datasets)
- Recommended for admin-heavy usage where query diversity is limited

---

**Status**: This documentation reflects the frozen v1 API. No changes expected.
