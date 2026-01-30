# Auth Hooks Mental Model (Frozen v1)

**Status**: ✅ LOCKED (FINAL)  
**Purpose**: Explain the conceptual architecture of app-auth-hooks

## Core Concept: Pure Wrapper Layer

app-auth-hooks is a **pure wrapper layer** around app-auth-service. Every hook:

- Delegates directly to the service (no additional logic)
- Translates service return values to React Query types
- Manages React Query caches on service side effects
- Throws service errors directly (no translation)

**Rule**: 1 hook = 1 service method, semantics preserved exactly.

```
UI Component
    ↓
Hook (useCurrentUser, useSignIn, etc.)
    ↓
React Query (useSuspenseQuery, useMutation)
    ↓
Service (appAuthService)
    ↓
Firebase Auth + Firestore
```

## Hook Categories

### 1. Session Hooks

**Purpose**: Access and observe authentication state  
**Behavior**: Observable state (not queries)  
**When to use**: Every authenticated route, to check `if (user)`

#### useAuthSession()

```tsx
const session = useAuthSession();
// session.state: 'unknown' | 'unauthenticated' | 'authenticating' | 'authenticated'
// session.user: AppUser | null
// session.emailVerified: boolean | null
// Updates reactively when auth state changes
```

**How it works**:

1. Calls `appAuthService.onAuthStateChanged()` (observable)
2. Uses `useSyncExternalStore` to subscribe
3. Returns current snapshot immediately (no Suspense)
4. Updates reactively when service emits new state

**When to use**:

- Route guards that need current auth state
- Conditional rendering based on authentication
- Real-time UI updates when user logs in/out

**Suspense-safe**: Yes (returns immediately)  
**Throws**: No  
**Reactive**: Yes

#### useGetSessionSnapshot()

```tsx
const session = useGetSessionSnapshot();
// One-time read of current session
// WARNING: Not reactive. Only use during initialization.
```

**How it works**:

1. Calls `appAuthService.getSessionSnapshot()` (synchronous)
2. Returns current state immediately
3. Does NOT subscribe to changes

**When to use**:

- Initialization during app startup
- Getting current session once (not for render-time decisions)

**Suspense-safe**: No (may throw)  
**Throws**: May throw service errors  
**Reactive**: No (intentional)

**⚠️ WARNING**: Do not use in render loops. This is intentionally non-reactive.

### 2. Query Hooks (All Suspense-Based)

**Purpose**: Fetch user data  
**Behavior**: Suspends on load, throws on error  
**When to use**: Inside `<Suspense>` boundary with error boundary

All query hooks use React Query's `useSuspenseQuery`:

```tsx
const { data: user } = useCurrentUser();
// data: AppUser (if authenticated) or null (if not)
// Suspends until loaded
// Throws on error
// Do NOT check `isPending` or `isLoading`
```

**How it works**:

1. Calls service method to fetch data
2. Suspends while fetching (use `<Suspense>` tag)
3. Throws error directly (use error boundary)
4. Returns data or null

**Pattern**:

```tsx
<ErrorBoundary>
  <Suspense fallback={<Spinner />}>
    <UserComponent />
  </Suspense>
</ErrorBoundary>;

function UserComponent() {
  const { data: user } = useCurrentUser(); // Suspends or throws
  if (!user) return <LoginPrompt />;
  return <Dashboard user={user} />;
}
```

**Null Semantics**:

