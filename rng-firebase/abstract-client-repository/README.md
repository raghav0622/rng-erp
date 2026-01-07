# Abstract Client Firestore Repository (v1.0.0)

> **STATUS: FROZEN**
> This module is a v1 immutable contract.

## 🔒 Freeze Rules

- **Public API**: Immutable. No new methods, no signature changes.
- **Behavior**: Immutable. Error handling, batching, and transaction semantics are locked.
- **Dependencies**: Must not import from `hooks` or `react`.
- **Versioning**: `RNG_REPOSITORY_VERSION = "1.0.0"`

## ✅ Allowed Extensions

- Internal implementation details (private methods) may be optimized if behavior is preserved.
- Bug fixes that align implementation with the documented contract.

## 🚫 Forbidden

- Adding new public methods.
- Changing error types.
- Adding dependencies on upper layers.

## Versioning

Any change to the public API requires a major version bump (v2.0.0).

---

# Abstract Client Firestore Repository

**🔒 STATUS: FROZEN (v1.0.0)**

## Overview

This repository provides a platinum-grade, client-safe data access layer for Firestore. It is designed to be operationally robust, offline-tolerant, and strictly bounded. It abstracts Firestore mechanics while enforcing architectural invariants and providing enterprise-grade features like soft deletes, optimistic locking, and structured diagnostics.

## 🚫 What This Is NOT

- **NOT an ORM**: It does not manage object graphs, cascading saves, or complex relationships.
- **NOT a Server SDK**: It is designed for client-side usage (browser/mobile) and does not bypass security rules.
- **NOT a Business Logic Layer**: It handles data access only. Business rules belong in the domain layer.

## 🎯 Who This Repository Is For

- **ERP Frontends**: Applications requiring strict data integrity, audit trails, and offline resilience.
- **Internal Admin Systems**: Tools that need predictable, safe data access without complex business logic in the UI.
- **Long-Lived Business Applications**: Projects where maintainability and stability are prioritized over rapid prototyping speed.

## 🚫 Who This Repository Is NOT For

- **Rapid Prototypes**: If you need to move fast and break things, use the raw Firebase SDK.
- **Demo Apps**: The overhead of strict typing and contracts is unnecessary for throwaway code.
- **ORM-Style Data Access**: If you expect `user.posts.add(...)`, look elsewhere.

## Supported Guarantees

- **Type Safety**: Fully typed generic interface `IRepository<T>`.
- **Offline Tolerance**: Mutations are queued and replayed when online.
- **Optimistic Locking**: Prevents lost updates via version checks.
- **Soft Deletes**: Built-in support for non-destructive deletion.
- **Read Consistency**: Optional strong consistency modes.
- **Observability**: Structured diagnostic events for all operations.

## Unsupported Guarantees

- **Strong Uniqueness**: Uniqueness checks are best-effort and subject to race conditions (Firestore limitation).
- **Cross-Collection Transactions**: Transactions are scoped to specific operations within the repository.
- **Cascading Deletes**: Deleting a parent does not delete children.
- **Relational Integrity**: No foreign key constraints are enforced.

## Intended Usage Pattern

```typescript
// 1. Define Entity
interface User extends BaseEntity {
  name: string;
  email: string;
}

// 2. Extend Repository
class UserRepository extends AbstractClientFirestoreRepository<User> {
  constructor(firestore: Firestore) {
    super(firestore, {
      collectionName: 'users',
      softDelete: true,
      enableDiagnostics: true,
      // ... config
    });
  }
}

// 3. Use Interface
const userRepo: IRepository<User> = new UserRepository(db);
await userRepo.create({ name: 'Alice', email: 'alice@example.com' });
```

## ⚠️ Warning Against ORM Usage

Do not attempt to add "smart" features like automatic relation loading, lazy loading, or active record patterns. This repository is designed to be "mechanical and boring" to ensure predictability and stability under failure conditions.

## 🛡️ API Stability & Maintenance

This repository follows **Semantic Versioning**.

- **v1.x**: Backward compatible changes only.
- **v2.0**: Breaking changes.

### Maintenance Guidelines

1.  **Evaluate Changes**: Does this belong in the Service Layer? If yes, reject it here.
2.  **Reject Complexity**: If a feature adds "magic" (implicit behavior), reject it.
3.  **Protect the Contract**: Any change that breaks `tests/contract` is a breaking change.
