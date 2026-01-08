// Firebase Auth Adapter (boundary only, no domain logic)

export interface FirebaseAuthAdapter {
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  createUser(email: string, password: string): Promise<void>;
  sendEmailVerification(): Promise<void>;
  getCurrentUser(): Promise<{
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    emailVerified: boolean;
    disabled: boolean;
  } | null>;
}
