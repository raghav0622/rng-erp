# FeatureExecutionEngine Usage

The `FeatureExecutionEngine` implements the `FeatureExecutionPipeline` contract and is the only entry point for executing features in the kernel.

## Usage Example

```ts
import { FeatureExecutionEngine } from './FeatureExecutionEngine';
import type { CommandFeature } from './contracts/feature';
import type { ExecutionContext } from '../domain/auth/execution-context';

const engine = new FeatureExecutionEngine();

// Example feature
const exampleFeature: CommandFeature<{ foo: string }, { bar: number }> = {
  name: 'ExampleFeature',
  feature: 'example',
  action: 'run',
  requiresAuth: true,
  requiresRBAC: true,
  async execute(ctx, input) {
    // ...feature logic...
    return { bar: 42 };
  },
};

// Example context (must be created by kernel, not app code)
const ctx: ExecutionContext = /* ... */;

// Execute feature
engine.executeFeature(exampleFeature, ctx, { foo: 'baz' })
  .then(result => console.log(result))
  .catch(err => console.error(err));
```

## Invariants

- All errors thrown by features are wrapped in `FeatureExecutionError`.
- Context must be immutable and centrally created.
- Features may not access RBAC/auth state directly, only via context.
- Features may not call other features or mutate context.

See `contracts/feature-execution-pipeline.ts` and `contracts/feature.ts` for details.
