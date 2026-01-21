// Auth domain types and state definitions for Phase 1
import type { User } from '../user/contract';

export type AuthStatus =
  | 'unauthenticated'
  | 'owner_bootstrap_allowed'
  | 'invited_signup_allowed'
  | 'authenticated'
  | 'email_unverified'
  | 'disabled';

export interface AuthContextState {
  status: AuthStatus;
  user: User | null;
  now: number;
}

export type AuthEvent =
  | 'APP_BOOT'
  | 'SIGN_IN_SUCCESS'
  | 'SIGN_OUT'
  | 'EMAIL_VERIFIED'
  | 'USER_DISABLED';

// Invite contract (stub, no repo logic)
import type { BaseEntity } from '../../abstract-client-repository/types';
export interface Invite extends BaseEntity {
  email: string;
  role: string;
  permissions?: string[];
  status: 'pending' | 'accepted' | 'revoked';
}
