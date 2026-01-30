import { InternalAuthError, NotAuthenticatedError } from './app-auth.errors';
import { AppUser } from './internal-app-user-service/app-user.contracts';

// Invariant: AppUser must exist when Firebase auth user exists
// Enforced during auth resolution to prevent orphaned auth users
// This is a 1:1 correspondence check, not a session validity check
export function assertAppUserExistsForAuthUser(
  authUserExists: boolean,
  appUser: AppUser | null,
): void {
  if (authUserExists && !appUser) {
    throw new InternalAuthError({
      message: 'Firebase Auth user exists but AppUser record not found in Firestore',
    });
  }
}

// Deprecated alias for backward compatibility (remove in next major version)
export const assertNoOrphanAuthUser = assertAppUserExistsForAuthUser;

export function assertAuthenticatedUser(user: AppUser | null | undefined): asserts user is AppUser {
  if (!user) throw new NotAuthenticatedError();
}
