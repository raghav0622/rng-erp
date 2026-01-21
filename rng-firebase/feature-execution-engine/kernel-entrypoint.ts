// kernel-entrypoint.ts
// The only public entrypoint for executing features in the kernel.
// Enforces layering, context creation, RBAC, and error mapping.
import type { ExecutionContext } from '../domain/auth/execution-context';



// FeatureExecutionEngine is now internal-only. Use KernelExecutor for all feature execution.
// The only public entrypoint for executing features in the kernel.
// Enforces layering, context creation, RBAC, and error mapping.
import type { CommandFeature, QueryFeature } from './contracts/feature';

// KernelExecutor should be used for all feature execution.
// Implement the necessary functions here if needed.
  input: TInput,
