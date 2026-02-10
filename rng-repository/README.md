# rng-repository (v2.0.0 — FROZEN)

> **STATUS: v2 LOCKED**  
> Public API and behavior are frozen for the v2.x series. Only critical bug fixes and contract-aligned corrections are allowed. New features require a new major version.

## Public API (entry point: `index.ts`)

Consumers must import only from the package entry point. No internal modules are part of the public contract.

| Export | Description |
|--------|-------------|
| `AbstractClientFirestoreRepository` | Base class to extend for collection-specific repositories |
| `RNG_REPOSITORY_VERSION` | Version string `"2.0.0"` |
| `IRepository` | Repository interface (type) |
| `RepositoryError`, `RepositoryErrorCode` | Error handling |
| `BaseEntity`, `AuditContext`, `RepositoryContext` | Core types |
| `RepositoryConfig`, `RepositoryHooks`, `InvariantHooks` | Configuration and hooks |
| `QueryOptions`, `GetOptions`, `CreateOptions`, `UpdateOptions` | Option types |
| `PaginatedResult`, `BatchOperationResult`, `UpdateData` | Result and payload types |
| `HistoryEntry` | History/undo-redo (v2) |
| `RelationConfig`, `RepositoryDiagnosticEvent`, `RetryPolicy` | Optional features |
| `EncryptionStrategy`, `CompressionStrategy` | Pluggable strategies |
| `SearchProvider`, `SearchResult`, `CacheProvider` | Optional providers |

Internal modules (e.g. `utils/`, `AbstractClientFirestoreRepository.ts` internals, `errors.ts` as a file path) are not part of the public API and may change without notice.

---

## Overview

Client-safe Firestore data access layer: type-safe CRUD, queries, soft deletes, optimistic locking, optional history (undo/redo), and structured errors. No ORM, no server SDK, no business logic—mechanical data access only.

## v2.0.0 behavior (frozen)

- **Error mapping**: Firestore errors → `RepositoryError` with semantic codes (e.g. `FAILED_PRECONDITION`, `UNAVAILABLE`, `CONCURRENT_MODIFICATION`).
- **Soft delete**: `getMany()` and get options support `includeDeleted`.
- **Optimistic locking**: `_v` required when `optimisticLock: true`.
- **History**: Optional `undo` / `redo` / `getHistory` with subcollection or embedded storage.

See [repository-contract.md](./docs/repository-contract.md) for the full behavioral contract.

## Usage

```typescript
import {
  AbstractClientFirestoreRepository,
  BaseEntity,
  IRepository,
  RepositoryError,
  RepositoryErrorCode,
} from '@/rng-repository'; // or your package alias

interface User extends BaseEntity {
  name: string;
  email: string;
}

class UserRepository extends AbstractClientFirestoreRepository<User> {
  constructor(firestore: Firestore) {
    super(firestore, {
      collectionName: 'users',
      softDelete: true,
      enableDiagnostics: true,
    });
  }
}

const repo: IRepository<User> = new UserRepository(db);
await repo.create({ name: 'Alice', email: 'alice@example.com' });
```

## Error handling

All errors are normalized to `RepositoryError` with a `code` from `RepositoryErrorCode`. See README error table and [repository-contract.md](./docs/repository-contract.md).

## History (undo/redo)

Enable with `enableHistory: true` and optional `historyStorage: 'subcollection' | 'embedded'`. Redo is supported for **update** operations (subcollection storage). See README “History Tracking” section and contract doc for limits.

## Testing

Tests live in `tests/` and require the Firestore emulator.

1. Start emulator: `npm run emulator` (from repo root).
2. Restart emulator after changing `firestore.rules`.
3. Run: `npm test` or `npx vitest run rng-repository`.

## Documentation

- [repository-contract.md](./docs/repository-contract.md) — Behavioral contract (v2.0.0).
- [guarantees-and-non-goals.md](./docs/guarantees-and-non-goals.md) — What this layer does and does not do.
- [repository-freeze-checklist.md](./docs/repository-freeze-checklist.md) — Checklist for any change under the v2 freeze.

## Versioning

- **v2.x**: Frozen. No new public methods or exports; only critical fixes and contract-aligned behavior.
- **v3+**: Any new features or breaking changes require a new major version.
