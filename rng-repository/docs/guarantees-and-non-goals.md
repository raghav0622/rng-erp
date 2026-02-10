# Guarantees and Non-Goals

This document outlines the architectural boundaries of the repository. **v2.x is frozen:** public API and behavior are locked; only critical fixes are allowed.

## ✅ Guarantees

### 1. Client-Safe Execution

The repository is designed to run in untrusted client environments. It does not leak administrative credentials or bypass Firestore security rules.

### 2. Explicit Reads and Writes

No hidden network calls. Every database operation corresponds to an explicit method call. There is no "lazy loading" that triggers implicit fetches.

### 3. Predictable Failure

Errors are normalized to `RepositoryError`. The repository does not leak raw Firestore errors (except as `originalError` property). Failure modes are documented and stable.

### 4. Offline Tolerance

The repository provides a best-effort offline mutation queue. It allows the UI to remain responsive during network interruptions, queuing writes for later replay.

### 5. Operational Observability

Through the `onDiagnostic` hook, consumers can observe the internal behavior of the repository, including cache hits, retries, and query performance.

## ❌ Non-Goals

### 1. Relational Integrity

This is a NoSQL repository. It **will never** enforce foreign key constraints. It **will never** support cascading deletes or joins. Relations are handled via simple ID references.

### 2. Strong Uniqueness

Firestore does not support unique constraints natively. The `ensureUnique` helper is a best-effort check subject to race conditions. **Do not** rely on it for critical consistency.

### 3. Complex Transactions

The repository supports atomic operations on single documents or batched writes. It **will never** support complex, multi-step transactions spanning multiple collections or repositories.

### 4. RBAC Enforcement

Role-Based Access Control is the responsibility of Firestore Security Rules or the application layer. The repository **will never** implement its own permission system.

### 5. Admin SDK Features

This repository is strictly for the Client SDK. It **will never** support `bypassRules`, `listCollections`, or other privileged operations.
