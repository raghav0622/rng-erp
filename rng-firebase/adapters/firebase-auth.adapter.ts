// Firebase Auth Adapter (boundary only, no domain logic)

import type { DomainResult } from '../domain/common/result';

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  disabled: boolean;
}

export interface FirebaseAuthAdapter {
  signIn(email: string, password: string): Promise<DomainResult<void>>;
  signOut(): Promise<DomainResult<void>>;
  createUser(email: string, password: string): Promise<DomainResult<void>>;
  sendEmailVerification(): Promise<DomainResult<void>>;
  getCurrentUser(): Promise<DomainResult<AuthUser | null>>;
}
