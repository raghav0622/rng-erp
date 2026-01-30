# Caching Strategy (Frozen v1)

**Status**: ✅ LOCKED (FINAL)  
**Purpose**: Explain React Query cache key hierarchy and invalidation strategy  
**Scope**: Describes current behavior only (no future plans)

## Cache Key Hierarchy

All cache keys are defined in [keys.ts](./keys.ts) with hierarchical structure:

```
authQueryKeys.all
├── authQueryKeys.session()
│   └── authQueryKeys.sessionSnapshot()
├── authQueryKeys.currentUser()
├── authQueryKeys.users()
│   ├── authQueryKeys.usersList()
│   ├── authQueryKeys.userDetail(userId)
│   ├── authQueryKeys.userByEmail(email)
│   ├── authQueryKeys.userSearch(query)
│   ├── authQueryKeys.usersPaginated(pageSize, pageToken)
│   └── authQueryKeys.orphanedUsers()
├── authQueryKeys.bootstrap()
│   ├── authQueryKeys.isOwnerBootstrapped()
│   ├── authQueryKeys.isSignupAllowed()
│   └── authQueryKeys.isSignupComplete()
└── authQueryKeys.lastAuthError()
```

**Hierarchy enables efficient invalidation**:

- Invalidate `users()` → clears all user-related caches
- Invalidate `userDetail(userId)` → clears only that user's detail

## Invalidation Patterns

### Pattern 1: Session Lifecycle (Sign In / Sign Out)

**Trigger**: `useSignIn()`, `useSignOut()`, `useOwnerSignUp()`

**Invalidates**: `authQueryKeys.all`

```tsx
const signIn = useSignIn();

signIn.mutate(credentials, {
  onSuccess: () => {
    // Automatic: queryClient.invalidateQueries({ queryKey: authQueryKeys.all })
  },
});
```

**Why everything**?

- User identity fundamentally changed
- From "not authenticated" to "authenticated as Bob"
- All previous data is now irrelevant or invalid
- New user has different permissions and cached queries

**What gets cleared**:

- Current user cache
- User lists and searches
- Bootstrap checks
- Session state
- All derived caches

### Pattern 2: Profile Updates

**Trigger**: `useUpdateUserProfile()`, `useUpdateUserPhoto()`, `useUpdateOwnerProfile()`

**Invalidates**: `authQueryKeys.currentUser()` + `authQueryKeys.userDetail(userId)`

```tsx
const updateProfile = useUpdateUserProfile();

updateProfile.mutate(profileData, {
  onSuccess: (updatedUser) => {
    // Automatic invalidation:
    // - authQueryKeys.currentUser()
    // - authQueryKeys.userDetail(updatedUser.id)
  },
});
```

**Why targeted**?

