'use client';

import type { AppUser } from '../app-auth-service/internal-app-user-service/app-user.contracts';
import { appAuthService } from './internal/authService';

/**
 * Hook that returns the authenticated user or throws NotAuthenticatedError.
 * Use this in route guards and protected layouts.
 * Throws if user is not authenticated or session expired.
 */
export function useRequireAuthenticated(): AppUser {
  return appAuthService.requireAuthenticated();
}