- `data === AppUser` → Authenticated user exists
- `data === null` → Not authenticated (normal state, not error)
- `undefined` → Still suspending (you won't see this—the Suspense catches it)
- **Error**: Only exceptions (network, service errors) trigger error boundary

**All query hooks**:

- `useCurrentUser()` — Current authenticated user
- `useGetUserById(id)` — User by ID
- `useGetUserByEmail(email)` — User by email
- `useListUsers()` — All users
- `useSearchUsers(query)` — Search by fields
- `useListUsersPaginated(size, token)` — Paginated users
- `useListOrphanedUsers()` — Orphaned users (admin only)
- `useIsOwnerBootstrapped()` — Has owner been created?
- `useIsSignupAllowed()` — Is signup open?

### 3. Mutation Hooks

**Purpose**: Write operations (sign in, invite, delete, etc.)  
**Behavior**: Execute mutation, automatically invalidate caches  
**When to use**: Form submissions, action buttons

```tsx
const mutation = useSignIn();
mutation.mutate(
  { email, password },
  {
    onSuccess: (session) => {
      /* Caches already invalidated */
    },
    onError: (error) => {
      /* AppAuthError */
    },
  },
);
```

**How it works**:

1. Calls service method with data
2. On success: Invalidates relevant React Query caches automatically
3. On error: Throws service error (you handle via `onError` callback)
4. Returns service response

**Invalidation semantics**: See [CACHING_STRATEGY.md](./CACHING_STRATEGY.md)

**All mutation hooks**:

- Auth lifecycle: `useSignIn`, `useSignOut`, `useOwnerSignUp`
- Password: `useChangePassword`, `useConfirmPasswordReset`, `useSendPasswordResetEmail`
- Email: `useSendEmailVerification`, `useConfirmPassword`
- User mgmt: `useInviteUser`, `useDeleteUser`, `useRestoreUser`, `useReactivateUser`, `useUpdateUserProfile`, `useUpdateUserRole`, `useUpdateUserStatus`, `useResendInvite`, `useRevokeInvite`
- Profile: `useUpdateOwnerProfile`, `useUpdateUserPhoto`
- Maintenance: `useCleanupOrphanedLinkedUser`

### 4. Auth Guard Hook

**Purpose**: Protect routes that require authentication  
**Behavior**: Throws error if not authenticated  
**When to use**: Route guards, component initialization

```tsx
function ProtectedPage() {
  const user = useRequireAuthenticated(); // Throws if not authed
  return <Dashboard user={user} />;
}
```

**How it works**:

1. Gets current session
2. If not authenticated: Throws `NotAuthenticatedError`
3. If authenticated: Returns `AppUser` (never null)

**Error handling**: Use error boundary or route-level guard

## Reactive vs Snapshot Hooks

| Aspect             | Reactive (useAuthSession)     | Snapshot (useGetSessionSnapshot) |
| ------------------ | ----------------------------- | -------------------------------- |
| **Subscription**   | Yes (useSyncExternalStore)    | No (one-time read)               |
| **Updates**        | Real-time when state changes  | Only call result                 |
| **Suspense**       | Safe                          | Not safe                         |
| **Use case**       | Route guards, conditionals    | App initialization               |
| **Call in render** | ✅ Safe                       | ❌ Unsafe                        |
| **Performance**    | Minimal (reuses subscription) | One-time cost                    |

## Session Lifecycle with Cache Invalidation

### Auth State Changes (Sign In / Sign Out)

```
User clicks "Sign In" → useSignIn.mutate(email, password)
    ↓
appAuthService.signIn() executes
    ↓
Firebase Auth validates credentials
    ↓
Service emits new AuthSession
    ↓
useAuthSession() subscribers notified (reactive update)
    ↓
Cache invalidation triggered: authQueryKeys.all (everything clears)
    ↓
Next query (e.g., useCurrentUser) refetches from fresh data
```

**Why invalidate everything**?

- User identity changed (from "not authenticated" to "authenticated Bob")
- All previous cache entries are now stale or invalid
- New user has different permissions, data, etc.

### Profile Updates (Name, Photo)

```
User edits name → useUpdateUserProfile.mutate({ name: "Alice" })
    ↓
appAuthService.updateUserProfile() executes
    ↓
Firestore updates AppUser document
    ↓
Service returns updated AppUser
    ↓
Cache invalidation triggered:
  - authQueryKeys.currentUser() (my profile changed)
  - authQueryKeys.userDetail(userId) (specific user detail changed)
    ↓
Only those caches clear; other users unaffected
```

**Why targeted invalidation**?

- Only this user's data changed
- Other users' cache is still fresh
- Performance: don't clear unnecessary caches

### User Roster Changes (Invite, Delete, Restore)

```
Admin invites user → useInviteUser.mutate({ email, role })
    ↓
appAuthService.inviteUser() executes
    ↓
Firestore creates new AppUser (invited status)
    ↓
Service returns new AppUser
    ↓
Cache invalidation triggered:
  - authQueryKeys.usersList() (roster changed)
  - authQueryKeys.userSearch() (search results changed)
    ↓
User detail caches (useGetUserById for other users) remain valid
```

**Why this strategy**?

- Roster snapshot changed
- Individual user detail snapshots are still accurate
- Search filters need refresh
- Targeted invalidation is efficient

## Synchronous vs Async Hooks

### Synchronous (Non-Reactive, Non-Suspending)

These hooks read state without subscribing:

- `useGetSessionSnapshot()` — One-time session read
- `useIsSignupComplete()` — Check if signup completed
- `useGetLastAuthError()` — Get last recorded error

**When to use**: Initialization, one-time checks  
**Behavior**: Return immediately, never suspend, may throw  
**Suspense-safe**: No

**Why intentional**?

- Session state needed during app initialization before Suspense boundaries exist
- Bootstrap checks happen before React render
- Performance: zero subscription overhead

### Asynchronous (Suspense-Based)

All query hooks suspend and throw:

- `useCurrentUser()`, `useListUsers()`, etc.
- `useIsOwnerBootstrapped()`, `useIsSignupAllowed()`

**When to use**: Render-time data fetching  
**Behavior**: Suspend on load, throw on error  
**Suspense-safe**: Yes

**Why different from sync hooks**?

- Most auth checks happen during render (inside `<Suspense>`)
- Suspense provides better UX than manual loading states
- Error boundaries handle exceptions cleanly

## Design Principles

### 1. Service Semantics Are Sacred

Every hook preserves service behavior exactly. If service changes, hooks adapt. If hook differs from service, it's a bug.

### 2. React Query Cache Discipline

Caches are invalidated based on semantic meaning:

- Session-lifecycle mutations → invalidate all
- Profile mutations → invalidate current user + detail
- Roster mutations → invalidate lists + searches

This discipline ensures consistency and performance.

### 3. Null is State, Not Error

```tsx
// Null = not authenticated (normal)
const { data: user } = useCurrentUser();
if (!user) return <LoginPrompt />;

// Error = exception (abnormal)
try {
  // ...
} catch (error) {
  return <ErrorScreen error={error} />;
}
```

### 4. Suspense + Error Boundaries, Not Manual Loading

```tsx
// ✅ Correct: Let Suspense and error boundaries handle it
<ErrorBoundary>
  <Suspense fallback={<Spinner />}>
    <UserComponent />
  </Suspense>
</ErrorBoundary>;

// ❌ Wrong: Manual loading state management
const { data, isPending, error } = useCurrentUser(); // ← useSuspenseQuery, not available
if (isPending) return <Spinner />;
if (error) return <Error />;
```

## Summary

app-auth-hooks is a **pure React Query wrapper** around a frozen service. It:

✅ Preserves service semantics exactly  
✅ Manages Suspense and error boundaries  
✅ Handles cache invalidation intelligently  
✅ Exports Zod schemas for validation  
✅ Documents all service capabilities  
✅ Frozen for years (v1 locked)

No new hooks. No new logic. No refactoring. Only documentation changes allowed.
