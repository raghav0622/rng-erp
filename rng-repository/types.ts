/**
 * 🔒 FROZEN API (v2.0.0 — locked)
 *
 * IRepository<T> and all exported types are the immutable contract for this library.
 * No new methods or type members in v2.x. Changes constitute a new major version.
 */

import { FieldValue } from 'firebase/firestore';

/** @internal Reserved for internal use; public version is RNG_REPOSITORY_VERSION from index. */
export const REPOSITORY_API_VERSION = '2.0.0';

/**
 * 🔒 Frozen repository contract (v2.0.0).
 * Defines mechanical CRUD/query semantics for Firestore-backed entities without embedding domain logic.
 * Behavior and surface are immutable within v2.x; extend via hooks/configuration outside this file.
 */
export interface IRepository<T extends BaseEntity> {
  getById(id: string, options?: GetOptions): Promise<T | null>;
  getByIdIncludingDeleted(id: string, options?: GetOptions): Promise<T | null>;
  getOptional(id: string, options?: GetOptions): Promise<T | null>;
  find(options?: QueryOptions<T>): Promise<PaginatedResult<T>>;
  findOne(options: QueryOptions<T>): Promise<T | null>;
  count(options?: QueryOptions<T>): Promise<number>;
  create(
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    context?: AuditContext,
    options?: CreateOptions,
  ): Promise<T>;
  update(
    id: string,
    data: UpdateData<T>,
    context?: AuditContext,
    options?: UpdateOptions,
  ): Promise<T>;
  upsert(data: UpdateData<T> & { id?: string }, context?: AuditContext): Promise<T>;
  delete(id: string, context?: AuditContext): Promise<void>;
  softDelete?(id: string, context?: AuditContext): Promise<void>;
  restore?(id: string, context?: AuditContext): Promise<T>;
  getMany(ids: string[], options?: GetOptions): Promise<(T | null)[]>;
  ensureExists(id: string): Promise<void>;
  ensureNotExists(id: string): Promise<void>;
  ensureUnique(field: keyof T, value: any, opts?: { excludeId?: string }): Promise<void>;
  touch(id: string): Promise<void>;
  touchWithoutHooks?(id: string): Promise<void>; // v2.0.0
  updateMany?(
    ids: string[],
    updates: UpdateData<T>,
    context?: AuditContext,
    options?: UpdateOptions,
  ): Promise<BatchOperationResult>; // v2.0.0
  deleteMany?(ids: string[], context?: AuditContext): Promise<BatchOperationResult>; // v2.0.0
  assertNotDeleted(id: string): Promise<void>;
  runAtomic(id: string, mutation: (current: T) => UpdateData<T>): Promise<T>;
  createMany(
    items: Omit<T, 'id' | 'createdAt' | 'updatedAt'>[],
    context?: AuditContext,
  ): Promise<BatchOperationResult>;
  diff(original: T, updates: Partial<T>): Partial<T>;
  // v2.0.0: History tracking (optional)
  undo?(id: string, context?: AuditContext): Promise<T>;
  redo?(id: string, context?: AuditContext): Promise<T>;
  getHistory?(id: string, options?: { limit?: number }): Promise<HistoryEntry<T>[]>;
}

/**
 * 🔒 Frozen entity shape (v1).
 * Minimal fields required by repository mechanics; do not add domain fields here.
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  _v?: number;
  [key: string]: any;
}

/**
 * BaseEntitySchema - Optional Zod schema for BaseEntity validation
 * Note: This is not exported as part of the public API to avoid requiring zod as a dependency
 * If you need schema validation, implement it in your application layer
 */
// export const BaseEntitySchema = {
//   id: z.string(),
//   createdAt: z.date(),
//   updatedAt: z.date(),
//   deletedAt: z.date().nullable().optional(),
//   _v: z.number().optional(),
// };
/**
 * 🔒 Frozen repository context (v1).
 * Carries request metadata into repository operations; policy enforcement lives above this layer.
 */
export interface RepositoryContext {
  requestId?: string;
  intent?: 'USER_EDIT' | 'SYSTEM_SYNC' | 'IMPORT' | 'MIGRATION';
  source?: 'UI' | 'BACKGROUND';
  dryRun?: boolean;
  [key: string]: any;
}

