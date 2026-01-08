# Execution Lifecycle Invariants

> This document is law for all feature execution in the kernel.

Every feature execution MUST follow this order:

1. **Auth resolution**
2. **ExecutionContext creation** (centrally, deeply frozen)
3. **RBAC evaluation** (pure, deterministic)
4. **Feature execution** (using trusted context)
5. **Error propagation** (to Suspense/Error Boundaries)

No step may be skipped or reordered. No business logic, repository, or feature may violate this lifecycle.
