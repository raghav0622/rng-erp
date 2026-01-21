/**
 * Asserts that a user is allowed to sign in.
 * Throws with code 'USER_DISABLED' or 'EMAIL_NOT_VERIFIED' as appropriate.
 */
import type { AuditService } from '../audit/audit.service';
import { AuditEventType } from '../audit/audit.types';
import { AuthDisabledError, EmailNotVerifiedError } from '../auth/auth.errors';

export function assertUserSignInAllowed(
  user: { lifecycle: UserLifecycle; isEmailVerified: boolean },
  auditService?: AuditService,
  actor?: string,
): void {
  if (user.lifecycle === 'disabled') {
    if (auditService && actor) {
      auditService.record({
        type: AuditEventType.USER_DISABLED,
        actor,
        target: actor,
        reason: 'User is disabled',
        timestamp: Date.now(),
        details: { user },
      });
    }
    throw new AuthDisabledError();
  }
  if (!user.isEmailVerified) {
    if (auditService && actor) {
      auditService.record({
        type: AuditEventType.USER_DISABLED,
        actor,
        target: actor,
        reason: 'Email not verified',
        timestamp: Date.now(),
        details: { user },
      });
    }
    throw new EmailNotVerifiedError();
  }
}
// Explicit user lifecycle finite state machine and transition guards
// LAW: invited → active → disabled (terminal)

export type UserLifecycle = 'invited' | 'active' | 'disabled';

export class InvalidUserLifecycleTransitionError extends Error {
  readonly code = 'INVALID_USER_LIFECYCLE_TRANSITION';
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, InvalidUserLifecycleTransitionError.prototype);
  }
}

/**
 * Transition guard for user lifecycle
 * Throws InvalidUserLifecycleTransitionError on illegal transitions
 */
/**
 * Asserts that a user lifecycle transition is legal.
 * Throws InvalidUserLifecycleTransitionError on illegal transitions.
 * Must be called by AuthService and UserService for all lifecycle changes.
 */
export function assertUserTransition(from: UserLifecycle, to: UserLifecycle): void {
  if (from === 'disabled') {
    throw new InvalidUserLifecycleTransitionError(
      'Cannot transition from disabled (terminal state)',
    );
  }
  if (from === 'invited' && to === 'active') return;
  if (from === 'active' && to === 'disabled') return;
  if (from === to) return;
  throw new InvalidUserLifecycleTransitionError(`Invalid transition: ${from} → ${to}`);
}

/**
 * Client role invariants (enforced by code)
 * - Clients are always read-only
 * - Clients cannot be assigned
 * - Clients cannot be invited as manager/employee
 */
export const CLIENT_LIFECYCLE_INVARIANTS = {
  READ_ONLY: true,
  NO_ASSIGNMENTS: true,
  NO_INVITES: true,
};
