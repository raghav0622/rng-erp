/**
 * @rng-erp/repository — Public API (v2 — FROZEN)
 *
 * This is the only supported entry point. Export surface is locked for v2.x.
 * No new exports; no new methods on IRepository or AbstractClientFirestoreRepository.
 * Only critical bug fixes and contract-aligned behavior changes are allowed.
 *
 * @version 2.0.0
 */

export { AbstractClientFirestoreRepository, RNG_REPOSITORY_VERSION } from './AbstractClientFirestoreRepository';
export type { IRepository } from './types';

export type {
  BaseEntity,
  AuditContext,
  RepositoryContext,
  RepositoryConfig,
  RepositoryHooks,
  InvariantHooks,
  QueryOptions,
  GetOptions,
  CreateOptions,
  UpdateOptions,
  PaginatedResult,
  BatchOperationResult,
  UpdateData,
  HistoryEntry,
  RelationConfig,
  RepositoryDiagnosticEvent,
  RetryPolicy,
  EncryptionStrategy,
  CompressionStrategy,
  SearchProvider,
  SearchResult,
  CacheProvider,
} from './types';

export { RepositoryError, RepositoryErrorCode } from './errors';
