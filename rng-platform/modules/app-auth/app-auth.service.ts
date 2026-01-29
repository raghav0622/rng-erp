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
  type User as FirebaseUser,
} from 'firebase/auth';
import type {
  AppUser,
  CreateInvitedUser,
  CreateOwnerUser,
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
  InternalAuthError,
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

/**
 * Helper to standardize error handling across service methods.
 * Preserves AppAuthError and AppUserInvariantViolation, maps all other errors.
 */
function rethrowOrMapAuthError(err: unknown): never {
  if (err instanceof AppAuthError || err instanceof AppUserInvariantViolation) {
    throw err;
  }
  throw mapFirebaseAuthError(err);
}

class AppAuthService implements IAppAuthService {
  private session: AuthSession = { state: 'unknown', user: null };
  private listeners: Array<(session: AuthSession) => void> = [];
  private appUserService = new AppUserService();
  private auth = getAuth();
  private authMutationInProgress = false;
  private authMutationPromise: Promise<void> | null = null;
  private unsubscribeAuthState: (() => void) | null = null;

  /**
   * Helper to wrap all Firebase Auth mutating operations.
   * Uses a boolean lock to ignore auth state events during mutation.
   */
  private async withAuthOperation<T>(fn: () => Promise<T>): Promise<T> {
    if (this.authMutationInProgress && this.authMutationPromise) {
      await this.authMutationPromise;
    }
    this.authMutationInProgress = true;
    const operation = (async () => fn())();
    this.authMutationPromise = operation.then(
      () => undefined,
      () => undefined,
    );
    try {
      return await operation;
    } finally {
      this.authMutationInProgress = false;
      this.authMutationPromise = null;
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
      throw new InternalAuthError({ role });
    }
  }

  async restoreUser(userId: string): Promise<AppUser> {
    this.requireOwner();
    try {
      return await this.appUserService.restoreUser(userId);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async searchUsers(query: Partial<AppUser>): Promise<AppUser[]> {
    assertAuthenticatedUser(this.session.user);
    try {
      return await this.appUserService.searchUsers(query);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async reactivateUser(userId: string): Promise<AppUser> {
    this.requireOwner();
    try {
      return await this.appUserService.reactivateUser(userId);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  /**
   * Attempts to sync emailVerified from Firebase Auth to Firestore.
   * Idempotent and safe to call repeatedly, but not transactional or retried.
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
   * Canonical handler for Firebase Auth state changes. Used by the main listener and invite flow.
   * Never duplicate or inline this logic. If you change auth/session logic, update ONLY this method.
   */
  private handleAuthStateChanged = async (firebaseUser: FirebaseUser | null) => {
    // Ignore auth state changes during mutating operations
    if (this.authMutationInProgress) return;
    try {
      if (!firebaseUser) {
        this.setSession({ state: 'unauthenticated', user: null });
        return;
      }
      let appUser = await this.appUserService.getUserById(firebaseUser.uid);
      assertNoOrphanAuthUser(!!firebaseUser, appUser);
      if (!appUser)
        throw new InternalAuthError(
          'Invariant: appUser must not be null after assertNoOrphanAuthUser',
        );
      const effectiveEmailVerified = appUser.isRegisteredOnERP
        ? firebaseUser.emailVerified
        : appUser.emailVerified;
      // Always treat Firebase Auth as authoritative for emailVerified
      // If Firestore projection is out of sync, persist the update
      if (appUser.isRegisteredOnERP && appUser.emailVerified !== effectiveEmailVerified) {
        await this.appUserService.updateEmailVerified(appUser.id, effectiveEmailVerified);
        // Optionally reload appUser, but not strictly required for session projection
        appUser = { ...appUser, emailVerified: effectiveEmailVerified };
      }
      this.setSession({
        state: 'authenticated',
        user: { ...appUser, emailVerified: effectiveEmailVerified },
      });
    } catch (err) {
      // CRITICAL: Auth state listener must NEVER throw to prevent unhandled promise rejections.
      // All errors (including invariant violations) are handled by signing out and resetting session.
      await firebaseSignOut(this.auth);
      this.setSession({ state: 'unauthenticated', user: null });
    }
  };

  private setSession(session: AuthSession) {
    this.session = session;
    for (const cb of this.listeners) {
      try {
        cb({ ...session });
      } catch {
        // Silent: Listener errors must not break session state updates.
        // Consumers are responsible for their own error handling.
      }
    }
  }

  getSessionSnapshot(): AuthSession {
    return { ...this.session };
  }

  onAuthStateChanged(callback: (session: AuthSession) => void): UnsubscribeFn {
    this.listeners.push(callback);
    callback({ ...this.session });
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
          } as CreateOwnerUser);
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
          throw new InternalAuthError(
            'Invariant: appUser must not be null after assertNoOrphanAuthUser',
          );
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
    this.requireOwner();
    const user = this.session.user;
    assertAuthenticatedUser(user);
    try {
      const updated = await this.appUserService.updateUserProfile(user.id, data);
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
  async inviteUser(data: CreateInvitedUser): Promise<AppUser> {
    this.requireOwner();
    try {
      const user = await this.appUserService.createUser(data);
      return user;
    } catch (err) {
      if (err instanceof AppUserInvariantViolation || err instanceof AppAuthError) throw err;
      throw mapFirebaseAuthError(err);
    }
  }
  /**
   * Signup with invite: creates Firebase Auth user ONLY if a valid invite exists.
   *
   * Flow:
   * 1. Checks AppUser by email, asserts inviteStatus === 'invited', not revoked/disabled
   * 2. Creates Firebase Auth user
   * 3. Links authUid to AppUser (creates new doc with authUid, soft-deletes old invite doc)
   * 4. Activates invite (inviteStatus → activated, isRegisteredOnERP → true)
   *
   * ⚠️ NON-ATOMIC OPERATION:
   * This operation updates Firestore and Firebase Auth sequentially.
   * If any step fails, best-effort rollback is attempted (Auth user deletion).
   * However, network failures or race conditions may leave partial state:
   * - Orphaned Firebase Auth user without AppUser
   * - Soft-deleted invite doc without linked Auth user
   *   * ⚠️ ASYMMETRIC ROLLBACK:
   * If activateInvitedUser fails AFTER linkAuthIdentity succeeds:
   * - Firebase Auth user is deleted (rolled back)
   * - New AppUser doc (with id = authUid) remains in Firestore
   * - Old invited doc remains soft-deleted
   * This orphaned AppUser requires manual owner cleanup.
   * This is an accepted limitation of client-side operations.
   *    * CLIENT-SIDE LIMITATION:
   * This is acceptable for client-side operations given:
   *
   * @throws InviteInvalidError if no invite exists or invite is invalid
   * @throws InviteAlreadyAcceptedError if invite already accepted
   * @throws InviteRevokedError if invite was revoked
   * @throws NotAuthorizedError if user is disabled
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
    if (invitedUser.inviteStatus === 'revoked') throw new InviteRevokedError();
    if (invitedUser.inviteStatus === 'activated') throw new InviteAlreadyAcceptedError();
    if (invitedUser.inviteStatus !== 'invited') throw new InviteInvalidError();
    if (invitedUser.isDisabled) throw new NotAuthorizedError();

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
    // Note: linkAuthIdentity includes race condition protection (duplicate authUid check)
    try {
      await this.appUserService.linkAuthIdentity(freshUser.id, cred.user.uid);
      // Enforce linking invariant immediately after linking
      const linkedUser = await this.appUserService.getUserById(cred.user.uid);
      assertUserIdMatchesAuthUid(linkedUser!, cred.user.uid);
      // Immediately disable the linked user to avoid zombie accounts on failure
      await this.appUserService.updateUserStatus(cred.user.uid, { isDisabled: true });
    } catch (err) {
      // Rollback: delete Auth user if linking fails
      await cred.user.delete();
      throw mapFirebaseAuthError(err);
    }

    // Step 5: Activate invite
    let activatedUser: AppUser;
    try {
      activatedUser = await this.appUserService.activateInvitedUser(cred.user.uid);
      // Re-enable user only after successful activation
      activatedUser = await this.appUserService.updateUserStatus(cred.user.uid, {
        isDisabled: false,
      });
    } catch (err) {
      // Rollback: delete Auth user if activation fails
      await cred.user.delete();
      throw mapFirebaseAuthError(err);
    }

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
      throw new InternalAuthError({ role: this.session.user.role });
    }
    try {
      return await this.appUserService.updateUserProfile(userId, data);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async updateUserRole(userId: string, data: UpdateAppUserRole): Promise<AppUser> {
    this.requireOwner();
    try {
      return await this.appUserService.updateUserRole(userId, data);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser> {
    this.requireOwner();
    try {
      return await this.appUserService.updateUserStatus(userId, data);
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    this.requireOwner();
    try {
      return await this.appUserService.deleteUser({ userId });
    } catch (err) {
      rethrowOrMapAuthError(err);
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

  async listOrphanedLinkedUsers(): Promise<AppUser[]> {
    this.requireOwner();
    try {
      return await this.appUserService.searchUsers({
        inviteStatus: 'activated',
        isRegisteredOnERP: false,
      });
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }

  async cleanupOrphanedLinkedUser(userId: string): Promise<void> {
    this.requireOwner();
    const user = await this.appUserService.getUserById(userId);
    if (!user) throw new InviteInvalidError();
    if (!(user.inviteStatus === 'activated' && user.isRegisteredOnERP === false)) {
      throw new InviteInvalidError();
    }
    await this.appUserService.deleteUser({ userId });
    await this.appUserService.deleteUserPermanently(userId);
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
      rethrowOrMapAuthError(err);
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
      rethrowOrMapAuthError(err);
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
   *
   * ⚠️ IMPORTANT USAGE CONSTRAINT:
   *
   * acceptInvite MUST NOT be used for signup flows.
   * - Signup (creating Firebase Auth user) MUST go through signupWithInvite()
   * - acceptInvite() is ONLY for post-signup invite activation
   * - Caller MUST already have an authenticated Firebase session
   * - User MUST already be registered on ERP (isRegisteredOnERP === true)
   *
   * If isRegisteredOnERP === false, this indicates the user has not completed
   * signup and must use signupWithInvite() instead.
   */
  async acceptInvite(): Promise<AuthSession> {
    assertAuthenticatedUser(this.session.user);

    // Hard invariant: acceptInvite cannot be used for signup
    if (this.session.user!.isRegisteredOnERP === false) {
      throw new InviteInvalidError();
    }

    assertInviteStatusValid(this.session.user!.inviteStatus);
    assertUserCanBeActivated(this.session.user!);
    try {
      const user = await this.appUserService.activateInvitedUser(this.session.user!.id);
      this.setSession({ state: 'authenticated', user });
      return this.session;
    } catch (err) {
      rethrowOrMapAuthError(err);
    }
  }
}

export const appAuthService = new AppAuthService();
