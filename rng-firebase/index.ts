// Sealed Kernel Entrypoint
// ABSOLUTE: Only export the sealed kernel initializer and allowed facades
export { initializeKernel } from './kernel/initializeKernel';
export type { KernelHostConfig, SealedKernel } from './kernel/KernelHostContract';
