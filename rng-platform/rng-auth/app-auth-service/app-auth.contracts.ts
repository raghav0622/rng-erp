import type {
  AppUser,
  CreateInvitedUser,
  ListUsersPaginatedResult,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from './internal-app-user-service/app-user.contracts';
export type { ListUsersPaginatedResult } from './internal-app-user-service/app-user.contracts';

export type AuthSessionState = 'unknown' | 'unauthenticated' | 'authenticating' | 'authenticated';

export interface AuthSession {
  state: AuthSessionState;
  user: AppUser | null;
  emailVerified: boolean | null;
  lastTransitionError: { error: unknown; from: AuthSessionState; to: AuthSessionState } | null;
  lastAuthError: { error: unknown; timestamp: Date } | null;
  sessionExpiresAt: Date | null;
}

export type UnsubscribeFn = () => void;

export interface IAppAuthService {
  restoreUser(userId: string): Promise<AppUser>;
  searchUsers(query: Partial<AppUser>): Promise<{ results: AppUser[]; truncated: boolean }>;
  reactivateUser(userId: string): Promise<AppUser>;
  ownerSignUp(data: {
    email: string;
    password: string;
    name: string;
    photoUrl?: string;
  }): Promise<AuthSession>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signupWithInvite(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  sendPasswordResetEmail(email: string): Promise<void>;
  sendEmailVerificationEmail(): Promise<void>;
  confirmPasswordReset(code: string, newPassword: string): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  getCurrentUser(): Promise<AppUser | null>;
  updateOwnerProfile(data: {
    name?: string;
    photoUrl?: string | File | { url?: string; file?: File } | null;
  }): Promise<AppUser>;
  updateUserPhoto(userId: string, photo: File | string | undefined): Promise<AppUser>;
  inviteUser(data: CreateInvitedUser): Promise<AppUser>;
  onAuthStateChanged(callback: (session: AuthSession) => void): UnsubscribeFn;
  getSessionSnapshot(): AuthSession;
  getLastAuthError(): { error: unknown; timestamp: Date } | null;
  getLastSessionTransitionError(): {
    error: unknown;
    timestamp: Date;
    from: AuthSessionState;
    to: AuthSessionState;
  } | null;
  updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser>;
  updateUserRole(userId: string, data: UpdateAppUserRole): Promise<AppUser>;
  updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser>;
  deleteUser(userId: string): Promise<void>;
  getUserById(userId: string): Promise<AppUser | null>;
  getUserByEmail(email: string): Promise<AppUser | null>;
  listUsers(): Promise<AppUser[]>;
  listOrphanedLinkedUsers(): Promise<AppUser[]>;
  cleanupOrphanedLinkedUser(userId: string): Promise<void>;
  isOwnerBootstrapped(): Promise<boolean>;
  isSignupAllowed(): Promise<boolean>;
  isSignupComplete(): boolean;
  confirmPassword(password: string): Promise<void>;
  listUsersPaginated(pageSize: number, pageToken?: string): Promise<ListUsersPaginatedResult>;
  requireAuthenticated(): AppUser;
  resendInvite(userId: string, options?: { force?: boolean }): Promise<AppUser>;
  revokeInvite(userId: string): Promise<AppUser>;
}
