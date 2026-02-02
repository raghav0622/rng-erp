# app-auth-components

**Status**: ✅ Production-Ready  
**Type**: Pure UI Composition Layer  
**Dependencies**: app-auth-hooks (frozen v1), rng-forms, Mantine UI

## Overview

Complete, plug-and-play authentication UI system for rng-erp. This module provides all necessary screens, guards, and components for authentication flows without requiring developers to touch `app-auth-service` or `app-auth-hooks` directly.

## Authentication Flows

There are **two signup flows** in this system:

1. **Owner Bootstrap** (`OwnerBootstrapScreen`)
   - First-time setup for the organization
   - Creates the owner account directly in Firebase Auth + Firestore
   - No invitation required
   - Can only happen once (checked via `isOwnerBootstrapped`)

2. **Sign Up With Invite** (`SignUpWithInviteScreen`)
   - For invited users (manager, employee, client)
   - User enters their **invited email** (must match an AppUser in Firestore with `inviteStatus='invited'`)
   - Creates Firebase Auth user and links `authUid` to existing AppUser document
   - Updates `inviteStatus` to 'activated' and sets `isRegisteredOnERP` to true
   - **No invite tokens/codes** - uses Firestore AppUser document as source of truth

**Key Point**: There is no separate "accept invite" flow with URL tokens. Invited users simply sign up using their email address, and the system matches it to the invited AppUser in Firestore.

## Quick Start

### 1. Wrap Your App with AuthAppShell

```tsx
// app/layout.tsx
import { AuthAppShell } from 'rng-platform/rng-auth/app-auth-components';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AuthAppShell
          loadingRoute="/auth/loading"
          unauthenticatedRoute="/auth/signin"
          authenticatedRoute="/dashboard"
        >
          {children}
        </AuthAppShell>
      </body>
    </html>
  );
}
```

### 2. Create Auth Routes

```tsx
// app/auth/loading/page.tsx
import { AuthLoadingOverlay } from 'rng-platform/rng-auth/app-auth-components';

export default function LoadingPage() {
  return <AuthLoadingOverlay message="Loading..." />;
}

// app/auth/signin/page.tsx
import { SignInScreen } from 'rng-platform/rng-auth/app-auth-components';

export default function SignInPage() {
  return <SignInScreen />;
}

// app/dashboard/page.tsx
export default function DashboardPage() {
  return <Dashboard />;
}
```

### 3. Protect Routes with Guards

```tsx
// app/dashboard/page.tsx
import { RequireAuthenticated } from 'rng-platform/rng-auth/app-auth-components';

export default function DashboardPage() {
  return (
    <RequireAuthenticated>
      <Dashboard />
    </RequireAuthenticated>
  );
}
```

### 4. Role-Based Access

```tsx
// app/admin/page.tsx
import { RequireRole } from 'rng-platform/rng-auth/app-auth-components';

export default function AdminPage() {
  return (
    <RequireRole allow={['owner', 'manager']}>
      <AdminPanel />
    </RequireRole>
  );
}
```

## Architecture

### Core Components

| Component                | Purpose                    | Uses                      |
| ------------------------ | -------------------------- | ------------------------- |
| **AuthAppShell**         | Route-based auth redirects | `useAuthSession`          |
| **RequireAuthenticated** | Auth guard                 | `useRequireAuthenticated` |
| **RequireRole**          | Role guard                 | `useRequireAuthenticated` |
| **AuthErrorBoundary**    | Typed error handling       | AppAuthError types        |
| **AuthLoadingOverlay**   | Loading states             | Mantine components        |
| **AuthEmptyState**       | Empty states               | Mantine components        |

### Auth Screens

All screens use `rng-forms` for form composition and schemas from `app-auth-hooks`:

| Screen                      | Hook                            | Schema                         | Purpose                   |
| --------------------------- | ------------------------------- | ------------------------------ | ------------------------- |
| **SignInScreen**            | `useSignIn`                     | `signInSchema`                 | Email/password sign in    |
| **OwnerBootstrapScreen**    | `useOwnerSignUp`                | `ownerSignUpSchema`            | First-time owner setup    |
| **SignUpWithInviteScreen**  | N/A (pending hook)              | `signUpWithInviteSchema`       | Invited user registration |
| **ForgotPasswordScreen**    | `useSendPasswordResetEmail`     | `sendPasswordResetEmailSchema` | Request reset email       |
| **ResetPasswordScreen**     | `useConfirmPasswordReset`       | `confirmPasswordResetSchema`   | Reset from email link     |
| **ChangePasswordScreen**    | `useChangePassword`             | `changePasswordSchema`         | Change password           |
| **EmailVerificationScreen** | `useSendEmailVerificationEmail` | N/A                            | Verify email address      |
| **UserListScreen**          | `useListUsers`                  | N/A                            | Browse team directory     |
| **InviteUserScreen**        | `useInviteUser`                 | `inviteUserSchema`             | Invite new team member    |
| **UserDetailScreen**        | `useGetUserById`                | N/A                            | View/manage user          |

