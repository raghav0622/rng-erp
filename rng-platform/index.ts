// RNG Platform Public API Surface
// Only export production-ready, public API. No internal or repo exports.

// Kernel bootstrap
export { initRngPlatform } from './rng-kernel/bootstrap/bootstrap.service';

// Feature execution facade
export { executeFeatureFacade } from './rng-kernel/execution/execution.facade';

// React providers and boundaries
export { ReactQueryProvider } from './platform/react-query';
export { AuthBoundary, useAuth } from './platform/react/AuthBoundary';
export { ErrorBoundary } from './platform/react/ErrorBoundary';
export { KernelProvider, useKernel } from './platform/react/KernelProvider';
export { RBACBoundary, useRBAC } from './platform/react/RBACBoundary';
export { SuspenseBoundary } from './platform/react/SuspenseBoundary';

// Domain contracts (example: taxonomy)
export type { TaxonomyCategory } from './domain/taxonomy/taxonomy.contract';
export type { TaxonomyService } from './domain/taxonomy/taxonomy.service';
