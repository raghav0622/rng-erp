# Kernel Feature Execution Entrypoint

This module is the **only public entrypoint** for executing features in the kernel. All app and UI code must call this, never feature classes or repositories directly.

## Usage

```ts
import { executeKernelFeature, executeKernelQuery } from './kernel-entrypoint';
import type { CommandFeature, QueryFeature } from './contracts/feature';
import type { ExecutionContext } from '../domain/auth/execution-context';

const feature: CommandFeature<{ foo: string }, { bar: number }> = { ... };
const ctx: ExecutionContext = ...; // Must be created by ExecutionContextService

const result = await executeKernelFeature(feature, ctx, { foo: 'baz' });
```

## Invariants

- All context creation, RBAC, and error mapping must be handled here.
- All errors are mapped to canonical kernel error types (see `errors/kernel-error-mapping.ts`).
- No app code may access repositories, auth, or RBAC directly.
- All feature execution must flow through this entrypoint.

## Error Handling

See `errors/kernel-error-mapping.ts` for canonical error mapping and bubbling rules.

## See Also

- [contracts/feature-execution-pipeline.ts](contracts/feature-execution-pipeline.ts)
- [contracts/feature.ts](contracts/feature.ts)
- [errors/kernel-error-mapping.ts](errors/kernel-error-mapping.ts)
