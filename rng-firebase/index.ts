// Kernel Public vs Private Surface
// ================================
//
// Public Kernel Surface:
// - Feature DSL (future)
// - Feature hooks (future)
// - Auth hooks (future)
// - Auth guards (future)
//
// Private / Internal:
// - FirebaseAuthAdapter (adapters/firebase-auth.adapter.ts)
// - Auth state machine (domain/auth/auth.state-machine.ts)
// - AuthService orchestrator (domain/auth/auth.service.ts)
// - UserRepository (repositories/user.repository.ts)
// - RBAC engine (domain/rbac/rbac.engine.ts)
// - RBACService orchestrator (domain/rbac/rbac.service.ts)
// - RoleRepository (repositories/role.repository.ts)
// - AssignmentRepository (repositories/assignment.repository.ts) // INTERNAL ONLY
// - ExecutionContext creation
// - Firebase wiring
// - Audit plumbing
//
// Only the public surface is accessible to application code. All private/internal logic is strictly encapsulated within the kernel.
