// Phase 0: Role Contract
// Defines the Role type and invariants for the kernel.

/**
 * Role contract
 *
 * Invariants:
 * - Roles are global
 * - Roles do NOT encode permissions
 * - Fine-grained access is assignment-based
 */
export type Role = 'owner' | 'manager' | 'employee' | 'client';