**Note**: `SignUpWithInviteScreen` requires implementation of `useSignUpWithInvite` hook in `app-auth-hooks`. This hook should handle Firebase Auth user creation and linking to the existing invited AppUser document.

## Design Principles

### 1. Zero Business Logic

All business logic lives in `app-auth-service`. Components are pure UI composition that delegates to hooks.

**❌ Wrong:**

```tsx
// Don't check roles manually
if (user.role === 'owner') {
  // custom logic
}
```

**✅ Correct:**

```tsx
// Use guards
<RequireRole allow={['owner']}>
  <OwnerPanel />
</RequireRole>
```

### 2. No Direct Service Imports

**❌ Wrong:**

```tsx
import { appAuthService } from '../app-auth-service';
```

**✅ Correct:**

```tsx
import { useSignIn } from '../app-auth-hooks';
```

### 3. Typed Error Handling

All errors are typed `AppAuthError` with specific codes:

```tsx
try {
  await signIn.mutateAsync(values);
} catch (error) {
  const appError = error as AppAuthError;
  // appError.code is typed
  // appError.message is user-friendly
}
```

### 4. Schema-Driven Forms

All forms use existing Zod schemas from hooks:

```tsx
import { signInSchema } from '../app-auth-hooks';

<RNGForm
  schema={formSchema}
  validationSchema={signInSchema} // From hooks
  onSubmit={handleSubmit}
/>;
```

## Integration Patterns

### Pattern 1: Basic App Setup with Routes

```tsx
// app/layout.tsx
<AuthAppShell
  loadingRoute="/auth/loading"
  unauthenticatedRoute="/auth/signin"
  authenticatedRoute="/dashboard"
>
  {children}
</AuthAppShell>;

// app/auth/loading/page.tsx
export default function LoadingPage() {
  return <AuthLoadingOverlay message="Authenticating..." />;
}

// app/auth/signin/page.tsx
export default function SignInPage() {
  return <SignInScreen />;
}

// app/dashboard/page.tsx
export default function DashboardPage() {
  return <Dashboard />;
}
```

### Pattern 2: Custom Error Handling

```tsx
// app/layout.tsx
<AuthAppShell
  loadingRoute="/auth/loading"
  unauthenticatedRoute="/auth/signin"
  authenticatedRoute="/dashboard"
  fatalError={(error) => <CustomErrorPage error={error} />}
>
  {children}
</AuthAppShell>
```

### Pattern 3: Conditional Routing by Auth State

```tsx
// app/auth/signin/page.tsx
'use client';

import { useAuthSession } from 'rng-platform/rng-auth';
import { SignInScreen } from 'rng-platform/rng-auth/app-auth-components';
import { Alert } from '@mantine/core';

export default function SignInPage() {
  const session = useAuthSession();

  // Show custom error message for specific error codes
  if (session.lastAuthError?.code === 'auth/user-disabled') {
    return (
      <Alert color="red" title="Account Disabled">
        Your account has been disabled. Please contact your administrator.
      </Alert>
    );
  }

  return <SignInScreen />;
}
```

### Pattern 4: Role-Based Layouts

```tsx
function DashboardRouter() {
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
}
```

## Security Considerations

### Client-Side Enforcement Only

**Critical**: All guards and checks are client-side only. Backend/Firestore security rules must enforce the same logic.

### Non-Atomic Flows

Auth operations (sign in, sign up, password reset) are not atomic. Race conditions are detected but not prevented. See [SECURITY_UX_CONSTRAINTS.md](SECURITY_UX_CONSTRAINTS.md).

### Session Disablement

Disabling a user does **NOT** terminate existing sessions. Sessions remain valid until:

- Next auth resolution (navigation/refresh)
- 24-hour UX timeout
- User signs out

