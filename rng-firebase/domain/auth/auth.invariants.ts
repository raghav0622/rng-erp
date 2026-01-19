// Auth invariants and documentation for Phase 1

/**
 * AUTH INVARIANTS (MANDATORY)
 *
 * STATE GUARANTEES:
 * - authenticated ⇒ user !== null
 * - email_unverified ⇒ user.isEmailVerified === false
 * - disabled ⇒ user.lifecycle === 'disabled'
 *
 * OWNER INVARIANTS:
 * - There is exactly one owner
 * - Owner email comes from process.env.OWNER_EMAIL
 * - Owner email mismatch MUST throw OwnerBootstrapError
 * - Second owner creation attempts MUST throw OwnerAlreadyExistsError
 * - Owner disable attempts MUST throw AuthDisabledError
 *
 * SIGNUP INVARIANTS:
 * - Signup is closed
 * - Signup allowed only if:
 *   - no users exist → owner bootstrap
 *   - valid invite exists → invited signup
 * - Disabled users are hard-blocked
 * - Email verification is mandatory (except bootstrap window)
 * - Violations MUST throw typed errors
 */

export const AUTH_INVARIANTS = {
  OWNER_EMAIL_ENV: 'OWNER_EMAIL',
  OWNER_ROLE: 'owner',
  SIGNUP_CLOSED: true,
  STATE_GUARANTEES: {
    authenticated: 'user !== null',
    email_unverified: 'user.isEmailVerified === false',
    disabled: "user.lifecycle === 'disabled'",
  },
  OWNER_INVARIANTS: {
    singleOwner: true,
    emailSource: 'process.env.OWNER_EMAIL',
    onMismatch: 'OwnerBootstrapError',
    onSecondOwner: 'OwnerAlreadyExistsError',
    onDisable: 'AuthDisabledError',
  },
};
