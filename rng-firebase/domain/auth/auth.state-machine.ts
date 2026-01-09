// Pure reducer-style auth state machine (Phase 1)
import type { AuthContextState, AuthEvent } from './auth.types';

/**
 * Exhaustive Auth State Reducer
 * Handles every AuthStatus × AuthEvent combination.
 * Throws on invalid transitions.
 */
export function authStateReducer(state: AuthContextState, event: AuthEvent): AuthContextState {
  const { status } = state;
  switch (status) {
    case 'unauthenticated':
      switch (event) {
        case 'APP_BOOT':
        case 'SIGN_OUT':
          return { ...state, status: 'unauthenticated', user: null };
        case 'SIGN_IN_SUCCESS':
          if (!state.user) throw new Error('No user on sign-in success');
          if (!state.user.isActive) return { ...state, status: 'disabled' };
          return state.user.isEmailVerified
            ? { ...state, status: 'authenticated' }
            : { ...state, status: 'email_unverified' };
        case 'EMAIL_VERIFIED':
          return { ...state, status: 'email_unverified' };
        case 'USER_DISABLED':
          return { ...state, status: 'disabled' };
        default:
          throw new Error(`Invalid transition: ${status} + ${event}`);
      }
    case 'owner_bootstrap_allowed':
      switch (event) {
        case 'SIGN_IN_SUCCESS':
          if (!state.user) throw new Error('No user on sign-in success');
          return state.user.isEmailVerified
            ? { ...state, status: 'authenticated' }
            : { ...state, status: 'email_unverified' };
        case 'SIGN_OUT':
          return { ...state, status: 'unauthenticated', user: null };
        default:
          throw new Error(`Invalid transition: ${status} + ${event}`);
      }
    case 'invited_signup_allowed':
      switch (event) {
        case 'SIGN_IN_SUCCESS':
          if (!state.user) throw new Error('No user on sign-in success');
          return state.user.isEmailVerified
            ? { ...state, status: 'authenticated' }
            : { ...state, status: 'email_unverified' };
        case 'SIGN_OUT':
          return { ...state, status: 'unauthenticated', user: null };
        default:
          throw new Error(`Invalid transition: ${status} + ${event}`);
      }
    case 'authenticated':
      switch (event) {
        case 'SIGN_OUT':
          return { ...state, status: 'unauthenticated', user: null };
        case 'USER_DISABLED':
          return { ...state, status: 'disabled' };
        case 'EMAIL_VERIFIED':
          return { ...state, status: 'authenticated' };
        default:
          throw new Error(`Invalid transition: ${status} + ${event}`);
      }
    case 'email_unverified':
      switch (event) {
        case 'EMAIL_VERIFIED':
          return { ...state, status: 'authenticated' };
        case 'SIGN_OUT':
          return { ...state, status: 'unauthenticated', user: null };
        case 'USER_DISABLED':
          return { ...state, status: 'disabled' };
        default:
          throw new Error(`Invalid transition: ${status} + ${event}`);
      }
    case 'disabled':
      // Disabled is terminal; all events keep it disabled
      return { ...state, status: 'disabled' };
    default:
      throw new Error(`Unknown status: ${status}`);
  }
}
