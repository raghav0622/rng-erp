# RNG Kernel Contribution Law

## 1. What May Be Added

- Only contracts, invariants, and law documents may be added to the kernel.
- New domains or features must be defined by contract and invariants first.
- All changes must be fully documented and justified.

## 2. What May NEVER Be Added

// No side-effectful runtime logic or implementations.

- Pure, deterministic orchestration logic (e.g., feature execution, context construction) is allowed.
- No Firebase, React, repository, or side-effect code.
- No Firebase, React, or repository code.
- No hooks, services, or UI code.
  // No TODOs or incomplete types.
- No free-text errors or untyped exceptions.

## 3. Contract & Implementation Boundaries

- All contracts and pure orchestration logic live in `rng-kernel/` or `domain/` subfolders.
- All side-effectful implementations live outside the kernel, in platform or app layers.
- No implementation with side effects may leak into contracts or kernel orchestration.

## 4. Domain Evolution

- Domains evolve only via explicit, versioned contract changes.
- Breaking changes require consensus and a new version.
- Kernel-breaking changes are those that violate the constitution, contracts, or invariants.

## 5. Breaking Change Definition

- Any change that alters contract surface, invariants, or law documents is breaking.
- Any side-effectful runtime logic in the kernel is a breaking violation.
- Pure, deterministic orchestration code is explicitly allowed.

## 6. Enforcement

- All contributors and agents are bound by this law.
- Violations are subject to immediate rejection and rollback.

## 7. Amendments

- Amendments require explicit, versioned change and consensus.
