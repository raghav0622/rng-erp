// Auth Domain Service Interface
export interface AuthService {
  bootstrapOwner(): Promise<void>;
  inviteSignup(email: string): Promise<void>;
  verifyEmail(userId: string): Promise<void>;
  disableUser(userId: string): Promise<void>;
  transitionState(params: { userId: string; to: string }): Promise<void>;
  getAuthState(userId: string): Promise<import('./auth.contract').AuthState>;
}
