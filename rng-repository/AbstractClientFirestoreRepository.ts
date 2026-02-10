/**
 * @version 2.0.0 — FROZEN (v2)
 *
 * Client Firestore repository implementation. Extend this class to create
 * collection-specific repositories. Public API is locked for v2.x; only
 * critical bug fixes and contract-aligned behavior changes are allowed.
 *
 * See: docs/repository-contract.md
 */

export const RNG_REPOSITORY_VERSION = '2.0.0';

import {
  collection,
  CollectionReference,
  deleteDoc,
  doc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  getCountFromServer,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  limit,
  onSnapshot,
  orderBy,
  Query,
  query,
  runTransaction,
  setDoc,
  startAfter,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import {
  AuditContext,
  BaseEntity,
  BatchOperationResult,
  CreateOptions,
  GetOptions,
  HistoryEntry,
  IRepository,
  PaginatedResult,
  QueryOptions,
  RepositoryConfig,
  RepositoryContext,
  RepositoryDiagnosticEvent,
  RepositoryHooks,
  UpdateData,
  UpdateOptions,
} from './types';

import { globalLogger } from './utils/logger';
import { RepositoryError, RepositoryErrorCode } from './errors';
import { applyCompression, applyDecompression } from './utils/compression';
import { encodeCursor } from './utils/cursor';
import { SimpleDataLoader } from './utils/dataloader';
import { applyDecryption, applyEncryption } from './utils/encryption';
import { flattenForUpdate } from './utils/flatten';
import { sanitizeForWrite } from './utils/sanitize';
import { convertTimestamps } from './utils/timestamps';

/**
 * 🔒 Frozen abstract client repository (v1).
 * Provides mechanical data access guarantees for Firestore-backed entities.
 * Responsibilities: batching, retries, optimistic locking, diagnostics, soft delete mechanics.
 * Non-responsibilities: RBAC, domain rules, orchestration—those belong to extensible layers above.
 * Stability: API and behavior are frozen; extend via hooks/configuration, not by modifying this class.
 */
export abstract class AbstractClientFirestoreRepository<
  T extends BaseEntity,
> implements IRepository<T> {
  public static readonly capabilities = {
    bulkWrite: true,
    softDelete: true,
    relations: true,
    optimisticLocking: true,
    realtime: true,
    aggregation: true,
  } as const;

  protected readonly collectionRef: CollectionReference<DocumentData>;
  protected readonly dataLoader: SimpleDataLoader<string, T | null>;
  protected readonly hooks: RepositoryHooks<T>;
  protected context: RepositoryContext = {};
  protected queryCache = new Map<string, any>();
  protected readonly maxQueryCacheSize: number;
  protected readonly maxOfflineQueueSize: number;
  protected readonly enableHistory: boolean;
  protected readonly maxHistorySize: number;
  protected readonly historyStorage: 'subcollection' | 'embedded';
  protected offlineQueue: {
    type: 'create' | 'update' | 'delete' | 'upsert' | 'softDelete' | 'restore';
    args: any[];
    timestamp: number;
    retryCount?: number;
  }[] = [];

  constructor(
    protected readonly firestore: Firestore,
    protected readonly config: RepositoryConfig<T>,
  ) {
    this.collectionRef = collection(this.firestore, this.config.collectionName);
    this.hooks = this.config.hooks || {};
    this.maxQueryCacheSize = this.config.maxQueryCacheSize ?? 100;
    this.maxOfflineQueueSize = this.config.maxOfflineQueueSize ?? 1000;
    this.enableHistory = this.config.enableHistory ?? false;
    this.maxHistorySize = this.config.maxHistorySize ?? 50;
    this.historyStorage = this.config.historyStorage ?? 'subcollection';

    // Initialize DataLoader for batching getById requests
    this.dataLoader = new SimpleDataLoader<string, T | null>(
      async (keys) => this.batchLoad(keys),
      { maxBatchSize: 10, delay: 10 }, // Firestore 'in' query limit is 10
    );

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.flushOfflineQueue());
    }
  }

  /**
   * Set the operation context for this repository instance
   */
  withContext(ctx: RepositoryContext): this {
    return this.cloneWithContext({ ...this.context, ...ctx });
  }

  /**
   * Clone repository with new context. Subclasses must override if they have additional constructor parameters.
   */
  protected cloneWithContext(ctx: RepositoryContext): this {
    const repo = new (this.constructor as any)(this.firestore, this.config) as this;
    repo.context = ctx;
    return repo;
  }

  /**
   * Assert that a capability is supported
   */
  assertCapability(name: keyof typeof AbstractClientFirestoreRepository.capabilities): void {
    if (!AbstractClientFirestoreRepository.capabilities[name]) {
      throw new RepositoryError(
        `Capability ${name} is not supported`,
        RepositoryErrorCode.FAILED_PRECONDITION,
      );
    }
  }

  /**
   * Log diagnostics if enabled
   */
  protected logDiagnostic(op: string, meta: any): void {
    const event: RepositoryDiagnosticEvent = {
      type: op.includes('read') || op.includes('find') || op.includes('get') ? 'READ' : 'WRITE',
      collection: this.config.collectionName,
      operation: op,
      context: this.context,
      ...meta,
    };

    if (this.config.onDiagnostic) {
      this.config.onDiagnostic(event);
    }

    if (this.config.enableDiagnostics) {
      globalLogger.debug(`[DIAGNOSTIC] ${this.config.collectionName}.${op}`, {
        ...meta,
        context: this.context,
        timestamp: new Date().toISOString(),
      });
    }
  }

  protected async checkInvariant(
    type: 'beforeCreate' | 'beforeUpdate' | 'beforeDelete',
    ...args: any[]
  ): Promise<void> {
    if (!this.config.invariants) return;
    const hook = this.config.invariants[type];
    if (hook) {
      // @ts-ignore
      await hook(...args);
    }
  }

  protected async retry<R>(operation: () => Promise<R>, context?: string): Promise<R> {
    const policy = this.config.retry;
    if (!policy) return operation();

    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (error: any) {
        attempt++;
        if (attempt > policy.retries) throw error;

        // Never retry invariant violations, validation failures, or permission errors
        const code = error?.code || error?.message;
        if (
          code === RepositoryErrorCode.FAILED_PRECONDITION ||
          code === RepositoryErrorCode.VALIDATION_FAILED ||
          code === RepositoryErrorCode.PERMISSION_DENIED ||
          code === RepositoryErrorCode.UNAUTHENTICATED
        ) {
          throw error;
        }

        // Check if retryable (v2.0.0: Support both Firestore codes and RepositoryErrorCode)
        const isRetryable =
          code === 'unavailable' ||
          code === 'deadline-exceeded' ||
          code === 'aborted' ||
          code === 'internal' ||
          code === RepositoryErrorCode.UNAVAILABLE ||
          code === RepositoryErrorCode.TIMEOUT ||
          code === RepositoryErrorCode.CONCURRENT_MODIFICATION;

        if (!isRetryable) throw error;

        this.logDiagnostic('retry', { attempt, error: code, context });
        const delay = policy.backoffMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  protected isOffline(): boolean {
    if (this.config.forceOnline) return false;
    return typeof navigator !== 'undefined' && !navigator.onLine;
  }

  /**
   * Add item to offline queue with size limit enforcement
   */
  protected enqueueOfflineOperation(
    type: 'create' | 'update' | 'delete' | 'upsert' | 'softDelete' | 'restore',
    args: any[],
  ): void {
    // Enforce queue size limit (FIFO: remove oldest entries)
    if (this.offlineQueue.length >= this.maxOfflineQueueSize) {
      const removed = this.offlineQueue.shift();
      this.logDiagnostic('offlineQueue.overflow', {
        removed: removed?.type,
        queueSize: this.offlineQueue.length,
      });
      if (this.config.logging) {
        globalLogger.warn('Offline queue overflow: removed oldest operation', {
          removedType: removed?.type,
          maxSize: this.maxOfflineQueueSize,
        });
      }
    }
    this.offlineQueue.push({
      type,
      args,
      timestamp: Date.now(),
    });
  }

  /**
   * Get history collection reference for a document (v2.0.0)
   */
  protected getHistoryCollectionRef(documentId: string): CollectionReference<DocumentData> {
    return collection(
      this.firestore,
      `${this.config.collectionName}_history`,
      documentId,
      'snapshots',
    );
  }

  /**
   * Save history snapshot before mutation (v2.0.0)
   */
  protected async saveHistorySnapshot(
    documentId: string,
    snapshot: T,
    operation: 'create' | 'update' | 'delete' | 'softDelete' | 'restore',
    context?: AuditContext,
  ): Promise<void> {
    if (!this.enableHistory) return;

    try {
      const historyEntry: Omit<HistoryEntry<T>, 'id'> = {
        documentId,
        snapshot,
        operation,
        timestamp: new Date(),
        actorId: context?.actorId,
        reason: context?.reason,
        version: snapshot._v || 0,
      };

      if (this.historyStorage === 'subcollection') {
        const historyRef = this.getHistoryCollectionRef(documentId);
        const entryRef = doc(historyRef);
        const payload = sanitizeForWrite({
          ...historyEntry,
          timestamp: historyEntry.timestamp instanceof Date
            ? Timestamp.fromDate(historyEntry.timestamp)
            : historyEntry.timestamp,
        });
        await setDoc(entryRef, payload);

        // Enforce max history size: delete oldest entries
        // Optimization: Only check if we're near the limit (check every 10 entries)
        // This reduces query overhead for frequent updates
        const shouldCheckLimit = Math.random() < 0.1 || true; // Always check for now, can be optimized
        if (shouldCheckLimit) {
          const historyQuery = query(historyRef, orderBy('timestamp', 'desc'), limit(this.maxHistorySize + 1));
          const historySnapshot = await getDocs(historyQuery);
          if (historySnapshot.docs.length > this.maxHistorySize) {
            const toDelete = historySnapshot.docs.slice(this.maxHistorySize);
            const batch = writeBatch(this.firestore);
            toDelete.forEach((docSnap) => batch.delete(docSnap.ref));
            await batch.commit();
          }
        }
      } else {
        // Embedded storage: store in document's _history array
        // Note: For 'create' operations, document doesn't exist yet, so we skip embedded history
        // (subcollection storage works fine for create)
        if (operation === 'create') {
          // Skip embedded history for create - document doesn't exist yet
          return;
        }

        const docRef = doc(this.collectionRef, documentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const currentData = docSnap.data();
          const history = (currentData._history as any[]) || [];
          const entry = {
            ...historyEntry,
            id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp:
              historyEntry.timestamp instanceof Date
                ? Timestamp.fromDate(historyEntry.timestamp)
                : historyEntry.timestamp,
          };
          history.push(sanitizeForWrite(entry));

          // Keep only last maxHistorySize entries
          const trimmedHistory = history.slice(-this.maxHistorySize);

          await updateDoc(docRef, {
            _history: trimmedHistory,
          });
        }
      }
    } catch (error) {
      if (this.config.logging) {
        globalLogger.warn('Failed to save history snapshot', { error, documentId });
      }
    }
  }

  /**
   * Save redo snapshot on the most recent history entry (v2.0.0, subcollection only).
   * Called after update so redo can restore to the new state.
   */
  protected async saveRedoSnapshot(documentId: string, result: T): Promise<void> {
    if (!this.enableHistory || this.historyStorage !== 'subcollection') return;
    try {
      const historyRef = this.getHistoryCollectionRef(documentId);
      const q = query(historyRef, orderBy('timestamp', 'desc'), limit(1));
      const snap = await getDocs(q);
      const latestDoc = snap.docs[0];
      if (!latestDoc) return;
      const payload = sanitizeForWrite({
        redoSnapshot: {
          ...result,
          updatedAt: result.updatedAt instanceof Date ? Timestamp.fromDate(result.updatedAt) : result.updatedAt,
          createdAt:
            result.createdAt instanceof Date ? Timestamp.fromDate(result.createdAt) : result.createdAt,
        },
      });
      await updateDoc(latestDoc.ref, payload);
    } catch (error) {
      if (this.config.logging) {
        globalLogger.warn('Failed to save redo snapshot', { error, documentId });
      }
    }
  }

  /**
   * Generate deterministic cache key for query options (v2.0.0)
   * Sorts object keys to ensure consistent hashing regardless of property order
   */
  protected generateQueryCacheKey(options: QueryOptions<T>): string {
    // Sort keys alphabetically for deterministic serialization
    const sortedOptions = this.sortObjectKeys(options);
    return JSON.stringify(sortedOptions);
  }

  /**
   * Recursively sort object keys for deterministic serialization
   */
  private sortObjectKeys(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.sortObjectKeys(item));

    const sorted: any = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = this.sortObjectKeys(obj[key]);
      });
    return sorted;
  }

  protected async flushOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    this.logDiagnostic('offlineQueue.flushStart', { count: this.offlineQueue.length });

    while (this.offlineQueue.length > 0) {
      if (this.isOffline()) {
        this.logDiagnostic('offlineQueue.paused', { remaining: this.offlineQueue.length });
        return;
      }

      const item = this.offlineQueue[0];
      if (!item) {
        this.offlineQueue.shift();
        continue;
      }

      try {
        this.logDiagnostic('offlineQueue.replay', { item });

        switch (item.type) {
          case 'create':
            await this.create(item.args[0], item.args[1], item.args[2]);
            break;
          case 'update':
            await this.update(item.args[0], item.args[1], item.args[2], item.args[3]);
            break;
          case 'delete':
            await this.delete(item.args[0], item.args[1]);
            break;
          case 'upsert':
            await this.upsert(item.args[0], item.args[1]);
            break;
          case 'softDelete':
            if (this.softDelete) await this.softDelete(item.args[0], item.args[1]);
            break;
          case 'restore':
            if (this.restore) await this.restore(item.args[0], item.args[1]);
            break;
        }

        this.logDiagnostic('offlineQueue.success', { item });
        this.offlineQueue.shift();
      } catch (e) {
        this.logDiagnostic('offlineQueue.error', { item, error: e });
        item.retryCount = (item.retryCount || 0) + 1;
        return; // Stop flushing on error to preserve order
      }
    }

    this.logDiagnostic('offlineQueue.flushComplete', {});
  }

  /**
   * Batch loader function for DataLoader
   */
  private async batchLoad(ids: string[]): Promise<(T | null | Error)[]> {
    try {
      // Firestore 'in' query supports up to 10 values
      // The SimpleDataLoader should be configured with maxBatchSize: 10

      // Contract: filter out empty/invalid IDs (Firestore rejects empty string in 'in' query)
      const uniqueIds = [...new Set(ids)];
      const validIds = uniqueIds.filter((id) => id != null && id !== '');
      if (validIds.length === 0) {
        return ids.map(() => null);
      }

      const q = query(this.collectionRef, where('__name__', 'in', validIds));
      const snapshot = await getDocs(q);

      const docMap = new Map<string, T>();

      for (const docSnap of snapshot.docs) {
        const data = await this.processRead(docSnap);
        if (data) {
          // Soft delete check for batch load (consistent with query level enforcement)
          // But getById usually allows fetching deleted for restore.
          // We will NOT filter here to allow getById to return deleted docs if needed.
          // The prompt says "Ensure all queries exclude soft-deleted documents by default... Apply this consistently in: list, getMany, relation population queries".
          // getMany uses this batchLoad. So we SHOULD filter if softDelete is on.
          // But wait, getById also uses this.
          // If we filter here, getById(id) will return null for deleted doc.
          // Then restore(id) which calls getById(id) will fail with NOT_FOUND.
          // So we must NOT filter in batchLoad used by getById/restore.
          // We should filter in getMany if needed, or allow getMany to have options.
          // But getMany signature is `getMany(ids: string[])`.
          // Let's assume getMany returns everything and caller filters, OR we change getMany signature.
          // The prompt says "Modify get, list, and getMany to support: get(id, { populate: ... })".
          // So we will update getMany signature too.

          docMap.set(docSnap.id, data);
        }
      }

      return ids.map((id) => (id === '' || id == null ? null : docMap.get(id) || null));
    } catch (error) {
      return ids.map(() => RepositoryError.fromError(error));
    }
  }

  /**
   * Process a document snapshot after read:
   * 1. Convert timestamps
   * 2. Decrypt
   * 3. Decompress
   * 4. Apply migrations
   * 5. Trigger read repair if needed
   */
  protected async processRead(docSnap: DocumentSnapshot): Promise<T | null> {
    if (!docSnap.exists()) {
      return null;
    }

    let data = docSnap.data();

    // 1. Convert Timestamps
    data = convertTimestamps(data);

    // 2. Decompress
    if (this.config.compressionStrategy) {
      data = applyDecompression(data, this.config.compressionStrategy);
    }

    // 3. Decrypt
    if (this.config.encryptionStrategy && this.config.sensitiveFields) {
      data = applyDecryption(data, this.config.sensitiveFields, this.config.encryptionStrategy);
    }

    // 4. Migrations (v2.0.0: Respect migrationStrategy config)
    let migrated = false;
    const migrationStrategy = this.config.migrationStrategy || 'eager';
    const shouldRunMigrationsOnRead =
      migrationStrategy === 'eager' || // Always run on read
      migrationStrategy === 'lazy'; // Run on read if migrations exist

    if (this.config.migrations && shouldRunMigrationsOnRead) {
      const currentVersion = data._v || 0;
      const migrations = this.config.migrations;
      const versions = Object.keys(migrations)
        .map(Number)
        .sort((a, b) => a - b);

      for (const version of versions) {
        if (version > currentVersion) {
          try {
            const migrationFn = migrations[version];
            if (migrationFn) {
              data = migrationFn(data);
              data._v = version;
              migrated = true;
            }
          } catch (e) {
            globalLogger.error(`Migration failed for doc ${docSnap.id} to version ${version}`, {
              error: e,
            });
            // Fail open: return partially migrated or original data, don't block read
            // Note: 'write-only' strategy skips migrations on read entirely
          }
        }
      }
    }

    const entity = { id: docSnap.id, ...data } as T;

    // 5. Read Repair (Async)
    if (migrated) {
      this.logDiagnostic('readRepair', { id: docSnap.id, version: entity._v });
      this.persistMigration(entity).catch((err) => {
        if (this.config.logging)
          globalLogger.error(`Read repair failed for ${entity.id}`, { error: err });
      });
    }

    return entity;
  }

  /**
   * Run migrations on data for write operations (v2.0.0: write-only strategy support)
   */
  protected applyMigrationsForWrite(data: any): any {
    const migrationStrategy = this.config.migrationStrategy || 'eager';
    const shouldRunMigrationsOnWrite =
      migrationStrategy === 'write-only' || // Run only on write
      migrationStrategy === 'eager' || // Always run
      migrationStrategy === 'lazy'; // Run if migrations exist

    if (!this.config.migrations || !shouldRunMigrationsOnWrite) {
      return data;
    }

    let migrated = false;
    const currentVersion = data._v || 0;
    const migrations = this.config.migrations;
    const versions = Object.keys(migrations)
      .map(Number)
      .sort((a, b) => a - b);

    for (const version of versions) {
      if (version > currentVersion) {
        try {
          const migrationFn = migrations[version];
          if (migrationFn) {
            data = migrationFn(data);
            data._v = version;
            migrated = true;
          }
        } catch (e) {
          globalLogger.error(`Migration failed during write to version ${version}`, {
            error: e,
          });
          // Fail open: continue with partially migrated data
        }
      }
    }

    return data;
  }

  private async persistMigration(entity: T): Promise<void> {
    // We need to reverse the process: Encrypt -> Compress -> Write
    // But we should be careful not to overwrite newer data if concurrent update happened.
    // Ideally use optimistic locking or just set if we are sure.
    // For simplicity in this abstraction, we'll skip complex locking for read-repair
    // and just try to update the fields that changed + version.

    // Re-encrypt/compress is needed.
    let dataToSave: any = { ...entity };
    delete dataToSave.id; // Don't save ID in doc

    if (this.config.encryptionStrategy && this.config.sensitiveFields) {
      dataToSave = applyEncryption(
        dataToSave,
        this.config.sensitiveFields,
        this.config.encryptionStrategy,
      );
    }

    if (this.config.compressionStrategy) {
      dataToSave = applyCompression(dataToSave, this.config.compressionStrategy);
    }

    const docRef = doc(this.collectionRef, entity.id);
    await updateDoc(docRef, dataToSave);
  }

  /**
   * Populate relations for an entity (v2.0.0: Configurable failure mode)
   * @returns Populated entity with optional _populationMetadata tracking failures
   */
  protected async populateRelations(entity: T, fields: string[]): Promise<T> {
    if (!this.config.relations || fields.length === 0) return entity;

    const populated = { ...entity };
    const failedFields: string[] = [];
    const failureMode = this.config.populationFailureMode || 'warn';

    // We process in parallel for better client-side performance
    await Promise.all(
      fields.map(async (field) => {
        const relation = this.config.relations![field];
        if (!relation) return;

        const foreignId = (entity as any)[relation.localKey];
        if (!foreignId) return;

        try {
          const foreignColl = collection(this.firestore, relation.collection);
          let q: Query = foreignColl;

          if (relation.foreignKey && relation.foreignKey !== '__docId__') {
            q = query(q, where(relation.foreignKey, '==', foreignId));
            // Soft delete check for relation
            if (this.config.softDelete) {
              q = query(q, where('deletedAt', '==', null));
            }
            const snap = await getDocs(query(q, limit(1)));
            if (!snap.empty) {
              const d = snap.docs[0]!.data();
              if (d) {
                (populated as any)[field] = { id: snap.docs[0]!.id, ...d };
              }
            }
          } else {
            // By ID
            const qById = query(foreignColl, where('__name__', '==', foreignId));
            const qFiltered = this.config.softDelete
              ? query(qById, where('deletedAt', '==', null))
              : qById;

            const snapById = await getDocs(qFiltered);
            if (!snapById.empty) {
              const d = snapById.docs[0]!.data();
              if (d) {
                (populated as any)[field] = { id: snapById.docs[0]!.id, ...d };
              }
            }
          }
        } catch (e) {
          failedFields.push(field);

          // v2.0.0: Respect failure mode configuration
          if (failureMode === 'throw') {
            throw new RepositoryError(
              `Failed to populate relation '${field}': ${e instanceof Error ? e.message : String(e)}`,
              RepositoryErrorCode.UNKNOWN,
              e,
            );
          } else if (failureMode === 'warn' && this.config.logging) {
            globalLogger.warn(`Failed to populate relation '${field}'`, { error: e });
          }
          // 'silent' mode: no action
        }
      }),
    );

    // Add metadata if any failures occurred
    if (failedFields.length > 0) {
      (populated as any)._populationMetadata = { failed: failedFields };
    }

    return populated;
  }

  /**
   * Get a single document by ID
   * @param id Document ID
   * @param options Get options including includeDeleted flag
   * @returns The document or null if not found or soft-deleted (unless includeDeleted: true)
   */
  async getById(id: string, options: GetOptions = {}): Promise<T | null> {
    try {
      // Contract: empty string ID returns null without calling Firestore
      if (id === '') {
        return null;
      }
      if (options.readConsistency === 'STRONG') {
        this.logDiagnostic('getById.strong', { id });
        const docRef = doc(this.collectionRef, id);
        const snap = await getDocFromServer(docRef);
        return this.processRead(snap);
      }

      // Check cache first (only if no options that affect result, like populate)
      // If populate is requested, cached version might not have it.
      // We could cache populated version, but key needs to include options.
      const cacheKey = options.populate
        ? `${this.config.collectionName}:${id}:${options.populate.sort().join(',')}`
        : `${this.config.collectionName}:${id}`;

      if (this.config.cacheProvider) {
        try {
          const cached = await this.config.cacheProvider.get<T>(cacheKey);
          if (cached) return cached;
        } catch (e) {
          if (this.config.logging) globalLogger.warn('Cache get failed', { error: e });
        }
      }

      // Bypass DataLoader if any options are present that affect the result
      const hasOptions =
        options.populate ||
        options.includeDeleted !== undefined ||
        options.select ||
        options.readConsistency;

      let result: T | null = null;

      if (!hasOptions && this.dataLoader) {
        result = await this.dataLoader.load(id);
      } else {
        const docRef = doc(this.collectionRef, id);
        const snap = await getDoc(docRef);
        result = await this.processRead(snap);
      }

      if (!result) return null;

      // Soft Delete Check (v2.0.0: Added diagnostic event)
      if (this.config.softDelete && !options.includeDeleted && result.deletedAt) {
        this.logDiagnostic('softDelete.filtered', { id, deletedAt: result.deletedAt });
        return null;
      }

      // Populate
      if (options.populate) {
        result = await this.populateRelations(result, options.populate);
      }

      // Set cache
      if (result && this.config.cacheProvider) {
        try {
          await this.config.cacheProvider.set(cacheKey, result);
        } catch (e) {
          if (this.config.logging) globalLogger.warn('Cache set failed', { error: e });
        }
      }

      return result;
    } catch (error) {
      throw RepositoryError.fromError(error);
    }
  }

  /**
   * Get a single document by ID, including soft-deleted documents
   * Helper method for operations that need to access deleted docs (e.g., restore)
   * @param id Document ID
   * @param options Get options (includeDeleted will be overridden to true)
   * @returns The document or null if not found
   */
  async getByIdIncludingDeleted(id: string, options: GetOptions = {}): Promise<T | null> {
    return this.getById(id, { ...options, includeDeleted: true });
  }

  /**
   * Get multiple documents by ID
   * @param ids Array of document IDs
   * @param options Get options including includeDeleted flag (default: false)
   * @returns Array of documents (null for not found or soft-deleted entries)
   */
  async getMany(ids: string[], options: GetOptions = {}): Promise<(T | null)[]> {
    try {
      if (options.readConsistency === 'STRONG') {
        // No batch support for getDocFromServer easily without loop
        // Or we use 'in' query with getDocsFromServer
        const uniqueIds = [...new Set(ids)];
        // Chunking needed if > 10
        const chunks = [];
        for (let i = 0; i < uniqueIds.length; i += 10) {
          chunks.push(uniqueIds.slice(i, i + 10));
        }

        const resultsMap = new Map<string, T>();
        for (const chunk of chunks) {
          const q = query(this.collectionRef, where('__name__', 'in', chunk));
          const snap = await getDocsFromServer(q);
          for (const docSnap of snap.docs) {
            const data = await this.processRead(docSnap);
            if (data) resultsMap.set(docSnap.id, data);
          }
        }
        return ids.map((id) => resultsMap.get(id) || null);
      }

      // Bypass DataLoader if any options affect results
      const hasOptions = options.populate || options.includeDeleted !== undefined || options.select;

      let results: (T | null | Error)[];
      if (hasOptions) {
        // Fetch directly without DataLoader
        results = await Promise.all(
          ids.map(async (id) => {
            try {
              const docRef = doc(this.collectionRef, id);
              const snap = await getDoc(docRef);
              return await this.processRead(snap);
            } catch (error) {
              return RepositoryError.fromError(error);
            }
          }),
        );
      } else {
        results = await this.dataLoader.loadMany(ids);
      }

      const processedResults: (T | null)[] = [];

      for (const result of results) {
        if (result instanceof Error) {
          // DataLoader returns Error for failed fetches
          if (this.config.logging) globalLogger.warn('Error in getMany', { result });
          processedResults.push(null);
          continue;
        }

        if (!result) {
          processedResults.push(null);
          continue;
        }

        // Soft Delete Check (v2.0.0: Added diagnostic event)
        if (this.config.softDelete && !options.includeDeleted && result.deletedAt) {
          this.logDiagnostic('softDelete.filtered', {
            id: (result as any).id,
            deletedAt: result.deletedAt,
          });
          processedResults.push(null);
          continue;
        }

        // Populate
        if (options.populate) {
          processedResults.push(await this.populateRelations(result, options.populate));
        } else {
          processedResults.push(result);
        }
      }

      return processedResults;
    } catch (error) {
      throw RepositoryError.fromError(error);
    }
  }

  /**
   * Find documents with query options
   */
  async find(options: QueryOptions<T> = {}): Promise<PaginatedResult<T>> {
    // v2.0.0: Deterministic cache key generation
    const cacheKey = this.generateQueryCacheKey(options);
    if (this.queryCache.has(cacheKey)) {
      this.logDiagnostic('find.cacheHit', { options });
      return this.queryCache.get(cacheKey);
    }

    this.logDiagnostic('find', { options });

    // Projection Guard
    if (options.select && this.config.allowedSelect) {
      const invalid = options.select.filter(
        (k) => !this.config.allowedSelect!.includes(k as keyof T),
      );
      if (invalid.length > 0) {
        throw new RepositoryError(
          `Fields not allowed: ${invalid.join(', ')}`,
          RepositoryErrorCode.PERMISSION_DENIED,
        );
      }
    }

    try {
      let q: Query = this.collectionRef;

      // Apply filters
      if (options.where) {
        for (const [field, op, value] of options.where) {
          q = query(q, where(field, op, value));
        }
      }

      // Soft delete filter
      if (this.config.softDelete && !options.includeDeleted) {
        q = query(q, where('deletedAt', '==', null));
      }

      // Ordering
      if (options.orderBy) {
        for (const [field, direction] of options.orderBy) {
          q = query(q, orderBy(field, direction));
        }
      }

      // Pagination - StartAfter
      if (options.startAfter) {
        // Cursors only work correctly with __name__ ordering
        const hasNonIdOrdering = options.orderBy?.some(([field]) => field !== '__name__');
        if (hasNonIdOrdering) {
          this.logDiagnostic('cursorMisuse', { orderBy: options.orderBy });
          throw new RepositoryError(
            'Cursor pagination is only supported with __name__ ordering',
            RepositoryErrorCode.INVALID_ARGUMENT,
          );
        }

        if (typeof options.startAfter === 'string') {
          const cursorDocRef = doc(this.collectionRef, options.startAfter);
          const cursorSnap = await getDoc(cursorDocRef);

          if (cursorSnap.exists()) {
            q = query(q, startAfter(cursorSnap));
          } else {
            throw new RepositoryError(
              'Invalid cursor: document not found',
              RepositoryErrorCode.INVALID_ARGUMENT,
            );
          }
        } else {
          q = query(q, startAfter(options.startAfter));
        }
      }

      // Limit
      const limitVal = options.limit || 20;
      q = query(q, limit(limitVal));

      const snapshot =
        options.readConsistency === 'STRONG' ? await getDocsFromServer(q) : await getDocs(q);
      const results: T[] = [];

      for (const docSnap of snapshot.docs) {
        let data = await this.processRead(docSnap);
        if (data) {
          // Apply selection if needed (client-side projection)
          if (options.select) {
            const selected: any = { id: data.id }; // Always include ID
            options.select.forEach((k) => (selected[k as string] = data![k as keyof T]));
            data = selected as T;
          }

          if (options.populate) {
            data = await this.populateRelations(data, options.populate);
          }
          results.push(data);
        }
      }

      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      const nextCursor = lastDoc ? encodeCursor(lastDoc) : undefined;

      const result = {
        data: results,
        nextCursor,
        hasMore: snapshot.docs.length === limitVal,
      };

      // Enforce cache size limit (LRU: remove oldest entries)
      if (this.queryCache.size >= this.maxQueryCacheSize) {
        const firstKey = this.queryCache.keys().next().value;
        if (firstKey) {
          this.queryCache.delete(firstKey);
        }
      }
      this.queryCache.set(cacheKey, result);
      return result;
    } catch (error) {
      throw RepositoryError.fromError(error);
    }
  }

  /**
   * Create a new document
   */
  async create(
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    context?: AuditContext,
    options: CreateOptions = {},
  ): Promise<T> {
    // Clear query cache on write
    this.queryCache.clear();
    this.logDiagnostic('create', { id: (data as any).id, context });

    // Offline Queue
    if (this.isOffline()) {
      const id = (data as any).id || doc(this.collectionRef).id;
      this.enqueueOfflineOperation('create', [data, context, options]);
      this.logDiagnostic('offline.queue', { type: 'create', id });
      // Return placeholder (contract: include _v: 1)
      return {
        id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        _v: 1,
        _offlineQueued: true,
      } as unknown as T;
    }

    return this.retry(async () => {
      try {
        // 1. Hooks: beforeCreate
        if (this.hooks.beforeCreate) {
          try {
            await this.hooks.beforeCreate(data, context);
          } catch (e) {
            if (this.config.logging) globalLogger.error('beforeCreate hook failed', { error: e });
            // Standardize: abort operation on hook failure (consistent with beforeUpdate)
            throw e;
          }
        }

        // Invariant Check
        await this.checkInvariant('beforeCreate', data, context);

        // 2. Validation
        if (this.config.validateSchema && !this.config.validateSchema(data as any)) {
          throw new RepositoryError(
            'Schema validation failed',
            RepositoryErrorCode.VALIDATION_FAILED,
          );
        }

        // 3. Prepare data & ID Strategy
        let id: string;
        if (this.config.idStrategy === 'client') {
          if (!(data as any).id) {
            throw new RepositoryError(
              'Missing ID for client strategy',
              RepositoryErrorCode.VALIDATION_FAILED,
            );
          }
          id = (data as any).id;
        } else if (this.config.idStrategy === 'deterministic') {
          if (!this.config.idGenerator) {
            throw new RepositoryError(
              'Missing idGenerator for deterministic strategy',
              RepositoryErrorCode.FAILED_PRECONDITION,
            );
          }
          id = this.config.idGenerator(data);
        } else {
          id = (data as any).id || doc(this.collectionRef).id;
        }

        const now = new Date();

        let payload: any = {
          id, // Ensure id is present in document data
          ...data,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          _v: 1, // Initial version
        };

        // 4. Encryption
        if (this.config.encryptionStrategy && this.config.sensitiveFields) {
          payload = applyEncryption(
            payload,
            this.config.sensitiveFields,
            this.config.encryptionStrategy,
          );
        }

        // 5. Compression
        if (this.config.compressionStrategy) {
          payload = applyCompression(payload, this.config.compressionStrategy);
        }

        // 6. Sanitize
        payload = sanitizeForWrite(payload);

        // 7. Save history snapshot (before write)
        const result = { id, ...data, createdAt: now, updatedAt: now, deletedAt: null, _v: 1 } as T;
        await this.saveHistorySnapshot(id, result, 'create', context);

        // 8. Write to Firestore
        const docRef = doc(this.collectionRef, id);
        await setDoc(docRef, payload);

        // 9. Search Indexing
        if (this.config.searchProvider) {
          try {
            await this.config.searchProvider.index(this.config.collectionName, id, result, context);
          } catch (e) {
            if (this.config.logging) globalLogger.error('Search index failed', { error: e });
          }
        }

        // 10. Cache
        if (this.config.cacheProvider) {
          try {
            await this.config.cacheProvider.set(`${this.config.collectionName}:${id}`, result);
          } catch (e) {
            if (this.config.logging) globalLogger.warn('Cache set failed', { error: e });
          }
        }

        // 11. Hooks: afterCreate
        if (this.hooks.afterCreate) {
          try {
            await this.hooks.afterCreate(result, context);
          } catch (e) {
            if (this.config.logging) globalLogger.error('afterCreate hook failed', { error: e });
          }
        }

        return result;
      } catch (error) {
        throw RepositoryError.fromError(error);
      }
    }, 'create');
  }

  /**
   * Update a document
   */
  async update(
    id: string,
    data: UpdateData<T>,
    context?: AuditContext,
    options: UpdateOptions = {},
  ): Promise<T> {
    // Clear query cache on write
    this.queryCache.clear();
    this.logDiagnostic('update', { id, context });

    // Offline Queue
    if (this.isOffline()) {
      this.enqueueOfflineOperation('update', [id, data, context, options]);
      this.logDiagnostic('offline.queue', { type: 'update', id });
      // Return placeholder - we don't have current state easily without read, but we can return updates
      // Best effort: return what we have.
      return {
        id,
        ...data,
        updatedAt: new Date(),
        _offlineQueued: true,
      } as unknown as T;
    }

    return this.retry(async () => {
      try {
        // Invariant Check
        await this.checkInvariant('beforeUpdate', id, data, context);

        // Read current document for history (before transaction)
        const currentDocRef = doc(this.collectionRef, id);
        const currentDocSnap = await getDoc(currentDocRef);
        if (!currentDocSnap.exists()) {
          throw new RepositoryError(`Document ${id} not found`, RepositoryErrorCode.NOT_FOUND);
        }

        let currentDataForHistory = currentDocSnap.data();
        currentDataForHistory = convertTimestamps(currentDataForHistory);
        if (this.config.compressionStrategy) {
          currentDataForHistory = applyDecompression(currentDataForHistory, this.config.compressionStrategy);
        }
        if (this.config.encryptionStrategy && this.config.sensitiveFields) {
          currentDataForHistory = applyDecryption(
            currentDataForHistory,
            this.config.sensitiveFields,
            this.config.encryptionStrategy,
          );
        }
        const currentForHistory = { id: currentDocSnap.id, ...currentDataForHistory } as T;

        // Save history snapshot (before update); skip when restoring from undo/redo
        if (!options.skipHistory) {
          await this.saveHistorySnapshot(id, currentForHistory, 'update', context);
        }

        // We use runTransaction to ensure optimistic locking and atomic read-modify-write
        const { result, previous } = await runTransaction(this.firestore, async (transaction) => {
          const docRef = doc(this.collectionRef, id);
          const docSnap = await transaction.get(docRef);

          if (!docSnap.exists()) {
            throw new RepositoryError(`Document ${id} not found`, RepositoryErrorCode.NOT_FOUND);
          }

          let currentData = docSnap.data();
          currentData = convertTimestamps(currentData);

          if (this.config.compressionStrategy) {
            currentData = applyDecompression(currentData, this.config.compressionStrategy);
          }
          if (this.config.encryptionStrategy && this.config.sensitiveFields) {
            currentData = applyDecryption(
              currentData,
              this.config.sensitiveFields,
              this.config.encryptionStrategy,
            );
          }

          // v2.0.0: Run migrations on write for 'write-only' strategy
          const migrationStrategy = this.config.migrationStrategy || 'eager';
          if (migrationStrategy === 'write-only' && this.config.migrations) {
            currentData = this.applyMigrationsForWrite(currentData);
          }

          const current = { id: docSnap.id, ...currentData } as T;

          // 2. Optimistic Locking (v2.0.0: Strict _v required)
          if (options.optimisticLock) {
            // Strict check: Must provide and match _v
            if (typeof data._v !== 'number' || typeof current._v !== 'number') {
              throw new RepositoryError(
                'Optimistic lock requested but _v (version) field not provided or invalid. ' +
                  'When optimisticLock is true, update data must include current document _v value.',
                RepositoryErrorCode.VALIDATION_FAILED,
              );
            }

            if (data._v !== current._v) {
              throw new RepositoryError(
                `Optimistic lock failed: version mismatch (expected ${data._v}, actual ${current._v}). ` +
                  'Document was modified by another process.',
                RepositoryErrorCode.CONCURRENT_MODIFICATION,
              );
            }
          }

          // 4. Hooks: beforeUpdate
          if (this.hooks.beforeUpdate) {
            try {
              await this.hooks.beforeUpdate(id, data as Partial<T>, current, context);
            } catch (e) {
              if (this.config.logging) globalLogger.error('beforeUpdate hook failed', { error: e });
              // If hook fails, do we abort? Yes, usually.
              throw e;
            }
          }

          // 5. Prepare update payload
          const now = new Date();
          let updates: any = {
            ...data,
            updatedAt: now,
            _v: (current._v || 0) + 1,
          };

          delete updates.id;

          if (this.config.encryptionStrategy && this.config.sensitiveFields) {
            updates = applyEncryption(
              updates,
              this.config.sensitiveFields,
              this.config.encryptionStrategy,
            );
          }

          if (this.config.compressionStrategy) {
            const merged = { ...current, ...data, updatedAt: now };
            const compressed = applyCompression(merged, this.config.compressionStrategy);
            updates = compressed;
          }

          const flattenedUpdates = flattenForUpdate(updates);
          const sanitizedUpdates = sanitizeForWrite(flattenedUpdates);

          transaction.update(docRef, sanitizedUpdates);

          const nextV = (current._v || 0) + 1;
          const result = { ...current, ...data, updatedAt: now, _v: nextV } as T;
          return { result, previous: current };
        });

        // Post-transaction actions

        // 11. Search Indexing
        if (this.config.searchProvider) {
          try {
            await this.config.searchProvider.index(this.config.collectionName, id, result, context);
          } catch (e) {
            if (this.config.logging) globalLogger.error('Search index failed', { error: e });
          }
        }

        // 12. Cache Update
        if (this.config.cacheProvider) {
          try {
            await this.config.cacheProvider.set(`${this.config.collectionName}:${id}`, result);
          } catch (e) {
            if (this.config.logging) globalLogger.warn('Cache set failed', { error: e });
          }
        }

        // Clear DataLoader cache
        this.dataLoader.clear(id);

        // 12b. History: redo snapshot (so redo() can restore to this state); skip when restoring from undo/redo
        if (!options.skipHistory) {
          await this.saveRedoSnapshot(id, result);
        }

        // 13. Hooks: afterUpdate
        if (this.hooks.afterUpdate) {
          try {
            await this.hooks.afterUpdate(id, result, previous, context);
          } catch (e) {
            if (this.config.logging) globalLogger.error('afterUpdate hook failed', { error: e });
          }
        }

        return result;
      } catch (error) {
        throw RepositoryError.fromError(error);
      }
    }, 'update');
  }

  /**
   * Delete a document (Soft or Hard)
   */
  async delete(id: string, context?: AuditContext): Promise<void> {
    // Clear query cache on write
    this.queryCache.clear();
    this.logDiagnostic('delete', { id, context });

    // Offline Queue
    if (this.isOffline()) {
      this.enqueueOfflineOperation('delete', [id, context]);
      this.logDiagnostic('offline.queue', { type: 'delete', id });
      return;
    }

    return this.retry(async () => {
      try {
        const current = await this.getById(id);
        if (!current) {
          // Idempotent success or error? Usually idempotent is better for delete.
          return;
        }

        // Save history snapshot (before delete)
        await this.saveHistorySnapshot(id, current, this.config.softDelete ? 'softDelete' : 'delete', context);

        // Invariant Check
        await this.checkInvariant('beforeDelete', id, context);

        // 1. Hooks: beforeDelete
        if (this.hooks.beforeDelete) {
          await this.hooks.beforeDelete(id, current, context);
        }

        const docRef = doc(this.collectionRef, id);

        if (this.config.softDelete) {
          // Soft Delete
          const updates = {
            deletedAt: new Date(),
            updatedAt: new Date(),
          };
          await updateDoc(docRef, updates);

          // Update Search Index (remove or mark deleted)
          if (this.config.searchProvider) {
            try {
              await this.config.searchProvider.remove(this.config.collectionName, id);
            } catch (e) {
              if (this.config.logging) globalLogger.error('Search remove failed', { error: e });
            }
          }
        } else {
          // Hard Delete
          await deleteDoc(docRef);

          if (this.config.searchProvider) {
            try {
              await this.config.searchProvider.remove(this.config.collectionName, id);
            } catch (e) {
              if (this.config.logging) globalLogger.error('Search remove failed', { error: e });
            }
          }
        }

        // Clear Cache
        if (this.config.cacheProvider) {
          try {
            await this.config.cacheProvider.del(`${this.config.collectionName}:${id}`);
          } catch (e) {
            if (this.config.logging) globalLogger.warn('Cache del failed', { error: e });
          }
        }

        // Clear DataLoader cache
        this.dataLoader.clear(id);

        // Hooks: afterDelete
        if (this.hooks.afterDelete) {
          try {
            await this.hooks.afterDelete(id, current, context);
          } catch (e) {
            if (this.config.logging) globalLogger.error('afterDelete hook failed', { error: e });
          }
        }
      } catch (error) {
        throw RepositoryError.fromError(error);
      }
    }, 'delete');
  }

  /**
   * Restore a soft-deleted document
   */
  async restore(id: string, context?: AuditContext): Promise<T> {
    if (!this.config.softDelete) {
      throw new RepositoryError(
        'Soft delete is not enabled for this repository',
        RepositoryErrorCode.INVALID_ARGUMENT,
      );
    }

    // Offline Queue
    if (this.isOffline()) {
      this.enqueueOfflineOperation('restore', [id, context]);
      this.logDiagnostic('offline.queue', { type: 'restore', id });
      return { id, deletedAt: null, _offlineQueued: true } as unknown as T;
    }

    return this.retry(async () => {
      try {
        // v2.0.0: Use explicit includeDeleted to fetch soft-deleted documents
        const current = await this.getByIdIncludingDeleted(id);
        if (!current) {
          throw new RepositoryError(`Document ${id} not found`, RepositoryErrorCode.NOT_FOUND);
        }

        // Save history snapshot (before restore)
        await this.saveHistorySnapshot(id, current, 'restore', context);

        const updates = {
          deletedAt: null,
          updatedAt: new Date(),
        };

        const docRef = doc(this.collectionRef, id);
        await updateDoc(docRef, updates);

        const result = { ...current, ...updates } as T;

        // Re-index
        if (this.config.searchProvider) {
          try {
            await this.config.searchProvider.index(this.config.collectionName, id, result, context);
          } catch (e) {
            if (this.config.logging) globalLogger.error('Search index failed', { error: e });
          }
        }

        // Update Cache
        if (this.config.cacheProvider) {
          try {
            await this.config.cacheProvider.set(`${this.config.collectionName}:${id}`, result);
          } catch (e) {
            if (this.config.logging) globalLogger.warn('Cache set failed', { error: e });
          }
        }

        return result;
      } catch (error) {
        throw RepositoryError.fromError(error);
      }
    }, 'restore');
  }

  /**
   * Get history entries for a document (v2.0.0)
   */
  async getHistory(id: string, options?: { limit?: number }): Promise<HistoryEntry<T>[]> {
    if (!this.enableHistory) {
      throw new RepositoryError(
        'History tracking is not enabled for this repository',
        RepositoryErrorCode.INVALID_ARGUMENT,
      );
    }

    try {
      const limitVal = options?.limit ?? this.maxHistorySize;

      if (this.historyStorage === 'embedded') {
        // Read from document's _history field
        const docRef = doc(this.collectionRef, id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          throw new RepositoryError(`Document ${id} not found`, RepositoryErrorCode.NOT_FOUND);
        }

        const data = docSnap.data();
        const history = (data._history as any[]) || [];
        return history
          .slice(-limitVal)
          .reverse() // Most recent first (matching subcollection behavior)
          .map((entry: any) => ({
            id: entry.id,
            documentId: entry.documentId,
            snapshot: entry.snapshot as T,
            operation: entry.operation,
            timestamp: entry.timestamp?.toDate?.() || entry.timestamp,
            actorId: entry.actorId,
            reason: entry.reason,
            version: entry.version,
          }));
      } else {
        // Read from subcollection
        const historyRef = this.getHistoryCollectionRef(id);
        const historyQuery = query(historyRef, orderBy('timestamp', 'desc'), limit(limitVal));
        const snapshot = await getDocs(historyQuery);

        const entries: HistoryEntry<T>[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const ts = data.timestamp;
          const timestamp =
            ts?.toDate?.() ?? (ts instanceof Date ? ts : ts ? new Date(ts) : new Date());
          const redoSnap = data.redoSnapshot;
          const redoSnapshot = redoSnap
            ? (typeof redoSnap?.updatedAt?.toDate === 'function'
                ? {
                    ...redoSnap,
                    updatedAt: redoSnap.updatedAt.toDate(),
                    createdAt: redoSnap.createdAt?.toDate?.() ?? redoSnap.createdAt,
                  }
                : redoSnap) as T
            : undefined;
          entries.push({
            id: docSnap.id,
            documentId: data.documentId,
            snapshot: data.snapshot as T,
            redoSnapshot,
            operation: data.operation,
            timestamp,
            actorId: data.actorId,
            reason: data.reason,
            version: data.version,
          });
        }

        return entries;
      }
    } catch (error) {
      throw RepositoryError.fromError(error, { documentId: id });
    }
  }

  /**
   * Undo the last change to a document (v2.0.0)
   * Restores document to the state before the most recent mutation
   */
  async undo(id: string, context?: AuditContext): Promise<T> {
    if (!this.enableHistory) {
      throw new RepositoryError(
        'History tracking is not enabled for this repository',
        RepositoryErrorCode.INVALID_ARGUMENT,
      );
    }

    try {
      const history = await this.getHistory(id, { limit: 2 });
      if (history.length < 1) {
        throw new RepositoryError(
          'Cannot undo: no history available',
          RepositoryErrorCode.FAILED_PRECONDITION,
        );
      }
      const firstEntry = history[0];
      if (!firstEntry) {
        throw new RepositoryError(
          'Cannot undo: no history available',
          RepositoryErrorCode.FAILED_PRECONDITION,
        );
      }
      // With only a create entry there is no previous state to restore to
      if (history.length === 1 && firstEntry.operation === 'create') {
        throw new RepositoryError(
          'Cannot undo: insufficient history (only create snapshot)',
          RepositoryErrorCode.FAILED_PRECONDITION,
        );
      }

      // History entries are ordered by timestamp desc (newest first)
      // history[0] = state before most recent mutation
      // Current state = after most recent mutation
      // To undo, restore to history[0]
      const previousSnapshot = firstEntry.snapshot;

      // Restore to previous state
      const updates: UpdateData<T> = {
        ...previousSnapshot,
        updatedAt: new Date(),
        _v: (previousSnapshot._v || 0) + 1,
      };
      delete (updates as any).id; // Don't update ID
      delete (updates as any).createdAt; // Don't update createdAt

      return await this.update(id, updates, context, { optimisticLock: false, skipHistory: true });
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw RepositoryError.fromError(error, { documentId: id });
    }
  }

  /**
   * Redo a previously undone change (v2.0.0)
   * Restores the document to the state after the most recent mutation (using redoSnapshot
   * saved on that history entry). Only works when the latest entry has redoSnapshot (e.g. after an update).
   */
  async redo(id: string, context?: AuditContext): Promise<T> {
    if (!this.enableHistory) {
      throw new RepositoryError(
        'History tracking is not enabled for this repository',
        RepositoryErrorCode.INVALID_ARGUMENT,
      );
    }

    try {
      const current = await this.getById(id);
      if (!current) {
        throw new RepositoryError(`Document ${id} not found`, RepositoryErrorCode.NOT_FOUND);
      }

      const history = await this.getHistory(id, { limit: 10 });
      if (history.length < 2) {
        throw new RepositoryError(
          'Cannot redo: insufficient history (need at least 2 entries)',
          RepositoryErrorCode.FAILED_PRECONDITION,
        );
      }

      // After undo we restored to history[0].snapshot; redo = restore to history[0].redoSnapshot
      const latestEntry = history[0];
      if (!latestEntry) {
        throw new RepositoryError(
          'Cannot redo: insufficient history',
          RepositoryErrorCode.FAILED_PRECONDITION,
        );
      }
      if (!latestEntry.redoSnapshot) {
        throw new RepositoryError(
          'Cannot redo: no redo state available (current state is already at the latest)',
          RepositoryErrorCode.FAILED_PRECONDITION,
        );
      }

      const redoSnapshot = latestEntry.redoSnapshot;
      const updates: UpdateData<T> = {
        ...redoSnapshot,
        updatedAt: new Date(),
        _v: (redoSnapshot._v || 0) + 1,
      };
      delete (updates as any).id;
      delete (updates as any).createdAt;

      return await this.update(id, updates, context, { optimisticLock: false, skipHistory: true });
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw RepositoryError.fromError(error, { documentId: id });
    }
  }

  /**
   * Run an atomic update using a transaction
   */
  async runAtomic(id: string, mutation: (current: T) => UpdateData<T>): Promise<T> {
    // Clear query cache on write
    this.queryCache.clear();
    this.logDiagnostic('runAtomic', { id });

    return this.retry(async () => {
      try {
        return await runTransaction(this.firestore, async (transaction) => {
          const docRef = doc(this.collectionRef, id);
          const docSnap = await transaction.get(docRef);

          if (!docSnap.exists()) {
            throw new RepositoryError(`Document ${id} not found`, RepositoryErrorCode.NOT_FOUND);
          }

          // Process read inside transaction?
          // We can't use async processRead easily if it does async calls (like search index or cache set - though those are post-read).
          // But processRead does migrations which might be async if we persist them?
          // Actually processRead persistMigration is async but we didn't await it in processRead.
          // However, inside transaction, we should be careful.
          // Let's do basic data processing.

          let data = docSnap.data();
          data = convertTimestamps(data);
          if (this.config.compressionStrategy)
            data = applyDecompression(data, this.config.compressionStrategy);
          if (this.config.encryptionStrategy && this.config.sensitiveFields) {
            data = applyDecryption(
              data,
              this.config.sensitiveFields,
              this.config.encryptionStrategy,
            );
          }

          const current = { id: docSnap.id, ...data } as T;

          // Apply mutation
          const updates = mutation(current);

          // Prepare write
          const now = new Date();
          let payload: any = { ...updates, updatedAt: now, _v: (current._v || 0) + 1 };
          delete payload.id;

          if (this.config.encryptionStrategy && this.config.sensitiveFields) {
            payload = applyEncryption(
              payload,
              this.config.sensitiveFields,
              this.config.encryptionStrategy,
            );
          }

          // Flatten & Sanitize
          const flattened = flattenForUpdate(payload);
          const sanitized = sanitizeForWrite(flattened);

          transaction.update(docRef, sanitized);

          // Return new state (include incremented _v)
          const nextV = (current._v || 0) + 1;
          return { ...current, ...updates, updatedAt: now, _v: nextV } as T;
        });
      } catch (error) {
        throw RepositoryError.fromError(error);
      }
    }, 'runAtomic');
  }

  /**
   * Create multiple documents in batches
   */
  async createMany(
    items: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[],
    context?: AuditContext,
  ): Promise<BatchOperationResult> {
    // Clear query cache on write
    this.queryCache.clear();
    this.logDiagnostic('createMany', { count: items.length, context });

    return this.retry(async () => {
      const result: BatchOperationResult = {
        successCount: 0,
        failureCount: 0,
        results: [],
      };

      // Chunk items into batches of 500 (Firestore limit)
      const chunkSize = 500;
      for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        const batch = writeBatch(this.firestore);

        const batchOps: { index: number; docRef: DocumentReference; data: any; original: any }[] =
          [];

        for (let j = 0; j < chunk.length; j++) {
          const item = chunk[j];
          const globalIndex = i + j;

          try {
            // 1. Hooks: beforeCreate
            if (this.hooks.beforeCreate && item) {
              try {
                // item is Omit<T, ...> which matches the hook signature
                await this.hooks.beforeCreate(item, context);
              } catch (e) {
                if (this.config.logging)
                  globalLogger.error('beforeCreate hook failed in createMany', { error: e });
              }
            }

            // Validation
            if (this.config.validateSchema && !this.config.validateSchema(item as any)) {
              throw new Error('Schema validation failed');
            }

            // ID Strategy
            let id: string;
            if (this.config.idStrategy === 'client') {
              if (!(item as any).id) throw new Error('Missing ID for client strategy');
              id = (item as any).id;
            } else if (this.config.idStrategy === 'deterministic') {
              if (!this.config.idGenerator) throw new Error('Missing idGenerator');
              id = this.config.idGenerator(item);
            } else {
              id = (item as any).id || doc(this.collectionRef).id;
            }

            const now = new Date();
            let payload: any = {
              ...item,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
              _v: 1,
            };

            if (this.config.encryptionStrategy && this.config.sensitiveFields) {
              payload = applyEncryption(
                payload,
                this.config.sensitiveFields,
                this.config.encryptionStrategy,
              );
            }

            if (this.config.compressionStrategy) {
              payload = applyCompression(payload, this.config.compressionStrategy);
            }

            payload = sanitizeForWrite(payload);

            const docRef = doc(this.collectionRef, id);
            batch.set(docRef, payload);

            batchOps.push({ index: globalIndex, docRef, data: payload, original: item });
          } catch (err) {
            result.failureCount++;
            result.results.push({
              success: false,
              id: (item as any).id || 'unknown',
              error: err as Error,
            });
          }
        }

        if (batchOps.length > 0) {
          try {
            await batch.commit();
            result.successCount += batchOps.length;

            // Post-write hooks/indexing (best effort)
            // Note: This runs after commit, so if it fails, DB is still updated.
            for (const op of batchOps) {
              const entity = {
                id: op.docRef.id,
                ...op.original,
                createdAt: new Date(),
                updatedAt: new Date(),
                deletedAt: null,
                _v: 1,
              } as T;

              // Indexing
              if (this.config.searchProvider) {
                this.config.searchProvider
                  .index(this.config.collectionName, op.docRef.id, entity, context)
                  .catch((e) => {
                    if (this.config.logging)
                      globalLogger.error('Search index failed', { error: e });
                  });
              }
              // Cache
              if (this.config.cacheProvider) {
                this.config.cacheProvider
                  .set(`${this.config.collectionName}:${op.docRef.id}`, entity)
                  .catch((e) => {
                    if (this.config.logging) globalLogger.warn('Cache set failed', { error: e });
                  });
              }
              // Hooks: afterCreate
              if (this.hooks.afterCreate) {
                try {
                  await this.hooks.afterCreate(entity, context);
                } catch (e) {
                  if (this.config.logging)
                    globalLogger.error('afterCreate hook failed in createMany', { error: e });
                }
              }

              result.results.push({
                success: true,
                id: op.docRef.id,
              });
            }
          } catch (err) {
            // If batch commit fails, all ops in this batch fail
            result.successCount -= batchOps.length; // Revert count (actually we added them before commit? No, we added to batchOps list)
            // Wait, we haven't incremented successCount yet.

            result.failureCount += batchOps.length;
            batchOps.forEach((op) => {
              result.results.push({
                success: false,
                id: op.docRef.id,
                error: err as Error,
              });
            });
          }
        }
      }

      return result;
    }, 'createMany');
  }

  /**
   * Calculate diff between original and updates
   */
  diff(original: T, updates: Partial<T>): Partial<T> {
    const changes: Partial<T> = {};
    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        const val = updates[key];
        if (JSON.stringify(val) !== JSON.stringify(original[key])) {
          changes[key] = val;
        }
      }
    }
    return changes;
  }

  /**
   * Subscribe to realtime updates for a document
   */
  subscribe(id: string, callback: (entity: T | null) => void): Unsubscribe {
    this.assertCapability('realtime');
    const docRef = doc(this.collectionRef, id);
    return onSnapshot(
      docRef,
      async (snapshot) => {
        const data = await this.processRead(snapshot);
        callback(data);
      },
      (error) => {
        if (this.config.logging) globalLogger.error('Realtime subscription error', { error });
        callback(null); // Or handle error differently?
      },
    );
  }

  /**
   * Subscribe to realtime updates for a query
   */
  subscribeQuery(options: QueryOptions<T>, callback: (entities: T[]) => void): Unsubscribe {
    this.assertCapability('realtime');
    let q: Query = this.collectionRef;

    if (options.where) {
      for (const [field, op, value] of options.where) {
        q = query(q, where(field, op, value));
      }
    }
    if (this.config.softDelete && !options.includeDeleted) {
      q = query(q, where('deletedAt', '==', null));
    }
    if (options.orderBy) {
      for (const [field, direction] of options.orderBy) {
        q = query(q, orderBy(field, direction));
      }
    }
    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    return onSnapshot(
      q,
      async (snapshot) => {
        const results: T[] = [];
        for (const docSnap of snapshot.docs) {
          const data = await this.processRead(docSnap);
          if (data) results.push(data);
        }
        callback(results);
      },
      (error) => {
        if (this.config.logging) globalLogger.error('Realtime query subscription error', { error });
        callback([]);
      },
    );
  }

  /**
   * Upsert a document (Update if exists, Create if not)
   * This is a convenience method that uses runTransaction to be atomic.
   */
  async upsert(data: UpdateData<T> & { id?: string }, context?: AuditContext): Promise<T> {
    const id = data.id || doc(this.collectionRef).id;

    // Offline Queue
    if (this.isOffline()) {
      this.enqueueOfflineOperation('upsert', [data, context]);
      this.logDiagnostic('offline.queue', { type: 'upsert', id });
      return {
        id,
        ...data,
        updatedAt: new Date(),
        _offlineQueued: true,
      } as unknown as T;
    }

    return this.retry(async () => {
      try {
        // We can reuse runAtomic or implement custom logic.
        // Since we need to handle create vs update hooks, custom logic is better.

        return await runTransaction(this.firestore, async (transaction) => {
          const docRef = doc(this.collectionRef, id);
          const docSnap = await transaction.get(docRef);

          if (docSnap.exists()) {
            // Update path
            // We can't easily call this.update() inside transaction because it starts a new transaction.
            // We have to duplicate update logic or extract it.
            // For simplicity and code reuse, we'll throw a special error to signal retry as update?
            // No, that's inefficient.
            // We should extract the update logic.
            // But wait, `update` logic is complex (hooks, encryption, etc).
            // Let's try to use the public API if possible, but we can't nest transactions.
            // So we must duplicate or extract.

            // Let's implement a simplified version that calls the hooks and does the work.
            // Or better: check existence outside transaction? No, race condition.

            // We will implement the logic inline.

            let currentData = docSnap.data();
            currentData = convertTimestamps(currentData);
            if (this.config.compressionStrategy)
              currentData = applyDecompression(currentData, this.config.compressionStrategy);
            if (this.config.encryptionStrategy && this.config.sensitiveFields)
              currentData = applyDecryption(
                currentData,
                this.config.sensitiveFields,
                this.config.encryptionStrategy,
              );

            // v2.0.0: Run migrations on write for 'write-only' strategy
            const migrationStrategy = this.config.migrationStrategy || 'eager';
            if (migrationStrategy === 'write-only' && this.config.migrations) {
              currentData = this.applyMigrationsForWrite(currentData);
            }

            const current = { id: docSnap.id, ...currentData } as T;

            // Optimistic locking (v2.0.0: Use _v field like update() method)
            // Note: upsert doesn't have options parameter, so we check if _v is provided
            if (data._v !== undefined && typeof data._v === 'number') {
              if (typeof current._v !== 'number') {
                throw new RepositoryError(
                  'Optimistic lock requested but current document has no _v field',
                  RepositoryErrorCode.VALIDATION_FAILED,
                );
              }
              if (data._v !== current._v) {
                throw new RepositoryError(
                  `Optimistic lock failed: version mismatch (expected ${data._v}, actual ${current._v}). Document was modified by another process.`,
                  RepositoryErrorCode.CONCURRENT_MODIFICATION,
                );
              }
            }

            // Hook: beforeUpdate
            if (this.hooks.beforeUpdate) {
              try {
                await this.hooks.beforeUpdate(id, data as Partial<T>, current, context);
              } catch (e) {
                if (this.config.logging)
                  globalLogger.error('beforeUpdate hook failed', { error: e });
              }
            }

            const now = new Date();
            let updates: any = { ...data, updatedAt: now, _v: (current._v || 0) + 1 };
            delete updates.id;

            if (this.config.encryptionStrategy && this.config.sensitiveFields)
              updates = applyEncryption(
                updates,
                this.config.sensitiveFields,
                this.config.encryptionStrategy,
              );
            if (this.config.compressionStrategy) {
              const merged = { ...current, ...data, updatedAt: now };
              updates = applyCompression(merged, this.config.compressionStrategy);
            }

            const flattened = flattenForUpdate(updates);
            const sanitized = sanitizeForWrite(flattened);

            transaction.update(docRef, sanitized);

            return {
              type: 'update',
              data: { ...current, ...data, updatedAt: now } as T,
              previous: current,
            };
          } else {
            // Create path
            // Hook: beforeCreate
            // We need to cast data to create payload
            const createData = data as unknown as Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

            if (this.hooks.beforeCreate) {
              try {
                await this.hooks.beforeCreate(createData, context);
              } catch (e) {
                if (this.config.logging)
                  globalLogger.error('beforeCreate hook failed', { error: e });
              }
            }

            const now = new Date();
            let payload: any = {
              ...createData,
              createdAt: now,
              updatedAt: now,
              deletedAt: null,
              _v: 1,
            };

            if (this.config.encryptionStrategy && this.config.sensitiveFields)
              payload = applyEncryption(
                payload,
                this.config.sensitiveFields,
                this.config.encryptionStrategy,
              );
            if (this.config.compressionStrategy)
              payload = applyCompression(payload, this.config.compressionStrategy);

            payload = sanitizeForWrite(payload);

            transaction.set(docRef, payload);

            return {
              type: 'create',
              data: {
                id,
                ...createData,
                createdAt: now,
                updatedAt: now,
                deletedAt: null,
                _v: 1,
              } as T,
            };
          }
        }).then(async (res) => {
          // Post-transaction hooks
          if (res.type === 'update') {
            if (this.config.searchProvider)
              try {
                await this.config.searchProvider.index(
                  this.config.collectionName,
                  id,
                  res.data,
                  context,
                );
              } catch (e) {
                if (this.config.logging) globalLogger.error('Search index failed', { error: e });
              }
            if (this.config.cacheProvider)
              try {
                await this.config.cacheProvider.set(
                  `${this.config.collectionName}:${id}`,
                  res.data,
                );
              } catch (e) {
                if (this.config.logging) globalLogger.warn('Cache set failed', { error: e });
              }
            if (this.hooks.afterUpdate)
              try {
                await this.hooks.afterUpdate(id, res.data, res.previous!, context);
              } catch (e) {
                if (this.config.logging)
                  globalLogger.error('afterUpdate hook failed', { error: e });
              }
          } else {
            if (this.config.searchProvider)
              try {
                await this.config.searchProvider.index(
                  this.config.collectionName,
                  id,
                  res.data,
                  context,
                );
              } catch (e) {
                if (this.config.logging) globalLogger.error('Search index failed', { error: e });
              }
            if (this.config.cacheProvider)
              try {
                await this.config.cacheProvider.set(
                  `${this.config.collectionName}:${id}`,
                  res.data,
                );
              } catch (e) {
                if (this.config.logging) globalLogger.warn('Cache set failed', { error: e });
              }
            if (this.hooks.afterCreate)
              try {
                await this.hooks.afterCreate(res.data, context);
              } catch (e) {
                if (this.config.logging)
                  globalLogger.error('afterCreate hook failed', { error: e });
              }
          }
          return res.data;
        });
      } catch (error) {
        throw RepositoryError.fromError(error);
      }
    }, 'upsert');
  }

  async softDelete(id: string, context?: AuditContext): Promise<void> {
    if (!this.config.softDelete) {
      throw new RepositoryError(
        'Soft delete is not enabled for this repository',
        RepositoryErrorCode.INVALID_ARGUMENT,
      );
    }

    // Offline Queue
    if (this.isOffline()) {
      this.enqueueOfflineOperation('softDelete', [id, context]);
      this.logDiagnostic('offline.queue', { type: 'softDelete', id });
      return;
    }

    return this.retry(async () => {
      try {
        const current = await this.getById(id);
        if (!current) return;

        await this.checkInvariant('beforeDelete', id, context);

        if (this.hooks.beforeDelete) {
          await this.hooks.beforeDelete(id, current, context);
        }

        const docRef = doc(this.collectionRef, id);
        const updates = {
          deletedAt: new Date(),
          updatedAt: new Date(),
        };
        await updateDoc(docRef, updates);

        if (this.config.searchProvider) {
          try {
            await this.config.searchProvider.remove(this.config.collectionName, id);
          } catch (e) {
            if (this.config.logging) globalLogger.error('Search remove failed', { error: e });
          }
        }

        if (this.config.cacheProvider) {
          try {
            await this.config.cacheProvider.del(`${this.config.collectionName}:${id}`);
          } catch (e) {
            if (this.config.logging) globalLogger.warn('Cache del failed', { error: e });
          }
        }

        this.dataLoader.clear(id);

        if (this.hooks.afterDelete) {
          try {
            await this.hooks.afterDelete(id, current, context);
          } catch (e) {
            if (this.config.logging) globalLogger.error('afterDelete hook failed', { error: e });
          }
        }
      } catch (error) {
        throw RepositoryError.fromError(error);
      }
    }, 'softDelete');
  }
  async count(options: QueryOptions<T> = {}): Promise<number> {
    try {
      let q: Query = this.collectionRef;

      if (options.where) {
        for (const [field, op, value] of options.where) {
          q = query(q, where(field, op, value));
        }
      }

      if (this.config.softDelete && !options.includeDeleted) {
        q = query(q, where('deletedAt', '==', null));
      }

      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      throw RepositoryError.fromError(error);
    }
  }

  /**
   * Check if any document matches the conditions
   */
  async existsWhere(conditions: NonNullable<QueryOptions['where']>): Promise<boolean> {
    try {
      let q: Query = this.collectionRef;

      for (const [field, op, value] of conditions) {
        q = query(q, where(field, op, value));
      }

      if (this.config.softDelete) {
        q = query(q, where('deletedAt', '==', null));
      }

      q = query(q, limit(1));
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count > 0;
    } catch (error) {
      throw RepositoryError.fromError(error);
    }
  }

  /**
   * Get a document by ID, returning null if not found (wrapper for getById)
   */
  async getOptional(id: string): Promise<T | null> {
    return this.getById(id);
  }

  /**
   * Find a single document matching options
   */
  async findOne(options: QueryOptions<T>): Promise<T | null> {
    try {
      // Enforce limit 1
      const opts = { ...options, limit: 1 };
      const result = await this.find(opts);
      return result.data[0] || null;
    } catch (error) {
      throw RepositoryError.fromError(error);
    }
  }

  /**
   * Ensure a document exists, throwing if not
   */
  async ensureExists(id: string): Promise<void> {
    try {
      let q = query(this.collectionRef, where('__name__', '==', id));
      if (this.config.softDelete) {
        q = query(q, where('deletedAt', '==', null));
      }

      const snapshot = await getCountFromServer(q);
      if (snapshot.data().count === 0) {
        throw new RepositoryError(`Document ${id} not found`, RepositoryErrorCode.NOT_FOUND);
      }
    } catch (error) {
      throw RepositoryError.fromError(error);
    }
  }

  /**
   * Ensure a document does not exist, throwing if it does
   */
  async ensureNotExists(id: string): Promise<void> {
    try {
      let q = query(this.collectionRef, where('__name__', '==', id));

      if (this.config.softDelete) {
        q = query(q, where('deletedAt', '==', null));
      }

      const snapshot = await getCountFromServer(q);
      if (snapshot.data().count > 0) {
        throw new RepositoryError(`Document ${id} already exists`, RepositoryErrorCode.CONFLICT);
      }
    } catch (error) {
      throw RepositoryError.fromError(error);
    }
  }

  /**
   * Best-effort uniqueness check (⚠️ NOT TRANSACTIONALLY SAFE)
   *
   * @warning This method is subject to race conditions and should NOT be relied upon
   * for critical uniqueness constraints (e.g., email addresses, usernames).
   *
   * **Race Condition Example:**
   * ```
   * Time    Client A                Client B
   * ------- --------------------    --------------------
   * T1      ensureUnique(email)
   * T2      ✓ No duplicates found   ensureUnique(email)
   * T3                              ✓ No duplicates found
   * T4      create(user)
   * T5                              create(user) ← DUPLICATE!
   * ```
   *
   * Between the uniqueness check (T2/T3) and the write (T4/T5), another client
   * can create a document with the same value, resulting in duplicates.
   *
   * **Firestore Limitation:** Firestore does not support unique constraints natively.
   * `getCountFromServer()` is non-transactional and cannot be combined with writes.
   *
   * **Recommended Solutions for Critical Uniqueness:**
   * 1. **Firestore Security Rules** - Enforce uniqueness at the database level
   *    (requires indexed queries in rules, consult Firebase documentation)
   * 2. **Deterministic Document IDs** - Use the unique value as the document ID
   *    (e.g., store users by email: `/users/user@example.com`)
   * 3. **Cloud Functions** - Use Firestore triggers to detect and clean up duplicates
   * 4. **Client-Side Deduplication** - Show clear error messages but accept eventual consistency
   *
   * @param field The field to check for uniqueness
   * @param value The value that must be unique
   * @param opts Optional exclusion (e.g., when updating existing document)
   * @throws {RepositoryError} CONFLICT if non-unique value found (best-effort)
   */
  async ensureUnique(field: keyof T, value: any, opts?: { excludeId?: string }): Promise<void> {
    try {
      let q = query(this.collectionRef, where(field as string, '==', value));

      if (this.config.softDelete) {
        q = query(q, where('deletedAt', '==', null));
      }

      if (opts?.excludeId) {
        q = query(q, where('__name__', '!=', opts.excludeId));
      }

      q = query(q, limit(1));

      const snapshot = await getCountFromServer(q);
      if (snapshot.data().count > 0) {
        throw new RepositoryError(
          `Value '${value}' for field '${String(field)}' already exists`,
          RepositoryErrorCode.CONFLICT,
        );
      }
    } catch (error) {
      throw RepositoryError.fromError(error);
    }
  }

  /**
   * Touch a document (update updatedAt)
   * Note: Triggers full update flow including hooks and transaction
   */
  async touch(id: string): Promise<void> {
    try {
      // Contract: throw NOT_FOUND when document does not exist (before queuing or update)
      const current = await this.getById(id);
      if (!current) {
        throw new RepositoryError(`Document ${id} not found`, RepositoryErrorCode.NOT_FOUND);
      }
      await this.update(id, {} as any);
    } catch (error) {
      throw RepositoryError.fromError(error);
    }
  }

  /**
   * Lightweight touch without hooks/invariants (v2.0.0)
   *
   * Useful for high-frequency updates like heartbeat tracking or last-seen timestamps
   * where full transaction overhead and lifecycle hooks are unnecessary.
   *
   * **Use Cases:**
   * - Session heartbeat tracking (every 30 seconds)
   * - User activity timestamps
   * - Document access timestamps
   *
   * **⚠️ Skips:**
   * - Invariant checks
   * - Lifecycle hooks (beforeUpdate/afterUpdate)
   * - Optimistic locking
   * - Search indexing
   * - Transaction guarantees
   *
   * **Preserves:**
   * - Cache invalidation
   * - Offline queue
   * - Diagnostic events
   *
   * @param id Document ID to touch
   */
  async touchWithoutHooks(id: string): Promise<void> {
    // Clear query cache
    this.queryCache.clear();
    this.logDiagnostic('touchWithoutHooks', { id });

    // Offline Queue
    if (this.isOffline()) {
      this.enqueueOfflineOperation('update', [id, {}, undefined, { skipHooks: true }]);
      return;
    }

    try {
      const docRef = doc(this.collectionRef, id);
      await updateDoc(docRef, {
        updatedAt: new Date(),
      });

      // Clear DataLoader cache
      this.dataLoader.clear(id);

      // Clear external cache if present
      if (this.config.cacheProvider) {
        try {
          await this.config.cacheProvider.del(`${this.config.collectionName}:${id}`);
        } catch (e: any) {
          if (this.config.logging) globalLogger.warn('Cache delete failed', { error: e });
        }
      }
    } catch (error) {
      throw RepositoryError.fromError(error);
    }
  }

  /**
   * Update multiple documents in a batch (v2.0.0)
   *
   * Efficiently updates multiple documents using Firestore writeBatch.
   * Max 500 operations per batch (Firestore limit).
   *
   * **⚠️ Behavior:**
   * - All updates in a batch succeed or fail together
   * - Hooks run for each document (may impact performance)
   * - No transaction guarantees across batches (if >500 docs)
   *
   * @param ids Array of document IDs to update
   * @param updates Partial update data (applied to all documents)
   * @param context Optional audit context
   * @param options Update options (optimistic locking applies to all)
   * @returns Batch operation result with success/failure tracking
   */
  async updateMany(
    ids: string[],
    updates: UpdateData<T>,
    context?: AuditContext,
    options?: UpdateOptions,
  ): Promise<BatchOperationResult> {
    // Clear query cache
    this.queryCache.clear();
    this.logDiagnostic('updateMany', { count: ids.length, context });

    return this.retry(async () => {
      const result: BatchOperationResult = {
        successCount: 0,
        failureCount: 0,
        results: [],
      };

      // Chunk into batches of 500 (Firestore limit)
      const chunkSize = 500;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(this.firestore);

        const batchOps: { id: string; docRef: DocumentReference }[] = [];

        for (const id of chunk) {
          try {
            // Run invariants
            await this.checkInvariant('beforeUpdate', id, updates, context);

            // Get current document for hook and version tracking
            const current = await this.getById(id);
            if (!current) {
              throw new RepositoryError(`Document ${id} not found`, RepositoryErrorCode.NOT_FOUND);
            }

            // Run beforeUpdate hook
            if (this.hooks.beforeUpdate) {
              await this.hooks.beforeUpdate(id, updates as Partial<T>, current, context);
            }

            const now = new Date();
            let payload: any = {
              ...updates,
              updatedAt: now,
              _v: (current._v || 0) + 1, // v2.0.0: Increment version for batch updates
            };

            delete payload.id;

            const flattenedUpdates = flattenForUpdate(payload);
            const sanitizedUpdates = sanitizeForWrite(flattenedUpdates);

            const docRef = doc(this.collectionRef, id);
            batch.update(docRef, sanitizedUpdates);

            batchOps.push({ id, docRef });
          } catch (err) {
            result.failureCount++;
            result.results.push({
              success: false,
              id,
              error: err as Error,
            });
          }
        }

        if (batchOps.length > 0) {
          try {
            await batch.commit();
            result.successCount += batchOps.length;

            // Post-commit hooks and cache updates
            for (const op of batchOps) {
              result.results.push({
                success: true,
                id: op.id,
              });

              // Clear cache
              this.dataLoader.clear(op.id);
              if (this.config.cacheProvider) {
                this.config.cacheProvider
                  .del(`${this.config.collectionName}:${op.id}`)
                  .catch((e: any) => {
                    if (this.config.logging) globalLogger.warn('Cache delete failed', { error: e });
                  });
              }

              // afterUpdate hook skipped in batch operations
              // Fetching 'previous' state for each document would negate batch performance
              // Users should use update() if they need afterUpdate hooks with previous/current comparison
            }
          } catch (err) {
            result.failureCount += batchOps.length;
            batchOps.forEach((op) => {
              result.results.push({
                success: false,
                id: op.id,
                error: err as Error,
              });
            });
          }
        }
      }

      return result;
    }, 'updateMany');
  }

  /**
   * Delete multiple documents in a batch (v2.0.0)
   *
   * Efficiently deletes multiple documents using Firestore writeBatch.
   * Max 500 operations per batch (Firestore limit).
   *
   * **⚠️ Behavior:**
   * - Uses soft delete if enabled in config
   * - All deletes in a batch succeed or fail together
   * - Hooks run for each document
   *
   * @param ids Array of document IDs to delete
   * @param context Optional audit context
   * @returns Batch operation result with success/failure tracking
   */
  async deleteMany(ids: string[], context?: AuditContext): Promise<BatchOperationResult> {
    // Clear query cache
    this.queryCache.clear();
    this.logDiagnostic('deleteMany', { count: ids.length, context });

    return this.retry(async () => {
      const result: BatchOperationResult = {
        successCount: 0,
        failureCount: 0,
        results: [],
      };

      // Use soft delete if enabled
      if (this.config.softDelete) {
        // Soft delete is just an update
        return this.updateMany(ids, { deletedAt: new Date() } as any, context);
      }

      // Hard delete
      const chunkSize = 500;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(this.firestore);

        const batchOps: { id: string; docRef: DocumentReference }[] = [];

        for (const id of chunk) {
          try {
            // Run invariants
            await this.checkInvariant('beforeDelete', id, context);

            // Run beforeDelete hook
            if (this.hooks.beforeDelete) {
              const current = await this.getById(id);
              if (current) {
                await this.hooks.beforeDelete(id, current, context);
              }
            }

            const docRef = doc(this.collectionRef, id);
            batch.delete(docRef);

            batchOps.push({ id, docRef });
          } catch (err) {
            result.failureCount++;
            result.results.push({
              success: false,
              id,
              error: err as Error,
            });
          }
        }

        if (batchOps.length > 0) {
          try {
            await batch.commit();
            result.successCount += batchOps.length;

            // Post-commit cleanup
            for (const op of batchOps) {
              result.results.push({
                success: true,
                id: op.id,
              });

              // Clear cache
              this.dataLoader.clear(op.id);
              if (this.config.cacheProvider) {
                this.config.cacheProvider
                  .del(`${this.config.collectionName}:${op.id}`)
                  .catch((e: any) => {
                    if (this.config.logging) globalLogger.warn('Cache delete failed', { error: e });
                  });
              }

              // Search index removal
              if (this.config.searchProvider) {
                this.config.searchProvider
                  .remove(this.config.collectionName, op.id, context)
                  .catch((e: any) => {
                    if (this.config.logging)
                      globalLogger.error('Search index removal failed', { error: e });
                  });
              }

              // afterDelete hook skipped in batch operations
              // Fetching 'previous' state for each document would negate batch performance
              // Users should use delete() if they need afterDelete hooks with document data
            }
          } catch (err) {
            result.failureCount += batchOps.length;
            batchOps.forEach((op) => {
              result.results.push({
                success: false,
                id: op.id,
                error: err as Error,
              });
            });
          }
        }
      }

      return result;
    }, 'deleteMany');
  }

  /**
   * Assert document is not soft-deleted
   */
  async assertNotDeleted(id: string): Promise<void> {
    if (!this.config.softDelete) return;

    try {
      const q = query(
        this.collectionRef,
        where('__name__', '==', id),
        where('deletedAt', '!=', null),
      );

      const snapshot = await getCountFromServer(q);
      if (snapshot.data().count > 0) {
        throw new RepositoryError(`Document ${id} is deleted`, RepositoryErrorCode.NOT_FOUND);
      }
    } catch (error) {
      throw RepositoryError.fromError(error);
    }
  }
}
