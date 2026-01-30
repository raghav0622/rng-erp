# Frozen v1 Status (Final)

**Status**: ✅ LOCKED (PERMANENT)  
**Release Date**: January 30, 2026  
**Contract**: Immutable

## What is Frozen

The following are **locked for production stability**:

✅ **Public API**: All hooks in `index.ts` exported  
✅ **Hook signatures**: Parameters and return types  
✅ **Cache strategy**: Invalidation patterns and keys  
✅ **Runtime behavior**: All hooks function exactly as documented  
✅ **Error types**: All `AppAuthError` subclasses  
✅ **Service contract**: 1:1 delegation to app-auth-service

## What is NOT Frozen

Only documentation and comments may change:

📝 **Documentation files** — README, guides, explanations  
📝 **Inline comments** — Clarity comments in code  
📝 **JSDoc** — Enhanced documentation strings

**No runtime code changes are permitted.**

## Change Policy

### For This Version (v1)

| Change Type                     | Allowed? | Details            |
| ------------------------------- | -------- | ------------------ |
| New hooks                       | ❌ No    | Would require v2.0 |
| New parameters                  | ❌ No    | Would require v2.0 |
| New return types                | ❌ No    | Would require v2.0 |
| Signature changes               | ❌ No    | Would require v2.0 |
| New cache keys                  | ❌ No    | Would require v2.0 |
| Invalidation pattern changes    | ❌ No    | Would require v2.0 |
| New error types                 | ❌ No    | Would require v2.0 |
| Documentation additions         | ✅ Yes   | Allowed always     |
| Comment clarifications          | ✅ Yes   | Allowed always     |
| JSDoc improvements              | ✅ Yes   | Allowed always     |
| Bug fixes (behavior-preserving) | ✅ Yes   | Internal only      |

## Public API Surface

All public exports from [index.ts](./index.ts):

### Session & Auth State (4)

- `useAuthSession`
- `useGetSessionSnapshot`
- `useRequireAuthenticated`
- `useGetLastAuthError`
- `useGetLastSessionTransitionError`

### User Queries (7)

- `useCurrentUser`
- `useGetUserById`
- `useGetUserByEmail`
- `useListUsers`
- `useSearchUsers`
- `useListUsersPaginated`
- `useListOrphanedUsers`

### Bootstrap Queries (3)

- `useIsOwnerBootstrapped`
- `useIsSignupAllowed`
- `useIsSignupComplete`

### Auth Mutations (8)

- `useOwnerSignUp`
- `useSignIn`
- `useSignOut`
- `useSendPasswordResetEmail`
- `useConfirmPasswordReset`
- `useChangePassword`
- `useSendEmailVerification`
- `useConfirmPassword`

### User Management Mutations (12)

- `useInviteUser`
- `useDeleteUser`
- `useRestoreUser`
- `useReactivateUser`
- `useUpdateUserProfile`
- `useUpdateUserRole`
- `useUpdateUserStatus`
- `useUpdateUserPhoto`
- `useUpdateOwnerProfile`
- `useResendInvite`
- `useRevokeInvite`
- `useCleanupOrphanedLinkedUser`

### Cache Keys (1 export)

- `authQueryKeys`

### Schemas (21+)

- `ownerSignUpSchema`
- `signInSchema`
- `changePasswordSchema`
- `confirmPasswordSchema`
- `confirmPasswordResetSchema`
- `sendPasswordResetEmailSchema`
- `sendEmailVerificationSchema`
- `inviteUserSchema`
- `updateUserRoleSchema`
- `updateUserStatusSchema`
- `updateUserPhotoSchema`
- `updateUserProfileSchema`
- `searchUsersSchema`
- And more...

### Types & Errors

- `AuthSession`
- `AuthSessionState`
- `AppAuthError` (and all subclasses)
- All exported from app-auth-service

### Role Facades (5)

- `useAuthActions`
- `useOwnerActions`
- `useManagerActions`
- `useEmployeeActions`
- `useClientActions`

## Documentation Files (Created)

| File                                                       | Purpose                              |
| ---------------------------------------------------------- | ------------------------------------ |
| [README.md](./README.md)                                   | Overview, rules, and patterns        |
| [AUTH_HOOKS_MODEL.md](./AUTH_HOOKS_MODEL.md)               | Mental model and concepts            |
| [RETURN_SEMANTICS.md](./RETURN_SEMANTICS.md)               | Null vs error handling (v1 updated)  |
| [CACHING_STRATEGY.md](./CACHING_STRATEGY.md)               | Cache key hierarchy and invalidation |
| [ROLE_ACTIONS.md](./ROLE_ACTIONS.md)                       | Role-grouped facades                 |
| [CLIENT_SIDE_LIMITATIONS.md](./CLIENT_SIDE_LIMITATIONS.md) | Architectural constraints            |
| [FROZEN_V1.md](./FROZEN_V1.md)                             | This file — versioning policy        |

## Migration / Future

**If requirements change**, a v2.0 would be required:

- New server-side components (Admin SDK integration)
- Multi-tab support
- Global session revocation
- Atomic cross-service transactions
- High-volume provisioning

**Current v1 remains unchanged.**

## Validation Checklist

Before freezing, verify:

✅ Every public hook in `index.ts` is documented somewhere  
✅ Every service capability has a hook  
✅ No hook exposes undocumented behavior  
✅ No service method is missing a hook  
✅ All cache strategies are documented  
✅ All error types are documented  
✅ All limitations are documented  
✅ Code compiles without warnings  
✅ All types are correct  
✅ No runtime behavior changes

**All checks passed. ✅**

## How to Use This Frozen Layer

1. **Read [README.md](./README.md)** — Start here for overview
2. **Read [AUTH_HOOKS_MODEL.md](./AUTH_HOOKS_MODEL.md)** — Understand mental model
3. **Reference [CACHING_STRATEGY.md](./CACHING_STRATEGY.md)** — When building mutations
4. **Check [CLIENT_SIDE_LIMITATIONS.md](./CLIENT_SIDE_LIMITATIONS.md)** — Understand constraints
5. **Use [RETURN_SEMANTICS.md](./RETURN_SEMANTICS.md)** — Handle null correctly
6. **Consult [ROLE_ACTIONS.md](./ROLE_ACTIONS.md)** — Organize by role

## Support & Maintenance

**Stability guarantee**: This layer is locked and stable for years.

**No breaking changes** in v1.

**Documentation improvements** always welcome (doesn't require approval).

**Bug reports** welcome (must preserve behavior).

**Feature requests** require v2.0 (new hooks = major version).

## Final Statement

app-auth-hooks v1 is **production-ready**, **locked for stability**, and **designed to never break**.

Use it with confidence.

No surprises. No hidden changes. No deprecated functions.

This is the final, authoritative hooks layer for app-auth-service.

---

**Frozen since**: January 30, 2026  
**Expected stability**: Years (multi-year production support)  
**Change policy**: Documentation only (no runtime changes)  
**Versioning**: v1.0.0 (locked)
