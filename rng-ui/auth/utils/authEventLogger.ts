/**
 * Auth Event Logger
 *
 * Client-side logging for auth operations and user actions.
 * Provides audit trail visibility for debugging and compliance.
 *
 * Features:
 * - Event type classification
 * - Structured logging
 * - Timestamp tracking
 * - User context tracking
 * - Export capability
 *
 * @example
 * ```tsx
 * authEventLogger.logSignIn(user.id, user.email);
 * authEventLogger.logRoleChange(user.id, 'employee', 'manager', currentUser.id);
 *
 * // Get recent events
 * const events = authEventLogger.getEvents(50);
 * ```
 */

export type AuthEventType =
  | 'sign_in'
  | 'sign_out'
  | 'sign_up'
  | 'password_change'
  | 'password_reset'
  | 'email_verification_sent'
  | 'email_verified'
  | 'invite_sent'
  | 'invite_accepted'
  | 'invite_revoked'
  | 'invite_resent'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'user_restored'
  | 'user_disabled'
  | 'user_enabled'
  | 'role_changed'
  | 'profile_updated'
  | 'orphan_cleaned';

export interface AuthEvent {
  id: string;
  type: AuthEventType;
  timestamp: Date;
  userId?: string;
  actorId?: string; // Who performed the action
  email?: string;
  metadata?: Record<string, unknown>;
  message: string;
}

class AuthEventLogger {
  private events: AuthEvent[] = [];
  private maxEvents = 1000;
  private listeners: Array<(event: AuthEvent) => void> = [];

  private createEvent(
    type: AuthEventType,
    message: string,
    metadata?: Record<string, unknown>,
  ): AuthEvent {
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      message,
      metadata,
    };
  }

  private addEvent(event: AuthEvent) {
    this.events.unshift(event);

    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(event));

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AuthEvent] ${event.type}:`, event.message, event.metadata);
    }
  }

  // Authentication events
  logSignIn(userId: string, email: string) {
    this.addEvent(this.createEvent('sign_in', `User signed in: ${email}`, { userId, email }));
  }

  logSignOut(userId?: string) {
    this.addEvent(this.createEvent('sign_out', 'User signed out', { userId }));
  }

  logSignUp(userId: string, email: string, role: string) {
    this.addEvent(
      this.createEvent('sign_up', `New user signed up: ${email}`, {
        userId,
        email,
        role,
      }),
    );
  }

  // Password events
  logPasswordChange(userId: string, email: string) {
    this.addEvent(
      this.createEvent('password_change', `Password changed for ${email}`, {
        userId,
        email,
      }),
    );
  }

  logPasswordReset(email: string) {
    this.addEvent(
      this.createEvent('password_reset', `Password reset requested for ${email}`, { email }),
    );
  }

  // Email verification events
  logEmailVerificationSent(userId: string, email: string) {
    this.addEvent(
      this.createEvent('email_verification_sent', `Verification email sent to ${email}`, {
        userId,
        email,
      }),
    );
  }

  logEmailVerified(userId: string, email: string) {
    this.addEvent(
      this.createEvent('email_verified', `Email verified: ${email}`, { userId, email }),
    );
  }

  // Invite events
  logInviteSent(userId: string, email: string, role: string, actorId: string) {
    this.addEvent(
      this.createEvent('invite_sent', `Invite sent to ${email} as ${role}`, {
        userId,
        email,
        role,
        actorId,
      }),
    );
  }

  logInviteAccepted(userId: string, email: string) {
    this.addEvent(
      this.createEvent('invite_accepted', `Invite accepted by ${email}`, {
        userId,
        email,
      }),
    );
  }

  logInviteRevoked(userId: string, email: string, actorId: string) {
    this.addEvent(
      this.createEvent('invite_revoked', `Invite revoked for ${email}`, {
        userId,
        email,
        actorId,
      }),
    );
  }

  logInviteResent(userId: string, email: string, actorId: string) {
    this.addEvent(
      this.createEvent('invite_resent', `Invite resent to ${email}`, {
        userId,
        email,
        actorId,
      }),
    );
  }

  // User lifecycle events
  logUserCreated(userId: string, email: string, role: string, actorId: string) {
    this.addEvent(
      this.createEvent('user_created', `User created: ${email} (${role})`, {
        userId,
        email,
        role,
        actorId,
      }),
    );
  }

  logUserUpdated(userId: string, email: string, fields: string[], actorId: string) {
    this.addEvent(
      this.createEvent('user_updated', `User updated: ${email} (${fields.join(', ')})`, {
        userId,
        email,
        fields,
        actorId,
      }),
    );
  }

  logUserDeleted(userId: string, email: string, actorId: string) {
    this.addEvent(
      this.createEvent('user_deleted', `User deleted: ${email}`, {
        userId,
        email,
        actorId,
      }),
    );
  }

  logUserRestored(userId: string, email: string, actorId: string) {
    this.addEvent(
      this.createEvent('user_restored', `User restored: ${email}`, {
        userId,
        email,
        actorId,
      }),
    );
  }

  logUserDisabled(userId: string, email: string, actorId: string) {
    this.addEvent(
      this.createEvent('user_disabled', `User disabled: ${email}`, {
        userId,
        email,
        actorId,
      }),
    );
  }

  logUserEnabled(userId: string, email: string, actorId: string) {
    this.addEvent(
      this.createEvent('user_enabled', `User enabled: ${email}`, {
        userId,
        email,
        actorId,
      }),
    );
  }

  logRoleChanged(userId: string, email: string, oldRole: string, newRole: string, actorId: string) {
    this.addEvent(
      this.createEvent('role_changed', `Role changed for ${email}: ${oldRole} → ${newRole}`, {
        userId,
        email,
        oldRole,
        newRole,
        actorId,
      }),
    );
  }

  logProfileUpdated(userId: string, email: string, fields: string[]) {
    this.addEvent(
      this.createEvent('profile_updated', `Profile updated: ${email} (${fields.join(', ')})`, {
        userId,
        email,
        fields,
      }),
    );
  }

  logOrphanCleaned(userId: string, actorId: string) {
    this.addEvent(
      this.createEvent('orphan_cleaned', `Orphaned user cleaned up: ${userId}`, {
        userId,
        actorId,
      }),
    );
  }

  // Query & management
  getEvents(limit?: number): AuthEvent[] {
    return limit ? this.events.slice(0, limit) : [...this.events];
  }

  getEventsByType(type: AuthEventType, limit?: number): AuthEvent[] {
    const filtered = this.events.filter((e) => e.type === type);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  getEventsByUserId(userId: string, limit?: number): AuthEvent[] {
    const filtered = this.events.filter((e) => e.userId === userId || e.actorId === userId);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  getRecentEvents(minutes: number): AuthEvent[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.events.filter((e) => e.timestamp >= cutoff);
  }

  clearEvents() {
    this.events = [];
  }

  // Listeners (for real-time UI updates)
  subscribe(listener: (event: AuthEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  // Export
  exportAsJSON(): string {
    return JSON.stringify(this.events, null, 2);
  }

  exportAsCSV(): string {
    const headers = ['Timestamp', 'Type', 'Message', 'User ID', 'Actor ID', 'Email', 'Metadata'];
    const rows = this.events.map((e) => [
      e.timestamp.toISOString(),
      e.type,
      e.message,
      e.userId || '',
      e.actorId || '',
      e.email || '',
      JSON.stringify(e.metadata || {}),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

// Singleton instance
export const authEventLogger = new AuthEventLogger();

export default authEventLogger;
