# KernelHostBoundary

## What Host CAN Do

- Initialize the kernel via `initializeKernel(config: KernelHostConfig)`
- Pass required repositories, adapters, and feature registry to the kernel at startup
- Use only the exported feature execution facade, planned auth/UI hooks, and RBAC guards
- Call feature execution methods as exposed by the kernel
- Read type definitions explicitly exported by the kernel

## What Host MUST NOT Do

- Import or access any repository or adapter directly from the kernel
- Mutate or rewire kernel configuration after initialization
- Access or mutate kernel-internal state, contracts, or domain logic
- Bypass, short-circuit, or patch any kernel contract or invariant
- Export or leak any repository, adapter, or internal type from the kernel
- Call or instantiate any domain service, repository, or adapter directly
- Attempt to dynamically mutate the feature registry or kernel wiring
- Assume any kernel-internal error or contract is stable for host use

## Enforcement

- Import structure: Only `initializeKernel` and explicitly exported types/facades are available
- Type exposure: Only contract types and facades are exported; all internal types are private
- No repository or adapter exports: All such exports are forbidden
- Kernel code assumes host is hostile but honest; all boundaries are fail-closed and immutable

---

Any violation of these boundaries is a kernel-breaking error and must be detected and fail-closed at runtime or compile time.
