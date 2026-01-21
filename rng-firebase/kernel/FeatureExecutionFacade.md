# FeatureExecutionFacade: Suspense-Ready Kernel Usage

The `FeatureExecutionFacade` provides a stable, promise-based API for executing features through the kernel, designed for use with React Suspense or any async boundary—**without importing React or leaking kernel internals**.

## Usage Pattern

```ts
import { FeatureExecutionFacade } from './FeatureExecutionFacade';
import { KernelExecutor } from './kernel-executor';

const facade = new FeatureExecutionFacade(kernelExecutorInstance);

// In a Suspense boundary or async context:
const promise = facade.execute(feature, userId, input);
// Use promise with Suspense, .then/.catch, or await
```

## Guarantees

- No side effects during call
- Stable promise semantics
- Errors are thrown, not returned (deterministic, typed)
- No React or UI dependencies
- No kernel internals leaked

## Example (Pseudo-React)

```ts
// Pseudo-code, not a real hook
function useFeatureResult(feature, userId, input) {
  const promise = facade.execute(feature, userId, input);
  // Suspense will suspend until promise resolves or throws
  throw promise;
}
```

**Do not import React or implement hooks in the kernel.**
