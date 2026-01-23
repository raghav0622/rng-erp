// RNG Kernel Bootstrap Contract
// No implementation. No Firebase. No React.

import type { Auth as FirebaseAuth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

export interface RngPlatformBootstrapOptions {
  appName: string;
  firebaseAuth: FirebaseAuth;
  firestore: Firestore;
  featureRegistry: ReadonlyArray<FeatureDefinition>;
}

export interface FeatureDefinition {
  id: string;
  actions: ReadonlyArray<string>;
}

/**
 * Initializes the RNG Platform kernel.
 * - May only be called once.
 * - Throws deterministic error on double init.
 * - No lazy globals.
 * - No Firebase, no React.
 */
export declare function initRngPlatform(options: RngPlatformBootstrapOptions): void;
