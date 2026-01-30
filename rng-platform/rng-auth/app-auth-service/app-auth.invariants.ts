import { InternalAuthError, NotAuthenticatedError } from './app-auth.errors';
import { AppUser } from './internal-app-user-service/app-user.contracts';

export function assertNoOrphanAuthUser(authUserExists: boolean, appUser: AppUser | null): void {
  if (authUserExists && !appUser) {
    throw new InternalAuthError();
  }
}

export function assertAuthenticatedUser(user: AppUser | null | undefined): asserts user is AppUser {
  if (!user) throw new NotAuthenticatedError();
}
