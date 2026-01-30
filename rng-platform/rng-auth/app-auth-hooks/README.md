# app-auth-hooks (Frozen v1)

**Status**: ✅ LOCKED (FINAL)  
**Type**: Client-side React Query hooks layer  
**Stability**: Production-ready, multi-year support

## Purpose

app-auth-hooks is the **ONLY** bridge between UI components and the auth service layer. It provides:

- 100% functional coverage of `app-auth-service` via React Query hooks
- Type-safe mutations with Zod validation schemas
- Suspense-compatible async queries
- Automatic cache invalidation aligned with auth semantics
- Frozen contract: zero runtime changes, only documentation allowed

## Core Rules

### Rule 1: UI Must Never Import Service Directly

```tsx
// ❌ WRONG
import { appAuthService } from 'rng-platform/rng-auth/app-auth-service';

// ✅ CORRECT
import { useCurrentUser, useSignIn } from 'rng-platform/rng-auth';
```

### Rule 2: Null is NOT an Error

```tsx
const { data: user } = useCurrentUser();
if (user) {
  return <Dashboard user={user} />;
}
// user === null means "not authenticated" — normal state, not an error
return <LoginPrompt />;
```

See [RETURN_SEMANTICS.md](./RETURN_SEMANTICS.md) for comprehensive guidance.

### Rule 3: All Hooks Delegate Directly to Service

No additional logic. 1:1 mapping. Service changes require v2.0.

## What Problems This Layer Solves

### 1. Suspense Compatibility

- All query hooks use `useSuspenseQuery` (throws on error, suspends on load)
- Pair with `<Suspense>` and error boundaries, not manual loading states

### 2. React Query Cache Management

- Hierarchical cache keys for efficient invalidation
- Automatic invalidation patterns (session lifecycle vs targeted updates)
- Prevents stale data from different mutation contexts

### 3. Type-Safe Mutations

- Every mutation exports matching Zod schema
- UI forms validate before calling service
- No runtime type surprises

### 4. Session Lifecycle Semantics

- `useAuthSession()` uses `useSyncExternalStore` for reactive updates
- Session changes are observed immediately
- Compatible with Suspense boundaries

### 5. Clear API Surface

- All hooks exported from `index.ts`
- No internal implementation leaks
- Role-grouped facades for discoverability

## Tech Stack

- **React Query**: `useSuspenseQuery` for reads, `useMutation` for writes
- **Zod**: Schema validation (matching service inputs exactly)
- **Firebase Auth + Firestore**: Backend (client-side only)
- **useSyncExternalStore**: Session state management (React 18+)

## Session Access Patterns

### Reactive Session State

```tsx
import { useAuthSession } from 'rng-platform/rng-auth';

function AuthStatus() {
  const session = useAuthSession(); // Updates reactively
  if (session.state === 'authenticated' && session.user) {
    return <div>Hello, {session.user.name}</div>;
  }
  return <div>Not authenticated</div>;
}
```

**Use when**: You need real-time auth state (most common)  
**Behavior**: Updates reactively via `useSyncExternalStore`  
**Suspense-safe**: Yes

### One-Time Session Snapshot

```tsx
import { useGetSessionSnapshot } from 'rng-platform/rng-auth';

function InitializeApp() {
  const session = useGetSessionSnapshot(); // One-time read during init
  // WARNING: Not reactive. Only use during initialization.
  return initializeAppState(session);
}
```

**Use when**: You need session state once (e.g., during initialization)  
**Behavior**: Synchronous, non-reactive (intentional)  
**Suspense-safe**: No (may throw)  
**⚠️ WARNING**: Do not use in render loops

### Auth Guard (Protected Routes)

```tsx
import { useRequireAuthenticated } from 'rng-platform/rng-auth';

function ProtectedPage() {
  const user = useRequireAuthenticated(); // Throws if not authenticated
  return <Dashboard user={user} />;
}
```

**Use when**: Route or component requires authentication  
**Behavior**: Throws `NotAuthenticatedError` if not authenticated  
**Suspense-safe**: No (throws exception)  
**Error boundary**: Required

## Query Hooks (All Suspense-Based)

All query hooks suspend on load and throw errors directly:

| Hook                                 | Parameters            | Returns                | Cache Key                                   |
| ------------------------------------ | --------------------- | ---------------------- | ------------------------------------------- |
| `useCurrentUser()`                   | none                  | `AppUser \| null`      | `authQueryKeys.currentUser()`               |
| `useGetUserById(id)`                 | `userId`              | `AppUser \| null`      | `authQueryKeys.userDetail(id)`              |
| `useGetUserByEmail(email)`           | `email`               | `AppUser \| null`      | `authQueryKeys.userByEmail(email)`          |
| `useListUsers()`                     | none                  | `AppUser[]`            | `authQueryKeys.usersList()`                 |
| `useSearchUsers(query)`              | `Partial<AppUser>`    | `AppUser[]`            | `authQueryKeys.userSearch(query)`           |
| `useListUsersPaginated(size, token)` | `pageSize, pageToken` | `{ users, nextToken }` | `authQueryKeys.usersPaginated(size, token)` |
| `useListOrphanedUsers()`             | none                  | `AppUser[]`            | `authQueryKeys.orphanedUsers()`             |
| `useIsOwnerBootstrapped()`           | none                  | `boolean`              | `authQueryKeys.isOwnerBootstrapped()`       |
| `useIsSignupAllowed()`               | none                  | `boolean`              | `authQueryKeys.isSignupAllowed()`           |

