// Removed misplaced acceptInvite method(s) from file top
// import { globalLogger } from '@/lib/logger';
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
  assertInviteStatusValid,
  assertUserCanBeActivated,
  assertUserIdMatchesAuthUid,
} from '../app-user/app-user.invariants';
import { AppUserService } from '../app-user/app-user.service';
import { AuthSession, IAppAuthService, UnsubscribeFn } from './app-auth.contracts';
import {
  AppAuthError,
  InviteAlreadyAcceptedError,
  InviteInvalidError,
  InviteRevokedError,
  mapFirebaseAuthError,
  NotAuthenticatedError,
  NotAuthorizedError,
  NotOwnerError,
  NotSelfError,
  UserDisabledError,
} from './app-auth.errors';
import { assertAuthenticatedUser, assertNoOrphanAuthUser } from './app-auth.invariants';

class AppAuthService implements IAppAuthService {
  private session: AuthSession = { state: 'unknown', user: null };
  private listeners: Array<(session: AuthSession) => void> = [];
  private appUserService = new AppUserService();
  private auth = getAuth();
  private authOperationDepth = 0;
  private unsubscribeAuthState: (() => void) | null = null;

  /**
   * Helper to wrap all Firebase Auth mutating operations.
   * Increments authOperationDepth before, decrements after.
   * Ignores auth state events during operation.
   */
  private async withAuthOperation<T>(fn: () => Promise<T>): Promise<T> {
    this.authOperationDepth++;
    try {
      return await fn();
    } finally {
      this.authOperationDepth--;
    }
  }