/**
 * 🔒 Frozen audit context (v1).
 * Adds actor/reason fields for mutation auditing without embedding authorization logic.
 */
export interface AuditContext extends RepositoryContext {
  actorId?: string;
  reason?: string;
}

/**
 * 🔒 Frozen relation config (v1).
 * Describes relation wiring for population; remains mechanical and policy-free.
 */
export interface RelationConfig {
  collection: string;
  localKey: string;
  foreignKey?: string; // Defaults to document ID if not provided
}

/**
 * 🔒 Frozen repository diagnostics event (v1).
 * Stable telemetry payload emitted by the repository for observability layers.
 */
export interface RepositoryDiagnosticEvent {
  type: 'READ' | 'WRITE' | 'QUERY' | 'BATCH' | 'RETRY' | 'OFFLINE_QUEUE';
  collection: string;
  operation: string;
  durationMs?: number;
  readCount?: number;
  writeCount?: number;
  retryAttempt?: number;
  context?: RepositoryContext;
}

/**
 * 🔒 Frozen invariant hook contract (v1).
 * Extension point for domain invariants injected from outside the frozen repository layer.
 */
export interface InvariantHooks<T extends BaseEntity> {
  beforeCreate?: (data: T, context?: AuditContext) => void | Promise<void>;
  beforeUpdate?: (id: string, changes: Partial<T>, context?: AuditContext) => void | Promise<void>;
  beforeDelete?: (id: string, context?: AuditContext) => void | Promise<void>;
}

/**
 * 🔒 Frozen retry policy contract (v1).
 * Configures retry semantics for transient failures; supplied externally.
 */
export interface RetryPolicy {
  retries: number;
  backoffMs: number;
}

/**
 * 🔒 Frozen repository configuration (v2.0.0).
 * Describes mechanical behaviors (soft delete, encryption, compression, hooks) supplied from extensible layers.
 * No domain/RBAC logic should be added to the repository itself.
 */
export interface RepositoryConfig<T extends BaseEntity> {
  collectionName: string;
  softDelete?: boolean;
  logging?: boolean;
  validateSchema?: (data: unknown) => data is T;
  encryptionStrategy?: EncryptionStrategy;
  compressionStrategy?: CompressionStrategy;
  searchProvider?: SearchProvider;
  cacheProvider?: CacheProvider;
  migrations?: Record<number, (data: any) => any>;
  migrationStrategy?: 'eager' | 'lazy' | 'write-only'; // v2.0.0: Control when migrations run
  sensitiveFields?: string[];
  hooks?: RepositoryHooks<T>;
  invariants?: InvariantHooks<T>;
  relations?: Record<string, RelationConfig>;
  populationFailureMode?: 'silent' | 'warn' | 'throw'; // v2.0.0: How to handle failed relation population
  idStrategy?: 'auto' | 'client' | 'deterministic';
  idGenerator?: (data: any) => string;
  allowedSelect?: readonly (keyof T)[];
  enableDiagnostics?: boolean;
  onDiagnostic?: (event: RepositoryDiagnosticEvent) => void;
  retry?: RetryPolicy;
  // v2.0.0: Cache and queue limits
  maxQueryCacheSize?: number; // Default: 100 entries
  maxOfflineQueueSize?: number; // Default: 1000 entries
  // v2.0.0: History tracking (undo/redo)
  enableHistory?: boolean; // Default: false
  maxHistorySize?: number; // Default: 50 entries per document
  historyStorage?: 'subcollection' | 'embedded'; // Default: 'subcollection'
  /** When true, skip offline queue and always persist (e.g. for tests with emulator) */
  forceOnline?: boolean; // Default: false
}

/**
 * 🔒 Frozen encryption strategy contract (v1).
 * Provides pluggable encryption for sensitive fields; implementation supplied externally.
 */
export interface EncryptionStrategy {
  encrypt(value: string): string;
  decrypt(value: string): string;
}

/**
 * 🔒 Frozen compression strategy contract (v1).
 * Pluggable compression/decompression mechanics; behavior stays outside repository core.
 */
export interface CompressionStrategy {
  compress(value: any): any;
  decompress(value: any): any;
}

