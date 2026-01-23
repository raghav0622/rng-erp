// Kernel State Machine (Phase 1)
// Internal only. No exports beyond state accessors.

export type KernelBootstrapState = 'UNINITIALIZED' | 'INITIALIZING' | 'LOCKED';

interface KernelInternalState {
  state: KernelBootstrapState;
  appName?: string;
  firestore?: unknown;
  auth?: unknown;
  featureRegistry?: ReadonlyArray<unknown>;
}

const internalState: KernelInternalState = {
  state: 'UNINITIALIZED',
};

export function getKernelState(): KernelBootstrapState {
  return internalState.state;
}

export function setKernelState(newState: KernelBootstrapState): void {
  // Only allow legal transitions
  const valid =
    (internalState.state === 'UNINITIALIZED' && newState === 'INITIALIZING') ||
    (internalState.state === 'INITIALIZING' && newState === 'LOCKED') ||
    internalState.state === newState; // idempotent
  if (!valid) {
    throw {
      type: 'KERNEL_INVARIANT_VIOLATION',
      invariant: 'KERNEL_STATE_TRANSITION',
      explanation: `Illegal kernel state transition: ${internalState.state} → ${newState}`,
    };
  }
  internalState.state = newState;
}

export function setKernelBootData({
  appName,
  firestore,
  auth,
  featureRegistry,
}: {
  appName: string;
  firestore: unknown;
  auth: unknown;
  featureRegistry: ReadonlyArray<unknown>;
}): void {
  internalState.appName = appName;
  internalState.firestore = firestore;
  internalState.auth = auth;
  internalState.featureRegistry = featureRegistry;
}

export function getKernelBootData() {
  return {
    appName: internalState.appName,
    firestore: internalState.firestore,
    auth: internalState.auth,
    featureRegistry: internalState.featureRegistry,
  };
}