  // --- Centralized RBAC helpers ---
  /**
   * RBAC check: require current session user to be owner.
   * Invariant enforcement is handled in app-user.invariants.ts.
   */
  private requireOwner() {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role !== 'owner') throw new NotOwnerError();
  }

  private requireSelf(userId: string) {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.id !== userId) throw new NotSelfError();
  }

  /**
   * Managers are not privileged for user mutations; delegation is assignment-based (phase-2).
   * This method enforces that managers and employees can only mutate their own user record.
   */
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
      return user;
    } catch (err) {
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  async searchUsers(query: Partial<AppUser>): Promise<AppUser[]> {
    assertAuthenticatedUser(this.session.user);
    try {
      const users = await this.appUserService.searchUsers(query);
      return users;
    } catch (err) {
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  async reactivateUser(userId: string): Promise<AppUser> {
    this.requireOwner();
    try {
      const user = await this.appUserService.reactivateUser(userId);
      return user;
    } catch (err) {
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  /**
   * Attempts to sync emailVerified from Firebase Auth to Firestore.
   * Idempotent and safe to call repeatedly, but not transactional or retried.
   * WARNING: This is a client-side hack. For true reliability, move to server-side logic.
   */

  async signOut(): Promise<void> {
    return this.withAuthOperation(async () => {
      try {
        await firebaseSignOut(this.auth);
        this.setSession({ state: 'unauthenticated', user: null });
      } catch (err) {
        throw mapFirebaseAuthError(err);
      }
    });
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    return this.withAuthOperation(async () => {
      try {
        await firebaseSendPasswordResetEmail(this.auth, email);
      } catch (err) {
        throw mapFirebaseAuthError(err);
      }
    });
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
    this.unsubscribeAuthState = onAuthStateChanged(this.auth, this.handleAuthStateChanged);
  }

  /**
   * Canonical handler for Firebase Auth state changes. Used by the main listener and invite hack.
   * Never duplicate or inline this logic. If you change auth/session logic, update ONLY this method.
   */
  private handleAuthStateChanged = async (firebaseUser: any) => {
    // Ignore auth state changes during mutating operations
    if (this.authOperationDepth > 0) return;
    try {
      if (!firebaseUser) {
        this.setSession({ state: 'unauthenticated', user: null });
        return;
      }
      let appUser = await this.appUserService.getUserById(firebaseUser.uid);
      assertNoOrphanAuthUser(!!firebaseUser, appUser);
      if (!appUser)
        throw new Error('Invariant: appUser must not be null after assertNoOrphanAuthUser');
      // Always treat Firebase Auth as authoritative for emailVerified
      // If Firestore projection is out of sync, persist the update (client-side hack, phase-1 safe)
      if (appUser.emailVerified !== firebaseUser.emailVerified) {
        await this.appUserService.updateEmailVerified(appUser.id, firebaseUser.emailVerified);
        // Optionally reload appUser, but not strictly required for session projection
        appUser = { ...appUser, emailVerified: firebaseUser.emailVerified };
      }
      this.setSession({
        state: 'authenticated',
        user: { ...appUser, emailVerified: firebaseUser.emailVerified },
      });
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
    return this.withAuthOperation(async () => {
      try {
        // Owner uniqueness is enforced in AppUserService.createUser; no need to check here.
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
    });
  }

  async signIn(email: string, password: string): Promise<AuthSession> {
    return this.withAuthOperation(async () => {
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
          // Throw semantically correct error for disabled users
          throw new UserDisabledError();
        }
        this.setSession({ state: 'authenticated', user: appUser });
        return this.session;
      } catch (err) {
        await firebaseSignOut(this.auth);
        this.setSession({ state: 'unauthenticated', user: null });
        if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
        throw mapFirebaseAuthError(err);
      }
    });
  }

  async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    return this.withAuthOperation(async () => {
      try {
        await firebaseConfirmPasswordReset(this.auth, code, newPassword);
      } catch (err) {
        throw mapFirebaseAuthError(err);
      }
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return this.withAuthOperation(async () => {
      const user = this.auth.currentUser;
      if (!user || !user.email) throw new NotAuthenticatedError();
      try {
        const cred = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, cred);
        await updatePassword(user, newPassword);
      } catch (err) {
        throw mapFirebaseAuthError(err);
      }
    });
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

  // ...existing code...
  /**
   * Owner-only: Create a Firestore-only invite (AppUser with inviteStatus = 'invited').
   * Does NOT create a Firebase Auth user. Enforces email uniqueness at AppUser layer.
   */
  async inviteUser(data: CreateAppUser): Promise<AppUser> {
    this.requireOwner();
    try {
      // No authUid at invite time; only email, name, role, etc.
      const { authUid, ...inviteData } = data;
      const user = await this.appUserService.createUser({ ...inviteData, authUid: '' });
      return user;
    } catch (err) {
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }
  // Use assertInviteStatusValid and assertUserCanBeActivated from app-user.invariants
  /**
   * Signup with invite: creates Firebase Auth user ONLY if a valid invite exists.
   * 1. Checks AppUser by email, asserts inviteStatus === 'invited', not revoked/disabled
   * 2. Creates Firebase Auth user
   * 3. Links authUid to AppUser
   * 4. Activates invite (inviteStatus → activated, isRegisteredOnERP → true)
   * Fails if any invariant is violated.
   */
  async signupWithInvite(email: string, password: string): Promise<AuthSession> {
    // Step 1: Check for invited AppUser
    let invitedUser: AppUser | null = null;
    try {
      invitedUser = await this.appUserService.getUserByEmail(email);
    } catch (err) {
      throw new InviteInvalidError();
    }
    if (!invitedUser) throw new InviteInvalidError();
    if (invitedUser.inviteStatus !== 'invited') throw new InviteAlreadyAcceptedError();
    if (invitedUser.isDisabled) throw new NotAuthorizedError();
    if (String(invitedUser.inviteStatus) === 'revoked') throw new InviteRevokedError();

    // Step 2: Create Firebase Auth user
    let cred;
    try {
      cred = await createUserWithEmailAndPassword(this.auth, email, password);
    } catch (err) {
      throw mapFirebaseAuthError(err);
    }

    // Step 3: Re-fetch AppUser and check for race
    let freshUser: AppUser | null = null;
    try {
      freshUser = await this.appUserService.getUserByEmail(email);
    } catch (err) {
      // Defensive: delete auth user if AppUser fetch fails
      await cred.user.delete();
      throw new InviteInvalidError();
    }
    if (!freshUser || freshUser.inviteStatus !== 'invited' || freshUser.id === cred.user.uid) {
      await cred.user.delete();
      if (!freshUser) throw new InviteInvalidError();
      if (freshUser.id === cred.user.uid) throw new InviteAlreadyAcceptedError();
      throw new InviteInvalidError();
    }

    // Step 4: Link authUid to AppUser
    try {
      await this.appUserService.linkAuthIdentity(freshUser.id, cred.user.uid);
      // Enforce linking invariant immediately after linking
      const linkedUser = await this.appUserService.getUserById(cred.user.uid);
      assertUserIdMatchesAuthUid(linkedUser!, cred.user.uid);
    } catch (err) {
      // Rollback: delete Auth user if linking fails
      await cred.user.delete();
      throw mapFirebaseAuthError(err);
    }

    // Step 5: Activate invite
    let activatedUser: AppUser;
    try {
      activatedUser = await this.appUserService.activateInvitedUser(cred.user.uid);
    } catch (err) {
      // Rollback: delete Auth user if activation fails
      await cred.user.delete();
      throw mapFirebaseAuthError(err);
    }

    // NOTE: This operation is not atomic. Firestore and Firebase Auth are updated in sequence. Rollbacks are best-effort and race conditions are possible, but this is acceptable given system constraints.

    // Set session
    this.setSession({ state: 'authenticated', user: activatedUser });
    return this.session;
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
    // RBAC: Owners are only allowed to update their own profile, but must do so via updateOwnerProfile.
    // This restriction is intentional: owner profile updates require stricter invariants and auditing than regular users.
    // By gating owner updates to updateOwnerProfile, we ensure all owner-specific invariants, logging, and business rules are enforced in one place.
    // This is not an accidental limitation—it's a deliberate separation to prevent privilege escalation, accidental demotion, or bypassing owner-specific checks.
    // See app-user.invariants.ts for canonical owner invariants.
    if (this.session.user.role === 'owner') {
      this.requireSelf(userId);
      // Owner must use updateOwnerProfile for self-updates; this method is forbidden for owners.
      throw new NotAuthorizedError();
    } else if (this.session.user.role === 'manager' || this.session.user.role === 'employee') {
      this.requireManagerOrEmployeeSelf(userId);
    } else if (this.session.user.role === 'client') {
      this.requireSelf(userId);
      // Clients can only update their own name and photoUrl
      const allowed: Partial<UpdateAppUserProfile> = {};
      if ('name' in data) allowed.name = data.name;
      if ('photoUrl' in data) allowed.photoUrl = data.photoUrl;
      data = allowed;
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

  /**
   * Resend an invite for a user. Only allowed for owner. Only updates inviteSentAt.
   */
  async resendInvite(userId: string): Promise<AppUser> {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role !== 'owner') throw new NotOwnerError();
    try {
      return await this.appUserService.resendInvite({ userId });
    } catch (err) {
      if (
        err instanceof NotOwnerError ||
        err instanceof NotSelfError ||
        err instanceof NotAuthorizedError ||
        err instanceof AppAuthError
      )
        throw err;
      throw mapFirebaseAuthError(err);
    }
  }

  /**
   * Revoke an invite for a user. Only allowed for owner. Sets inviteStatus to 'revoked'.
   */
  async revokeInvite(userId: string): Promise<AppUser> {
    assertAuthenticatedUser(this.session.user);
    if (this.session.user.role !== 'owner') throw new NotOwnerError();
    try {
      return await this.appUserService.revokeInvite({ userId });
    } catch (err) {
      if (
        err instanceof NotOwnerError ||
        err instanceof NotSelfError ||
        err instanceof NotAuthorizedError ||
        err instanceof AppAuthError
      )
        throw err;
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
  // Only one acceptInvite implementation should exist

  /**
   * Accept an invite for the currently authenticated user.
   * Transitions inviteStatus to 'activated' and sets isRegisteredOnERP = true.
   * Returns the authenticated session.
   */
  async acceptInvite(): Promise<AuthSession> {
    assertAuthenticatedUser(this.session.user);
    assertInviteStatusValid(this.session.user!.inviteStatus);
    assertUserCanBeActivated(this.session.user!);
    try {
      const user = await this.appUserService.activateInvitedUser(this.session.user!.id);
      this.setSession({ state: 'authenticated', user });
      return this.session;
    } catch (err) {
      if (err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }
}

export const appAuthService = new AppAuthService();