## Mutation Hooks (React Query)

All mutation hooks handle cache invalidation automatically:

```tsx
const mutation = useSomeAuthMutation();
mutation.mutate(data, {
  onSuccess: (result) => {
    /* auto-invalidation already applied */
  },
  onError: (error) => {
    /* typed AppAuthError */
  },
});
```

See [CACHING_STRATEGY.md](./CACHING_STRATEGY.md) for invalidation patterns.

## Schema Exports

Every mutation has a matching Zod schema:

```tsx
import {
  signInSchema,
  ownerSignUpSchema,
  inviteUserSchema,
  updateUserRoleSchema,
  // ... and more
} from 'rng-platform/rng-auth';
```

Use in forms for validation before mutation:

```tsx
<RNGForm validationSchema={signInSchema} onSubmit={(data) => signIn.mutate(data)} />
```

## Constraints (By Design)

| Constraint                         | Reason                                                                |
| ---------------------------------- | --------------------------------------------------------------------- |
| **Client-side only**               | No Admin SDK; Firebase security rules enforce RBAC                    |
| **No multi-tab support**           | Session state is in-memory; tabs are isolated                         |
| **No server enforcement**          | Designed for trusted single-instance usage                            |
| **No atomic transactions**         | Auth + Firestore mutations can fail independently                     |
| **Disabled users retain sessions** | Client-side cannot globally revoke; sessions clear on next auth check |

See [CLIENT_SIDE_LIMITATIONS.md](./CLIENT_SIDE_LIMITATIONS.md) for details.

## Versioning

**Current**: Frozen v1  
**Stability**: Locked for years  
**Changes**: Documentation and comments only  
**Breaking changes**: Require v2.0.0

## Files in This Layer

| File                            | Purpose                                                |
| ------------------------------- | ------------------------------------------------------ |
| `index.ts`                      | Public API, all exports                                |
| `keys.ts`                       | React Query cache key hierarchy                        |
| `useAuthSession.ts`             | Reactive session state                                 |
| `useAuthMutations.ts`           | Auth lifecycle mutations (sign in/out, password reset) |
| `useUserQueries.ts`             | User data queries                                      |
| `useUserManagementMutations.ts` | User lifecycle mutations (invite, delete, etc.)        |
| `useBootstrapQueries.ts`        | Bootstrap state queries                                |
| `useRequireAuthenticated.ts`    | Auth guard hook                                        |
| `useGetSessionSnapshot.ts`      | One-time session read                                  |
| `useRoleGroupedFacades.ts`      | Discoverability re-exports by role                     |
| `schemas.ts`                    | Zod validation schemas                                 |
| `types.ts`                      | Hook-layer types (mostly re-exports)                   |
| `errors.ts`                     | Error type re-exports                                  |
| `internal/authService.ts`       | Service singleton re-export (testability)              |

## Documentation Files

- [README.md](./README.md) — This file (overview and rules)
- [AUTH_HOOKS_MODEL.md](./AUTH_HOOKS_MODEL.md) — Mental model and concepts
- [RETURN_SEMANTICS.md](./RETURN_SEMANTICS.md) — Null vs error handling
- [CACHING_STRATEGY.md](./CACHING_STRATEGY.md) — Cache key hierarchy and invalidation
- [ROLE_ACTIONS.md](./ROLE_ACTIONS.md) — Role-grouped facades
- [CLIENT_SIDE_LIMITATIONS.md](./CLIENT_SIDE_LIMITATIONS.md) — Design constraints and trade-offs

## Next Steps for Integrators

1. Read this README
2. Review [AUTH_HOOKS_MODEL.md](./AUTH_HOOKS_MODEL.md) to understand mental model
3. Reference [RETURN_SEMANTICS.md](./RETURN_SEMANTICS.md) for null handling patterns
4. Check [CACHING_STRATEGY.md](./CACHING_STRATEGY.md) when implementing mutations
5. Review [CLIENT_SIDE_LIMITATIONS.md](./CLIENT_SIDE_LIMITATIONS.md) for architectural constraints

## Status

✅ Frozen v1 — Production-ready, locked for stability  
✅ All public hooks documented  
✅ 100% coverage of service layer  
✅ Suspense and error handling patterns established  
✅ Cache strategy formalized
