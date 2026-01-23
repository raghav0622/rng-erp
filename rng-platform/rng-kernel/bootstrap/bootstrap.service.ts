// Kernel Bootstrap Service (Phase 1)
// Implements atomic, single-run kernel bootstrap and feature registry lock-in.

import { KernelBootstrapError } from '../errors/kernel.errors';
import {
  deepFreezeFeatureRegistry,
  validateFeatureRegistry,
} from '../feature-registry/feature-registry.service';
import type { RngPlatformBootstrapOptions } from './bootstrap.contract';
import { getKernelState, setKernelBootData, setKernelState } from './bootstrap.state';

export function initRngPlatform(options: RngPlatformBootstrapOptions): void {
  if (getKernelState() !== 'UNINITIALIZED') {
    const err: KernelBootstrapError = {
      type: 'KERNEL_BOOTSTRAP_ERROR',
      reason: 'ALREADY_INITIALIZED',
      explanation: 'Kernel bootstrap may only be called once.',
    };
    throw err;
  }
  setKernelState('INITIALIZING');
  // Validate dependencies
  if (!options.firestore) {
    setKernelState('UNINITIALIZED');
    throw {
      type: 'KERNEL_BOOTSTRAP_MISSING_DEPENDENCY',
      explanation: 'Firestore must be provided and initialized by the host.',
      context: { dependency: 'firestore' },
    };
  }
  if (!options.firebaseAuth) {
    setKernelState('UNINITIALIZED');
    throw {
      type: 'KERNEL_BOOTSTRAP_MISSING_DEPENDENCY',
      explanation: 'Firebase Auth must be provided and initialized by the host.',
      context: { dependency: 'firebaseAuth' },
    };
  }
  // Validate and freeze feature registry
  // Convert readonly FeatureDefinition[] to mutable array for validation and freezing
  const mutableRegistry = Array.from(options.featureRegistry);
  try {
    validateFeatureRegistry(mutableRegistry);
  } catch (e) {
    setKernelState('UNINITIALIZED');
    throw {
      type: 'KERNEL_BOOTSTRAP_INVALID_FEATURE_REGISTRY',
      explanation: (e as Error).message || 'Invalid feature registry.',
      context: {},
    };
  }
  const frozenRegistry = deepFreezeFeatureRegistry(mutableRegistry);
  setKernelBootData({
    appName: options.appName,
    firestore: options.firestore,
    auth: options.firebaseAuth,
    featureRegistry: frozenRegistry,
  });
  setKernelState('LOCKED');
}
