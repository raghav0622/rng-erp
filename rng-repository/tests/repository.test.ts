/**
 * Test file for rng-repository
 * This file sets up a test repository implementation and runs all contract tests
 *
 * When the Firestore emulator is not running, the entire suite is skipped so that
 * `npm test` still passes. To run repository tests: npm run emulator (in one terminal),
 * then npm test (or npx vitest run rng-repository).
 *
 * REQUIREMENTS when emulator is used:
 * - Firestore emulator must be running (localhost:8080).
 * - firestore.rules must allow test_entities, test_entities_history, and _probe.
 */

import { describe, afterAll } from 'vitest';
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

let firestore: Firestore;
let testApp: FirebaseApp;

const cleanup = async () => {
  if (!firestore) return;
  try {
    const testColl = collection(firestore, 'test_entities');
    const snap = await getDocs(testColl);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  } catch {
    // Ignore cleanup errors
  }
};

/** Probe emulator at load time; skip suite when unavailable so npm test passes without emulator. */
async function probeEmulator(): Promise<boolean> {
  try {
    const appName = `test-app-${Date.now()}`;
    testApp = initializeApp({ projectId: 'test-project' }, appName);
    firestore = initializeFirestore(testApp, {});
    try {
      connectFirestoreEmulator(firestore, 'localhost', 8080);
    } catch (e: unknown) {
      if (!(e instanceof Error) || !e.message?.includes('already been initialized')) {
        console.warn('Firestore emulator connection failed. Start with: npm run emulator');
      }
    }
    const probeRef = doc(collection(firestore, '_probe'), 'ping');
    const probeTimeoutMs = 4000;
    const probe = (async () => {
      await setDoc(probeRef, { t: Date.now() });
      await getDoc(probeRef);
    })();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Emulator probe timed out')), probeTimeoutMs),
    );
    await Promise.race([probe, timeout]);
    return true;
  } catch {
    return false;
  }
}

const emulatorAvailable = await probeEmulator();

describe.skipIf(!emulatorAvailable)('Repository Tests', () => {
  afterAll(async () => {
    if (testApp) {
      try {
        await deleteApp(testApp);
      } catch {
        // Ignore
      }
    }
  });

  runRepositoryContractTests('TestRepository', async () => {
    if (!firestore) throw new Error('Firestore not initialized');
    return new TestRepository(firestore);
  }, cleanup);

  runAdvancedRepositoryContractTests('TestRepository', async (config?: Partial<RepositoryConfig<TestEntity>>) => {
    if (!firestore) throw new Error('Firestore not initialized');
    return new TestRepository(firestore, config);
  }, cleanup);
});
