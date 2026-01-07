# Repository Contract (v1.0.0)

This document defines the behavioral contract for `IRepository<T>`. Any implementation must adhere strictly to these guarantees.

## Interface Definition

The complete API surface is defined by `IRepository<T>` in `types.ts`. No other public methods are permitted.

## Method Guarantees

### `getById(id, options?)`

- **Returns**: `Promise<T | null>`
- **Behavior**:
  - Returns the entity if found and not soft-deleted (unless `includeDeleted` is true).
  - Returns `null` if the document does not exist.
  - Returns `null` if the document is soft-deleted and `includeDeleted` is false.
- **Consistency**: Respects `options.readConsistency`. If `STRONG`, bypasses cache.

### `getOptional(id, options?)`

- **Returns**: `Promise<T | null>`
- **Behavior**: Alias for `getById`. Explicitly indicates optionality.

### `find(options?)`

- **Returns**: `Promise<PaginatedResult<T>>`
- **Behavior**:
  - Returns a list of entities matching the query options.
  - Respects `where`, `orderBy`, `limit`, `startAfter`.
  - Filters soft-deleted entities by default.
  - Memoizes results within the request scope (if context provided).

### `create(data, context?, options?)`

- **Returns**: `Promise<T>`
- **Behavior**:
  - Creates a new document.
  - Auto-generates ID unless `idStrategy` is 'client' or 'deterministic'.
  - Sets `createdAt`, `updatedAt`, `_v=1`.
  - Runs `beforeCreate` and `afterCreate` hooks.
  - Enforces invariants.
  - **Idempotency**: If `options.idempotencyKey` is provided and a record exists with that key, returns the existing record without error.

### `update(id, data, context?, options?)`

- **Returns**: `Promise<T>`
- **Behavior**:
  - Updates an existing document.
  - Updates `updatedAt`.
  - Increments `_v` (internal versioning).
  - Runs `beforeUpdate` and `afterUpdate` hooks.
  - Enforces invariants.
  - **Optimistic Locking**: If `options.optimisticLock` is true, throws `CONFLICT` if `_v` or `updatedAt` mismatches.

### `delete(id, context?)`

- **Returns**: `Promise<void>`
- **Behavior**:
  - Performs soft delete if configured, otherwise hard delete.
  - Runs `beforeDelete` and `afterDelete` hooks.
  - Enforces invariants.
  - Idempotent: Succeeds if document is already deleted or missing.

### `upsert(data, context?)`

- **Returns**: `Promise<T>`
- **Behavior**:
  - Creates if missing, updates if exists.
  - Atomic operation.

## Error Semantics

All errors thrown must be instances of `RepositoryError`.

| Code                  | Meaning                                                        |
| --------------------- | -------------------------------------------------------------- |
| `NOT_FOUND`           | Document expected but not found.                               |
| `VALIDATION_FAILED`   | Schema validation failed.                                      |
| `PERMISSION_DENIED`   | Firestore security rule violation or projection guard failure. |
| `CONFLICT`            | Optimistic locking failure or uniqueness violation.            |
| `FAILED_PRECONDITION` | Invariant violation or capability assertion failure.           |
| `OFFLINE_QUEUED`      | Operation queued for offline replay (informational).           |

## Contract Stability Rules

The following constitute a **BREAKING CHANGE** and require a major version bump:

1.  **Error Code Changes**: Modifying any existing `RepositoryErrorCode` or the conditions under which they are thrown.
2.  **Retry Behavior Changes**: Changing the default retryable error codes or the backoff strategy.
3.  **Read Consistency Defaults**: Changing the default `readConsistency` from `DEFAULT` (cache-first) to `STRONG`.
4.  **Soft Delete Semantics**: Changing the default behavior of `getById` regarding soft-deleted entities.
5.  **Invariant Hook Behavior**: Changing when invariant hooks are executed in the lifecycle (must remain _before_ DB ops).

## Retry Behavior

- **Policy**: Configurable via `retry` in `RepositoryConfig`.
- **Triggers**: `unavailable`, `deadline-exceeded`, `aborted`, `internal`.
- **Non-Retryable**: `permission-denied`, `invalid-argument`, `failed-precondition`.
- **Strategy**: Exponential backoff.

## Offline Behavior

- **Detection**: `navigator.onLine`.
- **Queueing**: Mutations (`create`, `update`, `delete`, `upsert`, `softDelete`, `restore`) are queued in-memory.
- **Return Value**: Returns a placeholder entity with `_offlineQueued: true`.
- **Replay**: Automatically flushes queue when `online` event fires.
- **Guarantees**: Best-effort. Queue is volatile (in-memory).

## Invariant Hooks

- **Execution**: Run **before** any lifecycle hooks or DB operations.
- **Blocking**: Can veto any write operation by throwing an error.
- **Scope**: Synchronous or Asynchronous.

## Diagnostics

- **Events**: Emitted via `onDiagnostic` callback.
- **Types**: `READ`, `WRITE`, `QUERY`, `BATCH`, `RETRY`, `OFFLINE_QUEUE`.
- **Privacy**: Must not contain PII or sensitive data payload, only metadata.
