import { globalLogger } from '@/lib/logger';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  confirmPasswordReset as firebaseConfirmPasswordReset,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut as firebaseSignOut,
  getAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  updatePassword,
} from 'firebase/auth';
import {
  AppUser,
  CreateAppUser,
  ListUsersPaginatedResult,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from '../app-user/app-user.contracts';
import {
  AppUserInvariantViolation,
  assertEmailVerifiedReflectsAuth,
  assertInviteStatusValid,
  assertUserCanBeActivated,
} from '../app-user/app-user.invariants';
import { AppUserService } from '../app-user/app-user.service';
import { AuthSession, IAppAuthService, UnsubscribeFn } from './app-auth.contracts';
import {
  AppAuthError,
  mapFirebaseAuthError,
  NotAuthenticatedError,
  NotAuthorizedError,
  NotOwnerError,
  NotSelfError,
} from './app-auth.errors';
import {
  assertAuthenticatedUser,
  assertNoOrphanAuthUser,
  assertOwnerNotExists,
} from './app-auth.invariants';

const AUTH_INITIAL_PASSWORD = 'rng-associates';

export class AppAuthService implements IAppAuthService {
  private session: AuthSession = { state: 'unknown', user: null };
  private listeners: Array<(session: AuthSession) => void> = [];
  private appUserService = new AppUserService();
  private auth = getAuth();
  private unsubscribeAuthState: (() => void) | null = null;

  /**
   * Unsubscribes and re-subscribes the canonical Firebase Auth state listener.
   * Always use this method to reset the listener; never inline this logic.
   */
  private resetAuthListener() {
    if (this.unsubscribeAuthState) {
      this.unsubscribeAuthState();
      this.unsubscribeAuthState = null;
    }
    this.unsubscribeAuthState = onAuthStateChanged(this.auth, this.handleAuthStateChanged);
  }
  /**
   * Tracks whether emailVerified needs to be synced to Firestore.
   * WARNING: This is a client-side hack. There is no retry, no transaction guarantee, and side-effects occur inside the auth listener.
   * True reliability and atomicity require a server-side (admin SDK) solution.
   */
  private _pendingEmailVerifiedSync = false;

  // --- Centralized RBAC helpers ---
  private requireOwner() {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role !== 'owner') throw new NotOwnerError();
  }

  private requireSelf(userId: string) {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.id !== userId) throw new NotSelfError();
  }

  private requireManagerOrEmployeeSelf(userId: string) {
    assertAuthenticatedUser(this.session.user);
    const { role, id } = this.session.user;
    if (role === 'manager' || role === 'employee') {
      if (id !== userId) throw new NotSelfError();
    } else {
      throw new NotAuthorizedError();
    }
  }

  private requireNotClient() {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role === 'client') throw new NotAuthorizedError();
  }

  async restoreUser(userId: string): Promise<AppUser> {
    this.requireOwner();
    try {
      const user = await this.appUserService.restoreUser(userId);
      globalLogger.info('User restored by owner', {
        userId,
        actor: this.session.user?.id ?? 'unknown',
      });
      return user;
    } catch (err) {
      globalLogger.error('Restore user failed', { userId, err });
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  async searchUsers(query: Partial<AppUser>): Promise<AppUser[]> {
    assertAuthenticatedUser(this.session.user);
    try {
      const users = await this.appUserService.searchUsers(query);
      globalLogger.info('User search', { query, actor: this.session.user.id, count: users.length });
      return users;
    } catch (err) {
      globalLogger.error('User search failed', { query, err });
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  async reactivateUser(userId: string): Promise<AppUser> {
    this.requireOwner();
    try {
      const user = await this.appUserService.reactivateUser(userId);
      globalLogger.info('User reactivated by owner', {
        userId,
        actor: this.session.user?.id ?? 'unknown',
      });
      return user;
    } catch (err) {
      globalLogger.error('Reactivate user failed', { userId, err });
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  /**
   * Attempts to sync emailVerified from Firebase Auth to Firestore.
   * Idempotent and safe to call repeatedly, but not transactional or retried.
   * WARNING: This is a client-side hack. For true reliability, move to server-side logic.
   */
  async syncEmailVerifiedIfNeeded(): Promise<void> {
    if (!this._pendingEmailVerifiedSync || !this.session.user) return;
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) return;
    if (this.session.user.emailVerified === firebaseUser.emailVerified) {
      this._pendingEmailVerifiedSync = false;
      return;
    }
    try {
      await this.appUserService.updateEmailVerified(
        this.session.user.id,
        firebaseUser.emailVerified,
      );
    } finally {
      // Always clear pending flag to avoid infinite retry loop on client
      this._pendingEmailVerifiedSync = false;
    }
  }

  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(this.auth);
      this.setSession({ state: 'unauthenticated', user: null });
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await firebaseSendPasswordResetEmail(this.auth, email);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  /**
   * Dispose the auth state listener. Call when the service is no longer needed.
   */
  dispose() {
    if (this.unsubscribeAuthState) {
      this.unsubscribeAuthState();
      this.unsubscribeAuthState = null;
    }
  }

  constructor() {
    this._pendingEmailVerifiedSync = false;
    this.resetAuthListener();
  }

  /**
   * Canonical handler for Firebase Auth state changes. Used by the main listener and invite hack.
   * Never duplicate or inline this logic. If you change auth/session logic, update ONLY this method.
   */
  private handleAuthStateChanged = async (firebaseUser: any) => {
    try {
      if (!firebaseUser) {
        this.setSession({ state: 'unauthenticated', user: null });
        return;
      }
      let appUser = await this.appUserService.getUserById(firebaseUser.uid);
      assertNoOrphanAuthUser(!!firebaseUser, appUser);
      if (!appUser)
        throw new Error('Invariant: appUser must not be null after assertNoOrphanAuthUser');
      // Mark for background sync if needed
      if (appUser.emailVerified !== firebaseUser.emailVerified) {
        this._pendingEmailVerifiedSync = true;
      }
      assertEmailVerifiedReflectsAuth(appUser, appUser.emailVerified);
      this.setSession({ state: 'authenticated', user: appUser });
    } catch {
      await firebaseSignOut(this.auth);
      this.setSession({ state: 'unauthenticated', user: null });
    }
  };

  private setSession(session: AuthSession) {
    this.session = session;
    for (const cb of this.listeners) {
      try {
        cb({ ...session });
      } catch {}
    }
  }

  getSessionSnapshot(): AuthSession {
    return { ...this.session };
  }

  onAuthStateChanged(callback: (session: AuthSession) => void): UnsubscribeFn {
    this.listeners.push(callback);
    callback(this.session);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  async ownerSignUp(data: {
    email: string;
    password: string;
    name: string;
    photoUrl?: string;
  }): Promise<AuthSession> {
    try {
      const ownerExists = await this.appUserService.isOwnerBootstrapped();
      assertOwnerNotExists(ownerExists);
      const cred = await createUserWithEmailAndPassword(this.auth, data.email, data.password);
      try {
        const user = await this.appUserService.createUser({
          authUid: cred.user.uid,
          name: data.name,
          email: data.email,
          role: 'owner',
          photoUrl: data.photoUrl,
        });
        this.setSession({ state: 'authenticated', user });
        return this.session;
      } catch (err) {
        await cred.user.delete();
        if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
        throw mapFirebaseAuthError(err);
      }
    } catch (err) {
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    this.setSession({ state: 'authenticating', user: null });
    try {
      const cred = await signInWithEmailAndPassword(this.auth, email, password);
      const appUser = await this.appUserService.getUserById(cred.user.uid);
      assertNoOrphanAuthUser(!!cred.user, appUser);
      if (!appUser)
        throw new Error('Invariant: appUser must not be null after assertNoOrphanAuthUser');
      if (appUser.isDisabled) {
        await firebaseSignOut(this.auth);
        this.setSession({ state: 'unauthenticated', user: null });
        throw new NotAuthenticatedError();
      }
      this.setSession({ state: 'authenticated', user: appUser });
      return this.session;
    } catch (err) {
      await firebaseSignOut(this.auth);
      this.setSession({ state: 'unauthenticated', user: null });
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    try {
      await firebaseConfirmPasswordReset(this.auth, code, newPassword);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !user.email) throw new NotAuthenticatedError();
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPassword);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  async getCurrentUser(): Promise<AppUser | null> {
    return this.session.user;
  }

  async updateOwnerProfile(data: { name?: string; photoUrl?: string }): Promise<AppUser> {
    assertAuthenticatedUser(this.session.user);
    try {
      const updated = await this.appUserService.updateUserProfile(this.session.user.id, data);
      this.setSession({ state: 'authenticated', user: updated });
      return updated;
    } catch (err) {
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  /**
   * This operation is inherently unsafe on the client and MUST be migrated to admin-side execution.
   *
   * WARNING: This is a client-side hack for inviting users via Firebase Auth.
   * Suppressing the auth listener is NOT a real fix and is inherently racy and fragile.
   * This logic will be replaced with server-side admin SDK in the future.
   *
   * - Never duplicate or inline auth state logic. Use handleAuthStateChanged only.
   * - If you change session/auth logic, update handleAuthStateChanged.
   */
  async inviteUser(data: CreateAppUser): Promise<AppUser> {
    /**
     * WARNING: This is a client-side hack for inviting users via Firebase Auth.
     * Suppressing the auth listener is NOT a real fix and is inherently racy and fragile.
     * This logic will be replaced with server-side admin SDK in the future.
     *
     * - Never duplicate or inline auth state logic. Use handleAuthStateChanged only.
     * - If you change session/auth logic, update handleAuthStateChanged.
     */
    this.requireOwner();
    let cred;
    // Suppress auth state listener to avoid race during invite
    this.resetAuthListener();
    try {
      cred = await createUserWithEmailAndPassword(this.auth, data.email, AUTH_INITIAL_PASSWORD);
      // Firebase will sign in as the invited user; sign out immediately to restore owner session
      await firebaseSignOut(this.auth);
      // Restore auth state listener using canonical handler
      this.resetAuthListener();
      try {
        const user = await this.appUserService.createUser({ ...data, authUid: cred.user.uid });
        return user;
      } catch (err) {
        await cred.user.delete();
        if (err instanceof AppAuthError) throw err;
        throw mapFirebaseAuthError(err);
      }
    } catch (err) {
      // Restore auth state listener if error occurred before resubscribe
      if (!this.unsubscribeAuthState) {
        this.resetAuthListener();
      }
      if (err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  /**
   * Invite acceptance is role-agnostic except for clients.
   * Only clients are restricted from accepting invites; all other roles (including managers) may accept.
   */
  async acceptInvite(): Promise<AuthSession> {
    assertAuthenticatedUser(this.session.user);
    // Canonical invite activation checks
    // Invite must exist, not be revoked, and be in 'invited' state
    // Use assertInviteStatusValid and assertUserCanBeActivated from app-user.invariants
    assertInviteStatusValid(this.session.user.inviteStatus);
    assertUserCanBeActivated(this.session.user);
    try {
      const user = await this.appUserService.activateInvitedUser(this.session.user.id);
      this.setSession({ state: 'authenticated', user });
      return this.session;
    } catch (err) {
      if (err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  /**
   * Update a user profile (never for owner).
   *
   * - Owner: can only update self, but must use updateOwnerProfile
   * - Manager/Employee: can update self only
   * - Client: forbidden
   */
  async updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser> {
    assertAuthenticatedUser(this.session.user);
    // Owner: can only update self, but must use updateOwnerProfile for self
    // Manager/Employee: can update self only
    // Client: forbidden
    if (this.session.user.role === 'owner') {
      this.requireSelf(userId);
      throw new NotAuthorizedError(); // owner must use updateOwnerProfile for self
    } else if (this.session.user.role === 'manager' || this.session.user.role === 'employee') {
      this.requireManagerOrEmployeeSelf(userId);
    } else {
      this.requireNotClient();
    }
    try {
      return await this.appUserService.updateUserProfile(userId, data);
    } catch (err) {
      if (err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  async updateUserRole(userId: string, data: UpdateAppUserRole): Promise<AppUser> {
    this.requireOwner();
    try {
      return await this.appUserService.updateUserRole(userId, data);
    } catch (err) {
      if (err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  async updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser> {
    this.requireOwner();
    try {
      return await this.appUserService.updateUserStatus(userId, data);
    } catch (err) {
      if (err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    this.requireOwner();
    try {
      return await this.appUserService.deleteUser({ userId });
    } catch (err) {
      if (err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  async getUserById(userId: string): Promise<AppUser | null> {
    assertAuthenticatedUser(this.session.user);
    try {
      return await this.appUserService.getUserById(userId);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  async getUserByEmail(email: string): Promise<AppUser | null> {
    assertAuthenticatedUser(this.session.user);
    try {
      return await this.appUserService.getUserByEmail(email);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  async listUsers(): Promise<AppUser[]> {
    assertAuthenticatedUser(this.session.user);
    try {
      return await this.appUserService.listUsers();
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  async isOwnerBootstrapped(): Promise<boolean> {
    return this.appUserService.isOwnerBootstrapped();
  }

  async isSignupAllowed(): Promise<boolean> {
    return this.appUserService.isSignupAllowed();
  }

  async confirmPassword(password: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user || !user.email) throw new NotAuthenticatedError();
    try {
      const cred = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, cred);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }

  requireAuthenticated(): AppUser {
    assertAuthenticatedUser(this.session.user);
    return this.session.user;
  }

  async resendInvite(userId: string): Promise<AppUser> {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role !== 'owner') throw new NotOwnerError();
    try {
      return await this.appUserService.resendInvite({ userId });
    } catch (err) {
      if (err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  async revokeInvite(userId: string): Promise<AppUser> {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role !== 'owner') throw new NotOwnerError();
    try {
      return await this.appUserService.revokeInvite({ userId });
    } catch (err) {
      if (err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  async listUsersPaginated(
    pageSize: number,
    pageToken?: string,
  ): Promise<ListUsersPaginatedResult> {
    assertAuthenticatedUser(this.session.user);
    try {
      return await this.appUserService.listUsersPaginated(pageSize, pageToken);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }
  }
}
