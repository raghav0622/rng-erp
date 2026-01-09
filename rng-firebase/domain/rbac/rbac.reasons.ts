// RBAC Denial Reasons — Finalized
// Defines finite denial reasons for RBACDecision. All denials must use one of these.

export enum RBACDenialReason {
  ROLE_FORBIDDEN = 'ROLE_FORBIDDEN', // Role is not allowed for this action/feature
  ASSIGNMENT_MISSING = 'ASSIGNMENT_MISSING', // No assignment found for employee
  ASSIGNMENT_ESCALATION = 'ASSIGNMENT_ESCALATION', // Assignment would escalate beyond role ceiling
  FEATURE_UNKNOWN = 'FEATURE_UNKNOWN', // Feature is not recognized
  ACTION_UNKNOWN = 'ACTION_UNKNOWN', // Action is not recognized or is forbidden (wildcard, etc)
  ROLE_MISCONFIGURED = 'ROLE_MISCONFIGURED', // Role config missing or invalid
  OWNER_ONLY = 'OWNER_ONLY', // Action is owner-only
  CLIENT_RESTRICTED = 'CLIENT_RESTRICTED', // Clients are always denied
}

// RBACDecision.reason must reference only these reasons. No free text allowed.
