# 🔐 RNG Platform Kernel Constitution

## Kernel Bootstrap (LAW)

The RNG Platform kernel is initialized **exactly once** using a deterministic, fail-closed bootstrap process.

- All Firebase primitives (Firestore, Auth) are initialized by the host application and passed into the kernel.
- The kernel **never** initializes infrastructure itself.

---

## Bootstrap Diagram (AUTHORITATIVE)

```mermaid
flowchart TD
  A[Host App (Client / Next.js)] --> B[Firebase App Initialized]
  B --> C[Firestore Initialized]
  B --> D[Firebase Auth Initialized]
  A --> E[Feature Registry Defined]
  C --> F[initRngPlatform()]
  D --> F
  E --> F
  F --> G{Kernel Already Initialized?}
  G -- Yes --> X[KernelBootstrapError\nDOUBLE_INIT]
  G -- No --> H[Validate External Dependencies]
  H --> I{Firestore & Auth Valid?}
  I -- No --> Y[KernelMisconfigurationError]
  I -- Yes --> J[Validate Feature Registry]
  J --> K{Registry Valid?}
  K -- No --> Z[KernelInvariantViolationError]
  K -- Yes --> L[Freeze Feature Registry]
  L --> M[Register Default Domain Features]
  M --> N{All Required Domains Present?}
  N -- No --> Z
  N -- Yes --> O[Initialize Kernel Singletons]
  O --> P[Wire Repositories\n(rng-repository)]
  P --> Q[Seal Kernel State]
  Q --> R[Kernel READY (SEALED)]
```

---

## Bootstrap Laws (NON-NEGOTIABLE)

- `initRngPlatform()` may only be called once
- Firestore and Auth must be provided by the host
- Feature registry must be provided externally
- Feature registry is deep-frozen after bootstrap
- No feature, domain, or repository may be registered after boot
- Kernel state is immutable once sealed
- Any violation results in a typed kernel error

---

## Failure Modes

| Condition                | Result                        |
| ------------------------ | ----------------------------- |
| Double initialization    | KernelBootstrapError          |
| Missing Firestore/Auth   | KernelMisconfigurationError   |
| Invalid feature registry | KernelInvariantViolationError |
| Missing default domain   | KernelInvariantViolationError |
| Registry mutation        | KernelInvariantViolationError |

---

## Final State Guarantee

Once bootstrap completes successfully:

- Kernel is sealed
- Registry is immutable
- Domains are available
- Execution lifecycle is enforced
- UI code is strictly powerless
