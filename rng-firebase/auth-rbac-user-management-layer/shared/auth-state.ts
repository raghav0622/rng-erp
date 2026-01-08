// Auth State Machine Context for ERP
import type { AuthStatus, User } from '../../types/erp-types';

export interface AuthContextState {
  status: AuthStatus;
  user: User | null;
  now: number;
}

export type AuthAction =
  | { type: 'openSignup' }
  | { type: 'signup'; user: User }
  | { type: 'acceptInvite'; user: User }
  | { type: 'verifyEmail' }
  | { type: 'disableUser' }
  | { type: 'signOut' };

export function authStateReducer(state: AuthContextState, action: AuthAction): AuthContextState {
  switch (state.status) {
    case 'unauthenticated':
      if (action.type === 'openSignup') return { ...state, status: 'signup_allowed_owner' };
      if (action.type === 'acceptInvite')
        return { ...state, status: 'authenticated', user: action.user };
      break;
    case 'signup_allowed_owner':
      if (action.type === 'signup') return { ...state, status: 'authenticated', user: action.user };
      break;
    case 'authenticated':
      if (action.type === 'verifyEmail') return { ...state, status: 'verified' };
      break;
    default:
      break;
  }
  if (action.type === 'disableUser') return { ...state, status: 'disabled' };
  if (action.type === 'signOut') return { ...state, status: 'unauthenticated', user: null };
  return state;
}
