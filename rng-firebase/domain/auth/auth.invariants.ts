// Auth invariants and documentation for Phase 1

/**
 * AUTH INVARIANTS (MANDATORY)
 *
 * - There is exactly one owner
 * - Owner email comes from process.env.OWNER_EMAIL
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
};
