<!-- Copilot / AI agent guidance for contributors and automation -->

# Copilot instructions — rng-erp

This file contains focused, actionable guidance for AI coding agents working in this repository.

## Big Picture Architecture

This is a **Next.js 16 (App Router)** ERP frontend app with three architectural pillars:

1. **`rng-forms/`** — Schema-driven form UI engine (Mantine + React Hook Form + Zod). UI-only layer; no data access, no business logic.
2. **`rng-repository/`** — Frozen v1 client-safe Firestore repository contract. Mechanical data access layer with optimistic locking, soft deletes, retry logic, and diagnostic hooks.
3. **`rng-platform/rng-auth/`** — Client-side authentication service (`AppAuthService`) integrating Firebase Auth with Firestore-backed AppUser projection. Invariant-driven, race-resilient, resource-safe.

**Critical separation of concerns**: Keep business logic and side effects in service layers (`rng-platform/rng-auth/app-auth-service/`, hooks, or future `rng-firebase/`). Forms are pure UI composition. Repository is mechanical CRUD. Auth service enforces ERP-specific invariants.

## Key Directories

- **`rng-forms/`** — Form DSL, UI registry, field components, form runtime. See [rng-forms/RNGForm.tsx](../rng-forms/RNGForm.tsx), [rng-forms/dsl/factory.ts](../rng-forms/dsl/factory.ts), [rng-forms/core/Registry.tsx](../rng-forms/core/Registry.tsx), and [rng-forms/README.md](../rng-forms/README.md).
- **`rng-repository/`** — Frozen v1 contract. Read [rng-repository/README.md](../rng-repository/README.md) before changing. Public API is immutable; only internal optimizations allowed.
- **`rng-platform/rng-auth/`** — Client-side auth service + React Query hooks. **UI must use hooks from [app-auth-hooks/](../rng-platform/rng-auth/app-auth-hooks/), never call service directly**. See [app-auth-service/README.md](../rng-platform/rng-auth/app-auth-service/README.md) and [app-auth-service/AUTH_MODEL.md](../rng-platform/rng-auth/app-auth-service/AUTH_MODEL.md) for auth model and guarantees.
- **`lib/`** — App-level utilities: [lib/env.ts](../lib/env.ts) (environment schema), [lib/firebase-client.ts](../lib/firebase-client.ts) (Firebase client bootstrap), [lib/logger.ts](../lib/logger.ts) (global logger).
- **`app/`**, **`rng-ui/`** — Next.js App Router entry points and shared UI patterns (Mantine components, branding, layouts).
- **`theme/`** — Mantine theme configuration in [theme/index.ts](../theme/index.ts).

## Architectural Constraints & Conventions

