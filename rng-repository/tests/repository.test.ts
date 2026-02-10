/**
 * Test file for rng-repository
 * This file sets up a test repository implementation and runs all contract tests
 *
 * REQUIREMENTS:
 * - Firestore emulator must be running (localhost:8080).
 * - firestore.rules must allow test_entities, test_entities_history, and _probe.
 *
 * STEPS:
 * 1. Start emulator: npm run emulator
 * 2. If you ever changed firestore.rules: STOP the emulator (Ctrl+C), start it again (npm run emulator).
 *    The emulator loads rules only at startup; otherwise history tests fail with "false for 'list' @ L74".
 * 3. Run tests: npm test or npx vitest run rng-repository
 */

import { beforeAll, describe, afterAll } from 'vitest';
import {
  Firestore,
  connectFirestoreEmulator,
  initializeFirestore,
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import { AbstractClientFirestoreRepository } from '../AbstractClientFirestoreRepository';
import { BaseEntity, IRepository, RepositoryConfig } from '../types';
import { runRepositoryContractTests } from './contract/repository.contract';
import { runAdvancedRepositoryContractTests } from './contract/advanced.repository.contract';

interface TestEntity extends BaseEntity {
  name: string;
  type?: string;
  value?: number;
  index?: number;
  status?: 'ACTIVE' | 'ARCHIVED';
  data?: string;
  special?: string;
  unicode?: string;
  newline?: string;
}

class TestRepository extends AbstractClientFirestoreRepository<TestEntity> {
  constructor(firestore: Firestore, config?: Partial<RepositoryConfig<TestEntity>>) {
    super(firestore, {
      collectionName: 'test_entities',
      softDelete: false,
      logging: false,
      forceOnline: true, // always persist to emulator in tests
      ...config,
    });
  }
}

// Firestore instance for testing
let firestore: Firestore;
let testApp: FirebaseApp;

// Setup cleanup function to clear test data (avoids cross-test pollution)
const cleanup = async () => {
  if (!firestore) return;
  try {
    const testColl = collection(firestore, 'test_entities');
    const snap = await getDocs(testColl);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  } catch (error) {
    // Ignore cleanup errors
  }
};

describe('Repository Tests', () => {
  beforeAll(async () => {
    try {
      // Initialize Firebase app for testing
      // Use a unique app name to avoid conflicts
      const appName = `test-app-${Date.now()}`;
      testApp = initializeApp(
        {
          projectId: 'test-project',
        },
        appName,
      );

      // Initialize Firestore with emulator connection
      firestore = initializeFirestore(testApp, {
        // Use memory cache for tests
      });

      // Connect to emulator
      try {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      } catch (e: any) {
        if (!e.message?.includes('already been initialized')) {
          console.warn('⚠️  Firestore emulator connection failed. Make sure emulator is running: npm run emulator');
        }
      }

      // Probe: ensure emulator is actually available (write + read); fail fast if unreachable
      const probeRef = doc(collection(firestore, '_probe'), 'ping');
      const probeTimeoutMs = 4000;
      const probe = (async () => {
        await setDoc(probeRef, { t: Date.now() });
        await getDoc(probeRef);
      })();
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Emulator probe timed out after ${probeTimeoutMs}ms`)),
          probeTimeoutMs,
        ),
      );
      await Promise.race([probe, timeout]);
    } catch (error) {
      console.error('Firestore initialization or emulator probe failed:', error);
      throw new Error(
        'Firestore emulator is required and must be running. Start it with: npm run emulator. Then run: npm test',
      );
    }
  }, 8000);

  afterAll(async () => {
    // Cleanup Firebase app
    if (testApp) {
      try {
        await deleteApp(testApp);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  // Run basic contract tests
  runRepositoryContractTests('TestRepository', async () => {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }
    return new TestRepository(firestore);
  }, cleanup);

  // Run advanced contract tests
  runAdvancedRepositoryContractTests('TestRepository', async (config?: any) => {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }
    return new TestRepository(firestore, config);
  }, cleanup);
});
