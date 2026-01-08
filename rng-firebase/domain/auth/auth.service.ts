// AuthService orchestrator for kernel (Phase 1)
import type { AuthContextState, Invite } from './auth.types';

export interface AuthService {
  signIn(email: string, password: string): Promise<AuthContextState>;
  signOut(): Promise<void>;
  createOwner(email: string, password: string): Promise<AuthContextState>;
  createUserWithInvite(invite: Invite, password: string): Promise<AuthContextState>;
  sendEmailVerification(): Promise<void>;
  getCurrentState(): Promise<AuthContextState>;
}

// Implementation is not provided in Phase 1. This contract ensures all orchestration and invariants are enforced centrally.
