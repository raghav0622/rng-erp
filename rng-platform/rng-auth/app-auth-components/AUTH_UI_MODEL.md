# Auth UI Mental Model

**Purpose**: Conceptual guide to understanding the app-auth-components architecture.

## Core Concepts

### 1. Three-Layer Architecture

```
┌─────────────────────────────────────┐
│   app-auth-components (UI Layer)    │  ← You are here
│   - AuthAppShell                    │
│   - Guards (RequireAuth, RequireRole) │
│   - Screens (SignIn, Bootstrap, etc.) │
│   - Pure UI composition             │
└──────────────┬──────────────────────┘
               │ uses hooks only
┌──────────────▼──────────────────────┐
│   app-auth-hooks (Query Layer)      │
│   - React Query wrappers            │
│   - Zod schemas                     │
│   - Cache invalidation              │
│   - Zero logic                      │
└──────────────┬──────────────────────┘
               │ delegates to service
┌──────────────▼──────────────────────┐
│   app-auth-service (Logic Layer)    │
│   - Business logic                  │
│   - Invariant checks                │
│   - Firebase Auth integration       │
│   - Firestore AppUser projection    │
└─────────────────────────────────────┘
```

### 2. Route-Based Auth Flow (AuthAppShell)

`AuthAppShell` monitors `AuthSession.state` and redirects to appropriate routes:

```typescript
type AuthSessionState =
  | 'unknown' // Initial load
  | 'authenticating' // Auth in progress
  | 'unauthenticated' // No user
  | 'authenticated'; // Valid session
```

**Flow**:

```
┌──────────┐
│ unknown  │ ──► redirect to /auth/loading
└────┬─────┘
     │ (session resolves)
     ├──► unauthenticated ──► redirect to /auth/signin
     │
     └──► authenticated ──► redirect to /dashboard
```

**Design**:

- AuthAppShell wraps your entire app (in root layout)
- It watches session state and redirects automatically
- Each route renders its own UI (loading screen, sign in screen, dashboard)
- No conditional rendering of components in the shell itself
- Eliminates all auth branching from routes

**Usage**:

```tsx
// app/layout.tsx
<AuthAppShell
  loadingRoute="/auth/loading"
  unauthenticatedRoute="/auth/signin"
  authenticatedRoute="/dashboard"
>
  {children}
</AuthAppShell>
```

### 3. Guards Are UI-Only

Guards (`RequireAuthenticated`, `RequireRole`) are **render-only** checks:

```tsx
<RequireRole allow={['owner']}>
  <AdminPanel />
</RequireRole>
```

**Critical**: Guards throw typed errors (caught by `AuthErrorBoundary`). They do NOT block API calls or enforce authorization. Backend/Firestore rules remain authoritative.

### 4. Typed Error Handling

All errors are `AppAuthError` with specific codes:

```typescript
interface AppAuthError {
  code:
    | 'auth/invalid-credentials'
    | 'auth/not-authenticated'
    | 'auth/not-authorized'
    | ...; // 15+ codes
  message: string; // User-friendly
}
```

**Flow**:

```
Component throws AppAuthError
        ↓
AuthErrorBoundary catches
        ↓
Maps code → user message
        ↓
Renders fallback
```

### 5. Schema-Driven Forms

All forms use existing Zod schemas from hooks:

```tsx
// Hook exports schema
export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// Screen uses schema
<RNGForm validationSchema={signInSchema} onSubmit={handleSubmit} />;
```

**Design**: No schema duplication. No UI-level validation logic. Single source of truth.

### 6. Session Lifecycle

```
┌──────────────────────────┐
│ User visits app          │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ AuthAppShell renders     │
│ State: unknown           │
│ Shows: loading overlay   │
└────────┬─────────────────┘
         │ useAuthSession()
         │ subscribes to service
         ▼
┌──────────────────────────┐
│ Service resolves session │
│ - Checks Firebase Auth   │
│ - Validates AppUser      │
│ - Checks invariants      │
└────────┬─────────────────┘
         │
         ├──► unauthenticated ──► Shows SignInScreen
         │
         └──► authenticated ──► Shows MainApp
                  │
                  │ User signs out
                  ▼
              unauthenticated ──► Shows SignInScreen
```

### 7. Role-Based Access (Phase-1)

**Phase-1 RBAC**: Single role per user (no assignments, no multi-role).

```typescript
type AppUserRole = 'owner' | 'manager' | 'employee' | 'client';
```

**UI Pattern**:

```tsx
// Guard by role
<RequireRole allow={['owner', 'manager']}>
  <TeamPanel />
</RequireRole>;

// Conditional rendering
const { data: user } = useCurrentUser();
if (user.role === 'owner') {
  return <OwnerDashboard />;
}
```

**Design**: No permission checks, no feature flags. Role is authoritative.

### 8. Error Recovery

Errors are **recoverable** via boundary reset:

```tsx
<AuthErrorBoundary fallback={(error, reset) => <ErrorPage error={error} onRetry={reset} />}>
  <App />
</AuthErrorBoundary>
```

**Flow**:

```
Component fails
    ↓
Boundary catches error
    ↓
User clicks "Try Again"
    ↓
Boundary calls reset()
    ↓
Component re-renders (fresh state)
```

### 9. Loading States

Three types of loading states:

| Type          | Component            | Use Case                            |
| ------------- | -------------------- | ----------------------------------- |
| **Full-page** | `AuthLoadingOverlay` | Auth resolution, screen transitions |
| **Inline**    | Mantine `Loader`     | Button states, small sections       |
| **Skeleton**  | Mantine `Skeleton`   | Content placeholders                |

**Pattern**:

```tsx
// Full-page
<AuthAppShell loading={<AuthLoadingOverlay />} ... />

// Inline
<Button loading={mutation.isPending}>Submit</Button>

// Skeleton (future)
<Skeleton height={200} />
```

### 10. Empty States

Empty states are **explicit**:

```tsx
<AuthEmptyState
  title="No users found"
  description="Try adjusting your filters"
  actionLabel="Clear Filters"
  onAction={handleClear}
/>
```

**Design**: No generic "No data" messages. Every empty state has clear next steps.

## Mental Model Summary

**Think of this module as a state machine:**

1. **AuthAppShell** routes based on session state
2. **Guards** validate state and throw on failure
3. **Screens** compose forms and handle mutations
4. **Boundaries** catch errors and provide recovery
5. **All logic lives in hooks/service** (UI is pure composition)

## Anti-Patterns

### ❌ Don't: Check Auth Manually

```tsx
// Wrong
const user = useCurrentUser();
if (!user) {
  return <SignInScreen />;
}
```

**✅ Do: Use AuthAppShell**

```tsx
<AuthAppShell unauthenticated={<SignInScreen />} authenticated={<App />} />
```

### ❌ Don't: Import Service Directly

```tsx
// Wrong
import { appAuthService } from '../app-auth-service';
```

**✅ Do: Use Hooks**

```tsx
import { useSignIn } from '../app-auth-hooks';
```

### ❌ Don't: Duplicate Schemas

```tsx
// Wrong
const mySignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

**✅ Do: Use Hook Schemas**

```tsx
import { signInSchema } from '../app-auth-hooks';
```

### ❌ Don't: Handle Errors Generically

```tsx
// Wrong
catch (error) {
  alert('Something went wrong');
}
```

**✅ Do: Surface Typed Errors**

```tsx
catch (error) {
  const appError = error as AppAuthError;
  setErrors([appError.message]); // User-friendly
}
```

---

**Status**: Conceptual guide (no code changes)  
**Audience**: Developers integrating app-auth-components