/**
 * 🔒 Frozen search provider contract (v1).
 * Optional indexing/search integration point; callers supply implementations.
 */
export interface SearchProvider {
  search<T>(index: string, query: string, options?: any): Promise<SearchResult<T>>;
  index(index: string, id: string, doc: any, context?: AuditContext): Promise<void>;
  remove(index: string, id: string, context?: AuditContext): Promise<void>;
}

/**
 * 🔒 Frozen search result shape (v1).
 * Stable structure for search responses from pluggable providers.
 */
export interface SearchResult<T> {
  hits: T[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * 🔒 Frozen cache provider contract (v1).
 * Optional caching interface; implementations live outside the frozen repository layer.
 */
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * 🔒 Frozen hook contract (v1).
 * Lifecycle hooks for repository operations; hook logic resides outside the frozen layer.
 */
export interface RepositoryHooks<T extends BaseEntity> {
  beforeCreate?: (
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    context?: AuditContext,
  ) => Promise<void> | void;
  afterCreate?: (data: T, context?: AuditContext) => Promise<void> | void;
  beforeUpdate?: (
    id: string,
    data: Partial<T>,
    current: T,
    context?: AuditContext,
  ) => Promise<void> | void;
  afterUpdate?: (id: string, data: T, previous: T, context?: AuditContext) => Promise<void> | void;
  beforeDelete?: (id: string, current: T, context?: AuditContext) => Promise<void> | void;
  afterDelete?: (id: string, previous: T, context?: AuditContext) => Promise<void> | void;
}

/**
 * 🔒 Frozen query options (v1).
 * Defines mechanical filters, pagination, projection, and consistency flags—no policy flags allowed.
 */
export interface QueryOptions<T = any> {
  where?: [
    string,
    (
      | '=='
      | '!='
      | '<'
      | '<='
      | '>'
      | '>='
      | 'array-contains'
      | 'in'
      | 'array-contains-any'
      | 'not-in'
    ),
    any,
  ][];
  orderBy?: [string, 'asc' | 'desc'][];
  limit?: number;
  startAfter?: any; // Cursor
  includeDeleted?: boolean;
  populate?: string[];
  select?: (keyof T)[];
  readConsistency?: 'DEFAULT' | 'STRONG';
}

/**
 * 🔒 Frozen get options (v1).
 * Controls population and soft-delete visibility without introducing domain policy.
 */
export interface GetOptions {
  populate?: string[];
  includeDeleted?: boolean;
  select?: string[];
  readConsistency?: 'DEFAULT' | 'STRONG';
}

/**
 * 🔒 Frozen create options (v1).
 * Reserved for mechanical flags; keep domain/policy switches in extensible layers.
 */
export interface CreateOptions {
  idempotencyKey?: string;
}

/**
 * 🔒 Frozen update options (v1).
 * Mechanical controls such as optimistic locking; avoid domain-specific flags here.
 */
export interface UpdateOptions {
  optimisticLock?: boolean;
  idempotencyKey?: string;
  /** When true, skip saving history/redo for this update (used by undo/redo restore). */
  skipHistory?: boolean;
}

/**
 * 🔒 Frozen pagination result (v1).
 * Stable shape returned from repository queries.
 */
export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * 🔒 Frozen batch operation result (v1).
 * Stable reporting structure for bulk writes.
 */
export interface BatchOperationResult {
  successCount: number;
  failureCount: number;
  results: {
    success: boolean;
    id: string;
    error?: Error;
  }[];
}

/**
 * 🔒 Frozen update payload shape (v1).
 * Partial entity updates plus Firestore FieldValue support; keep domain rules out of this layer.
 */
export type UpdateData<T> = Partial<T> & {
  [key: string]: any | FieldValue;
};

/**
 * 🔒 Frozen history entry shape (v2.0.0).
 * Represents a snapshot of a document at a point in time for undo/redo functionality.
 */
export interface HistoryEntry<T extends BaseEntity> {
  id: string;
  documentId: string;
  snapshot: T;
  /** State after mutation (for redo). Set for update/delete/softDelete. */
  redoSnapshot?: T;
  operation: 'create' | 'update' | 'delete' | 'softDelete' | 'restore';
  timestamp: Date;
  actorId?: string;
  reason?: string;
  version: number; // _v field value
}