- Only this user's profile changed
- Other users' data is still fresh
- Searches still valid (user data didn't move collections)
- Lists still valid (no user added/removed)

**What gets cleared**:

- My current user profile
- That specific user's detail cache

**What stays cached**:

- Other users' details
- User lists
- Search results
- Bootstrap checks

### Pattern 3: User Role/Status Updates

**Trigger**: `useUpdateUserRole()`, `useUpdateUserStatus()`, `useRestoreUser()`, `useReactivateUser()`

**Invalidates**: `authQueryKeys.userDetail(userId)` + `authQueryKeys.currentUser()` (if self)

```tsx
const updateUserRole = useUpdateUserRole();

updateUserRole.mutate(
  { userId, role: 'manager' },
  {
    onSuccess: (updatedUser) => {
      // Automatic invalidation:
      // - authQueryKeys.userDetail(userId)
      // - authQueryKeys.currentUser() if userId is current user
    },
  },
);
```

**Why targeted**?

- Role/status change affects that user's detail
- If it's you, affects current user cache
- Doesn't affect lists (user still exists in same collection)
- Doesn't affect other users

### Pattern 4: User Invitation/Deletion/Restoration

**Trigger**: `useInviteUser()`, `useDeleteUser()`, `useRestoreUser()`, `useResendInvite()`, `useRevokeInvite()`

**Invalidates**: `authQueryKeys.usersList()` + `authQueryKeys.userSearch()`

```tsx
const inviteUser = useInviteUser();

inviteUser.mutate(
  { email, role },
  {
    onSuccess: (newUser) => {
      // Automatic invalidation:
      // - authQueryKeys.usersList()
      // - authQueryKeys.userSearch()
      // Note: NOT userDetail — we could show the new user's detail
    },
  },
);
```

**Why this strategy**?

- User roster changed (count, members)
- Searches should refresh (roster is different)
- Individual user details are still accurate
- Performance: don't clear unnecessary caches

### Pattern 5: Maintenance (Cleanup Orphaned Users)

**Trigger**: `useCleanupOrphanedLinkedUser()`

**Invalidates**: `authQueryKeys.orphanedUsers()` + `authQueryKeys.usersList()`

```tsx
const cleanup = useCleanupOrphanedLinkedUser();

cleanup.mutate(userId, {
  onSuccess: () => {
    // Automatic invalidation:
    // - authQueryKeys.orphanedUsers()
    // - authQueryKeys.usersList()
  },
});
```

**Why**?

- Orphaned user list changed
- User roster might change (depending on cleanup type)

### Pattern 6: Read-Only Side Effects (No Invalidation)

**Mutations that do NOT invalidate caches**:

- `useSendPasswordResetEmail()` — No data changed
- `useSendEmailVerification()` — No Firestore mutation
- `useConfirmPasswordReset()` — Firebase Auth only, not Firestore
- `useConfirmPassword()` — Verification only, no data changed

**Why?**

- No Firestore documents changed
- No cached queries are stale
- Pure Firebase Auth operations

## Cache Key Sizing

### useCurrentUser() Cache Key

```typescript
authQueryKeys.currentUser(); // Single, stable key
// Result: ["auth", "currentUser"]
```

- **Always the same**: One constant entry in cache
- **Updated by**: Sign in/out, profile updates
- **Cleared by**: Session lifecycle mutations
- **Performance**: Minimal (single entry for any authenticated user)

### useSearchUsers(query) Cache Key

```typescript
authQueryKeys.userSearch(JSON.stringify(query));
// Result: ["auth", "users", "search", "{...query object...}"]
```

- **Varies by query**: Different searches create different cache entries
- **Example queries**:
  - `{ role: 'manager' }` → separate cache
  - `{ email: 'alice@example.com' }` → separate cache
  - `{ role: 'manager', isDisabled: false }` → separate cache
- **Performance consideration**: Large objects create large keys
- **Acceptable for this app**: Private ERP, small datasets, admin-heavy usage

**Why it's okay**:

- Private ERP (no scaling concerns)
- Small user dataset (typically < 1000 users)
- Admin searches are diverse but limited (not thousands of unique queries)
- React Query can handle 100-200 cache entries easily

## Invalidation Algorithm

When invalidation happens:

```
mutation.onSuccess()
  ↓
Automatic: queryClient.invalidateQueries({ queryKey: INVALIDATION_KEY })
  ↓
React Query compares all cache keys to INVALIDATION_KEY
  ↓
Matches:
  - "auth"[all] → clears everything
  - "auth"/"users"[prefix] → clears all user-related
  - "auth"/"users"/"detail"/"user-123"[exact] → clears only that user
  ↓
Next render: useCurrentUser(), useListUsers() re-fetch from service
  ↓
Service fetches fresh data from Firestore
```

**Exact matching**:

```tsx
// This invalidates ONLY the exact key
invalidateQueries({ queryKey: authQueryKeys.userDetail(userId) });

// This invalidates the key AND all descendants
invalidateQueries({ queryKey: authQueryKeys.users() });

// This invalidates EVERYTHING
invalidateQueries({ queryKey: authQueryKeys.all });
```

## Cache Strategies by Use Case

### Use Case 1: User Signs In

```
User submits login form
  ↓ useSignIn.mutate(credentials)
  ↓ Service validates and returns AuthSession
  ↓ Invalidate: authQueryKeys.all
  ↓ Next query hook (useCurrentUser) refetches
  ↓ UI shows authenticated state
```

**Result**: User sees fresh data immediately

### Use Case 2: Owner Updates Manager's Role

```
Owner invokes useUpdateUserRole({ userId: "mgr-123", role: "employee" })
  ↓ Service updates Firestore
  ↓ Invalidate: userDetail("mgr-123") + currentUser (if self)
  ↓ Next render: useGetUserById("mgr-123") refetches
  ↓ UI shows updated role
  ↓ Other users' caches remain valid
```

**Result**: Only affected caches refresh; performance optimal

### Use Case 3: Admin Searches Users

```
First search: useSearchUsers({ role: "manager" })
  ↓ Fetches 15 managers
  ↓ Cache key: ["auth", "users", "search", "{\"role\":\"manager\"}"]
  ↓ Result cached

Second search: useSearchUsers({ role: "employee" })
  ↓ Different cache key: ["auth", "users", "search", "{\"role\":\"employee\"}"]
  ↓ Fetches 45 employees
  ↓ Both caches exist simultaneously

Back to first search: useSearchUsers({ role: "manager" })
  ↓ Same cache key → reuses 15 managers from cache
```

**Result**: Each query cached independently; re-renders reuse cache

## Manual Cache Control (Advanced)

If needed, UI can manually invalidate:

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { authQueryKeys } from 'rng-platform/rng-auth';

function AdminPanel() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: authQueryKeys.usersList() });
  };

  return <button onClick={handleRefresh}>Refresh Users</button>;
}
```

**When to use**:

- Polling scenarios
- Manual refresh buttons
- Rare cases where automatic invalidation misses

**Default**: Let mutations handle invalidation automatically

## Debugging Cache

To see current cache state:

```tsx
const queryClient = useQueryClient();
console.log(queryClient.getQueryData(authQueryKeys.currentUser()));
console.log(queryClient.getQueryCache().getAll());
```

**In React Query DevTools** (if installed):

- View all cache entries
- See when entries are invalidated
- Replay mutations

## Summary

✅ **Hierarchical cache keys** enable efficient invalidation  
✅ **Session lifecycle** invalidates everything (identity changed)  
✅ **Profile updates** invalidate only affected user  
✅ **Roster changes** invalidate lists and searches  
✅ **Read-only ops** don't invalidate (no data changed)  
✅ **Search keys are large but acceptable** for this ERP's constraints

**Design principle**: Invalidate based on semantic meaning, not arbitrary rules.