See [KNOWN_CLIENT_SIDE_LIMITATIONS.md](KNOWN_CLIENT_SIDE_LIMITATIONS.md).

## Error Handling

### Error Types

All components surface typed `AppAuthError`:

| Code                        | User Message              | Recovery                       |
| --------------------------- | ------------------------- | ------------------------------ |
| `auth/invalid-credentials`  | Invalid email or password | Retry with correct credentials |
| `auth/too-many-requests`    | Too many attempts         | Wait and retry                 |
| `auth/user-disabled`        | Account disabled          | Contact admin                  |
| `auth/session-expired`      | Session expired           | Sign in again                  |
| `auth/not-authenticated`    | Not signed in             | Redirect to sign in            |
| `auth/not-authorized`       | No permission             | Contact admin                  |
| `auth/owner-already-exists` | Owner exists              | Use existing account           |
| `auth/owner-bootstrap-race` | Concurrent setup          | Cleaned up, sign in            |

See [AuthErrorBoundary.tsx](boundaries/AuthErrorBoundary.tsx) for full mapping.

### Error Boundaries

Wrap your app with `AuthErrorBoundary` to catch all auth errors:

```tsx
<AuthErrorBoundary>
  <AuthAppShell ... />
</AuthErrorBoundary>
```

Or use custom fallback:

```tsx
<AuthErrorBoundary fallback={(error, reset) => <CustomError error={error} onRetry={reset} />}>
  <App />
</AuthErrorBoundary>
```

## Testing

### Unit Tests

Mock hooks (not service):

```tsx
import { useSignIn } from '../app-auth-hooks';

jest.mock('../app-auth-hooks', () => ({
  useSignIn: jest.fn(),
}));

test('sign in screen', () => {
  (useSignIn as jest.Mock).mockReturnValue({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  });

  render(<SignInScreen />);
  // assertions
});
```

### Integration Tests

Test with real hooks (use React Query test utils):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

render(<SignInScreen />, { wrapper: Wrapper });
```

## File Structure

```
app-auth-components/
├── shell/
│   └── AuthAppShell.tsx         # Core state-based router
├── guards/
│   ├── RequireAuthenticated.tsx # Auth guard
│   └── RequireRole.tsx          # Role guard
├── screens/
│   ├── SignInScreen.tsx         # Email/password sign in
│   ├── OwnerBootstrapScreen.tsx # First-time setup
│   ├── ForgotPasswordScreen.tsx # Request reset
│   ├── ResetPasswordScreen.tsx  # Reset from email
│   └── ChangePasswordScreen.tsx # Change password
├── boundaries/
│   ├── AuthErrorBoundary.tsx    # Typed error handling
│   ├── AuthLoadingOverlay.tsx   # Loading states
│   └── AuthEmptyState.tsx       # Empty states
├── components/                   # (Future: reusable blocks)
├── modals/                       # (Future: confirm dialogs)
├── hoc/                          # (Future: wrapper helpers)
├── index.ts                      # Public exports
└── README.md                     # This file
```

## Roadmap

### Phase 1 (Current) ✅

- Core shell and guards
- Auth screens (sign in, bootstrap, password flows)
- Error/loading/empty boundaries
- Documentation

### Phase 2 (Future)

- Profile screens (MyProfile, OwnerProfile)
- User management screens (Directory, Invite, Details)
- Confirm password modal
- User role editor
- User status manager

### Phase 3 (Future)

- HOCs (withAuthAppShell, withRoleGuard, withConfirmPassword)
- Advanced search and filtering
- Bulk user operations
- Audit logs UI

## Support

- **Integration Help**: See this README and [AUTH_UI_MODEL.md](AUTH_UI_MODEL.md)
- **Security Questions**: See [SECURITY_UX_CONSTRAINTS.md](SECURITY_UX_CONSTRAINTS.md)
- **Limitations**: See [KNOWN_CLIENT_SIDE_LIMITATIONS.md](KNOWN_CLIENT_SIDE_LIMITATIONS.md)
- **Auth Model**: See [../app-auth-service/AUTH_MODEL.md](../app-auth-service/AUTH_MODEL.md)
- **Hook Patterns**: See [../app-auth-hooks/README.md](../app-auth-hooks/README.md)

---

**Last Updated**: January 30, 2026  
**Status**: ✅ Production Ready (Phase 1)  
**Stability**: 🔒 Built on frozen v1 hooks/service
