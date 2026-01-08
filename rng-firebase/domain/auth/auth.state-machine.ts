// Pure reducer-style auth state machine (Phase 1)
import type { AuthContextState, AuthEvent } from './auth.types';

export function authStateReducer(state: AuthContextState, event: AuthEvent): AuthContextState {
  switch (event) {
    case 'APP_BOOT':
      return { ...state, status: 'unauthenticated', user: null };
    case 'SIGN_IN_SUCCESS':
      return state.user && state.user.isActive
        ? state.user.isEmailVerified
          ? { ...state, status: 'authenticated' }
          : { ...state, status: 'email_unverified' }
        : { ...state, status: 'disabled' };
    case 'EMAIL_VERIFIED':
      return state.user && state.user.isActive
        ? { ...state, status: 'authenticated' }
        : { ...state, status: 'disabled' };
    case 'USER_DISABLED':
      return { ...state, status: 'disabled' };
    case 'SIGN_OUT':
      return { ...state, status: 'unauthenticated', user: null };
    default:
      return state;
  }
}