- **Zod is canonical validation**: All form validation originates from Zod schemas. Field-level props map to React Hook Form rules for quick guards. Async validation uses [rng-forms/hooks/useAsyncValidation.ts](../rng-forms/hooks/useAsyncValidation.ts). Cross-field validation uses [rng-forms/hooks/useCrossFieldValidation.ts](../rng-forms/hooks/useCrossFieldValidation.ts).
- **Forms are UI-only**: Do not add data fetching, side effects, or business logic inside field components. Use service hooks (e.g., `rng-platform/rng-auth/`) for fetching/persistence. Taxonomy input is the only exception (see [rng-forms/components/inputs/TaxonomyInput.tsx](../rng-forms/components/inputs/TaxonomyInput.tsx)).
- **Registry pattern**: New field components must be added to [rng-forms/core/Registry.tsx](../rng-forms/core/Registry.tsx) (lazy-load with `React.lazy`) and exposed via DSL ([rng-forms/dsl/factory.ts](../rng-forms/dsl/factory.ts)) when needed. Each component maps to a discriminated `type` in the schema.
- **Repository is frozen**: [rng-repository/](../rng-repository/) is a v1 immutable contract. Do not change public surface, error types, or behavior without human approval. Only non-breaking internal fixes allowed. See [rng-repository/README.md](../rng-repository/README.md) for freeze rules.
- **Auth service is client-only by policy**: [rng-platform/rng-auth/app-auth-service/](../rng-platform/rng-auth/app-auth-service/) is intentionally client-side (no Admin SDK). Invariant checks, race detection, and rollback logic are explicit policy decisions. See [app-auth-service/README.md](../rng-platform/rng-auth/app-auth-service/README.md) for guarantees and non-guarantees.
- **Mantine UI + Tabler Icons**: All UI uses [@mantine/core](https://mantine.dev) components. Icons from [@tabler/icons-react](https://tabler.io/icons). Theme in [theme/index.ts](../theme/index.ts). Notifications via `@mantine/notifications`.
- **React 19 + Next 16**: Using App Router (not Pages Router). Client components marked with `'use client'`. Server Actions intentionally disabled (commented in [next.config.ts](../next.config.ts)).
- **TypeScript strict mode**: [tsconfig.json](../tsconfig.json) enforces `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`. Path mappings: `@/*` → workspace root, `rng-repository` → `./rng-repository/index.ts`.

## Testing & CI Workflows

- **Unit tests**: Vitest configured in [vitest.config.ts](../vitest.config.ts). Default test script: `npm run test` (maps to `vitest run --project unit`). Unit tests currently target `rng-firebase/**/*.spec.ts` (not yet created; placeholder in config).
- **Storybook tests**: Run under `storybook` vitest project (Playwright + Storybook addon). Start Storybook: `npm run storybook`. Build: `npm run build-storybook`. Stories in [rng-forms/stories/](../rng-forms/stories/).
- **Test environment**: Unit tests use `jsdom` environment. Mock Firebase env vars set in [vitest.config.ts](../vitest.config.ts) under `test.env`. Add new env vars to [lib/env.ts](../lib/env.ts) and sync with [vitest.config.ts](../vitest.config.ts).
- **Example individual test command**: `npx vitest run rng-firebase/adapters/adapter-error-mapping.spec.ts` (placeholder for future tests).

## Dev Commands (Copyable)

```bash
npm run dev          # Start Next.js dev server
npm run build        # Build Next.js app
npm run start        # Start production server
npm run storybook    # Start Storybook
npm run test         # Run vitest unit tests
npm run lint         # Run ESLint
```

## Environment Configuration

- **Schema**: [lib/env.ts](../lib/env.ts) uses `@t3-oss/env-nextjs` for runtime + client env validation (Zod-based).
- **Server vars**: `NODE_ENV`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `SESSION_COOKIE_NAME`, `SESSION_COOKIE_MAX_AGE_DAYS`.
- **Client vars**: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`.
- **Adding new env vars**: Update [lib/env.ts](../lib/env.ts) schema and [vitest.config.ts](../vitest.config.ts) test env values.

## Patterns to Follow When Modifying Forms

1. **Create component**: Add UI component under `rng-forms/components/inputs/`, `rng-forms/components/layouts/`, or `rng-forms/components/special/`.
2. **Register component**: Add lazy-loaded entry to [rng-forms/core/Registry.tsx](../rng-forms/core/Registry.tsx) with discriminated `type` matching schema.
3. **Expose via DSL**: Add builder helper to [rng-forms/dsl/factory.ts](../rng-forms/dsl/factory.ts). If reusable, add template to [rng-forms/dsl/templates.ts](../rng-forms/dsl/templates.ts).
4. **Write story**: Create Storybook story in [rng-forms/stories/](../rng-forms/stories/) using `makeRNGFormStory` helper from [rng-forms/stories/\_shared/story-helpers.tsx](../rng-forms/stories/_shared/story-helpers.tsx).
5. **Update docs**: Add to [rng-forms/README.md](../rng-forms/README.md) if new field type or DSL surface change.
6. **Test**: Run `npm run test` and `npm run storybook` to verify.

## When Editing `rng-repository`

- **Read freeze rules first**: [rng-repository/README.md](../rng-repository/README.md) — module is v1 frozen. Public API is immutable.
- **Allowed**: Internal optimizations that preserve behavior. Bug fixes aligning implementation with contract.
- **Forbidden**: New public methods, signature changes, error type changes, dependency changes. Any breaking change requires v2.0.0.
- **Contract tests**: Any change must pass tests in [rng-repository/tests/contract/](../rng-repository/tests/contract/) (if present).

## When Working with Auth Service

- **USE HOOKS, NOT SERVICE DIRECTLY**: UI components must use React Query hooks from [app-auth-hooks/](../rng-platform/rng-auth/app-auth-hooks/) instead of calling `appAuthService` directly. The service is for internal use only.
- **Read model first**: [rng-platform/rng-auth/app-auth-service/AUTH_MODEL.md](../rng-platform/rng-auth/app-auth-service/AUTH_MODEL.md) — canonical auth model.
- **Service contract**: [rng-platform/rng-auth/app-auth-service/app-auth.contracts.ts](../rng-platform/rng-auth/app-auth-service/app-auth.contracts.ts) defines `IAppAuthService`.
- **Hooks are frozen v1**: Every public service method has exactly one corresponding hook with identical semantics. Do not add logic to hooks; they delegate only.
- **Hook categories**: Session hooks (`useAuthSession`, `useRequireAuth`), query hooks (`useCurrentUser`, `useListUsers`, etc.), mutation hooks (`useSignIn`, `useInviteUser`, etc.).
- **Error types**: Custom error classes in [rng-platform/rng-auth/app-auth-service/app-auth.errors.ts](../rng-platform/rng-auth/app-auth-service/app-auth.errors.ts). Map Firebase errors with `mapFirebaseAuthError`.
- **Invariants**: User invariants in [rng-platform/rng-auth/app-auth-service/internal-app-user-service/app-user.invariants.ts](../rng-platform/rng-auth/app-auth-service/internal-app-user-service/app-user.invariants.ts).
- **Session state**: Observable via `useAuthSession()` (not React Query). Use `useRequireAuth()` for auth guards that throw.
- **Query keys**: Use `authQueryKeys` from [app-auth-hooks/keys.ts](../rng-platform/rng-auth/app-auth-hooks/keys.ts) for cache invalidation.

## Auth Hook Patterns

### Session Access

```tsx
import { useAuthSession, useRequireAuth } from 'rng-platform/rng-auth';

// Reactive session state (useSyncExternalStore)
function UserAvatar() {
  const session = useAuthSession();
  if (session.state === 'authenticated' && session.user) {
    return <Avatar name={session.user.name} />;
  }
  return <LoginButton />;
}

// Auth guard (throws NotAuthenticatedError)
function ProtectedPage() {
  const user = useRequireAuth(); // Throws if not authenticated
  return <Dashboard user={user} />;
}
```

### Queries (Suspense)

```tsx
import { useCurrentUser, useListUsers } from 'rng-platform/rng-auth';

function ProfilePage() {
  const { data: user } = useCurrentUser(); // useSuspenseQuery
  const { data: users } = useListUsers();
  return <UserProfile user={user} allUsers={users} />;
}
```

### Mutations

```tsx
import { useSignIn, useInviteUser } from 'rng-platform/rng-auth';

function LoginForm() {
  const signIn = useSignIn({
    onSuccess: () => navigate('/dashboard'),
    onError: (error) => showNotification(error.message),
  });

  return <form onSubmit={(data) => signIn.mutate(data)}>...</form>;
}

function InviteUserButton() {
  const inviteUser = useInviteUser();
  return <Button onClick={() => inviteUser.mutate({ email, role: 'employee' })} />;
}
```

## When Working with Auth Hooks

- **Hooks are the ONLY bridge to app-auth-service**: UI must never import `appAuthService` directly. All auth access goes through [rng-platform/rng-auth/app-auth-hooks/](../rng-platform/rng-auth/app-auth-hooks/).
- **Session hook**: `useAuthSession()` uses `useSyncExternalStore` to mirror `appAuthService.onAuthStateChanged()`. Safe for Suspense. Returns `AuthSession` directly (no projection).
- **Protected routes**: `useRequireAuthenticated()` throws `NotAuthenticatedError` if not authenticated. Use in route guards and layouts.
- **Null vs error semantics**: Read [RETURN_SEMANTICS.md](../rng-platform/rng-auth/app-auth-hooks/RETURN_SEMANTICS.md) to understand why null is NOT an error. Always treat null as "not authenticated" state, not as an exception. Use Suspense for loading, error boundaries for actual errors only.
- **Read hooks use `useSuspenseQuery`**: All user queries (`useCurrentUser`, `useGetUserById`, `useListUsers`, `useIsOwnerBootstrapped`, etc.) suspend until data loads. Throws service errors directly—no remapping.
- **Write hooks use `useMutation`**: All mutations (`useSignIn`, `useInviteUser`, `useUpdateUserRole`, etc.) invalidate targeted query keys on success. Auth lifecycle mutations (signIn/signOut) invalidate all auth queries. Profile mutations invalidate only affected user queries.
- **Zod schemas**: Every hook with user input exports a Zod schema that EXACTLY matches the service method input shape. Use these in forms: `ownerSignUpSchema`, `inviteUserSchema`, `updateUserRoleSchema`, etc. No UI-only fields, no defaults.
- **Photo handling**: Hooks accept `File` or base64 string and pass directly to service. Photo lifecycle is fully owned by `app-auth-service`.
- **Cache keys**: Use `authQueryKeys` from [app-auth-hooks/keys.ts](../rng-platform/rng-auth/app-auth-hooks/keys.ts) for cache management. Hierarchical structure: `authQueryKeys.users()`, `authQueryKeys.userDetail(id)`, `authQueryKeys.session()`, etc.
- **Role-grouped facades** (`useAuthActions`, `useOwnerActions`, `useManagerActions`, `useEmployeeActions`, `useClientActions`): Pure re-exports for discoverability. No logic added; authorization stays in service.
- **Error handling**: Hooks surface `AppAuthError` subclasses directly via React Query `useErrorHandler()` or error boundaries. No translation. Error types: `InvalidCredentialsError`, `NotAuthenticatedError`, `TooManyRequestsError`, `OwnerBootstrapRaceDetectedError`, etc.

## Auth Hook Patterns (Code Examples)

### Session Access

```tsx
import { useAuthSession, useRequireAuthenticated } from 'rng-platform/rng-auth';

// Reactive session state
function UserProfile() {
  const session = useAuthSession();
  if (session.state === 'authenticated' && session.user) {
    return <div>Hello, {session.user.name}</div>;
  }
  return <div>Not authenticated</div>;
}

// Auth guard (throws NotAuthenticatedError)
function ProtectedPage() {
  const user = useRequireAuthenticated();
  return <Dashboard user={user} />;
}
```

### Queries (Suspense)

```tsx
import { useCurrentUser, useListUsers } from 'rng-platform/rng-auth';

function UsersPage() {
  // Suspends until user data loads, throws on error
  const { data: currentUser } = useCurrentUser();
  const { data: allUsers } = useListUsers();

  return <UsersList current={currentUser} all={allUsers} />;
}
```

### Mutations

```tsx
import { useSignIn, useInviteUser, useUpdateUserRole, inviteUserSchema } from 'rng-platform/rng-auth';

function LoginForm() {
  const signIn = useSignIn();

  return (
    <form onSubmit={(data) => signIn.mutate(data)}>
      {signIn.isPending && <Loader />}
      {signIn.error && <Error error={signIn.error} />}
      {/* form fields */}
    </form>
  );
}

function InviteUserForm() {
  const inviteUser = useInviteUser();
  const queryClient = useQueryClient();

  return (
    <RNGForm
      schema={...}
      validationSchema={inviteUserSchema}
      onSubmit={(data) => inviteUser.mutate(data, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: authQueryKeys.users() });
          showToast('User invited');
        },
      })}
    />
  );
}
```

## Data Flow Patterns

1. **Form submission**: `RNGForm` → `onSubmit` handler → service layer (e.g., `appAuthService.createUser()`) → `AbstractClientFirestoreRepository` → Firestore.
2. **Auth state**: Firebase Auth → `AppAuthService.handleAuthStateChanged` → session update → listener callbacks → UI re-render.
3. **Taxonomy fetching**: `TaxonomyInput` → `taxonomyService.find()` → Firestore query → UI render.
4. **Repository read**: Service hook → `repository.getById()` → cache check → Firestore read → DataLoader batch (if multiple) → process hooks → return entity.
5. **Repository write**: Service hook → `repository.create()/update()` → invariant checks → sanitization → compression/encryption (if configured) → Firestore write → hooks (afterCreate/afterUpdate) → return entity.

## Common Pitfalls

- **Do not use raw Firebase SDK in UI components**: Use service layers or repository abstractions.
- **Do not add business logic to form field components**: Keep them pure UI. Move logic to service hooks or validation schemas.
- **Do not mutate `rng-repository` public API**: It's frozen. Extend via hooks/config, not by changing the class.
- **Do not forget to lazy-load new form components**: Add to [rng-forms/core/Registry.tsx](../rng-forms/core/Registry.tsx) with `React.lazy`.
- **Do not skip `'use client'` directive**: All client-side React hooks require it in App Router.
- **Do not use `&&` in terminal commands**: PowerShell uses `;` for command chaining (see [vitest.config.ts](../vitest.config.ts) notes).

## PR & Patch Guidance for AI Agents

- **Prefer small, focused patches**: Single responsibility per change.
- **Run tests before submitting**: `npm run test` and `npm run build` must pass.
- **Update docs when needed**: [rng-forms/README.md](../rng-forms/README.md) for form changes, [rng-repository/README.md](../rng-repository/README.md) for repository notes (rare).
- **Do not change frozen modules**: `rng-repository` and `rng-platform/rng-auth/app-auth-service/` are frozen. Request human approval for any changes.
- **Respect TypeScript strict rules**: Fix all type errors. Do not use `any` or `@ts-ignore` without justification.
- **Use existing patterns**: Follow DSL builder pattern, registry pattern, service layer pattern. Do not introduce new architectural patterns without discussion.

## Questions & Iteration

If anything is unclear or you need more detailed examples (e.g., step-by-step guide for adding a new `taxonomy`-style input, or auth error handling patterns), ask for clarification on the specific section to expand.
