# Client-Side Limitations (Explicit & Accepted)

This module is client-only by policy. The following constraints are intentional and permanent.

## Constraints

- No distributed transactions.
- No atomic Auth + Firestore operations.
- No server-enforced uniqueness.
- Eventual consistency windows.
- No global session revocation.

## Intentional “Hacks”

- Soft-delete + recreate during authUid linking.
- Temporary disablement during invite activation.
- Orphaned AppUsers after partial failures.

## Limitation Breakdown

### 1) Non-Atomic Auth + Firestore

**What can go wrong:** partial updates and orphaned records.  
**Detection:** invariant checks and orphan listing.  
**Recovery:** owner cleanup APIs.

### 2) No Server-Enforced Uniqueness

**What can go wrong:** duplicate emails under concurrency.  
**Detection:** invariant checks on read/query.  
**Recovery:** owner manual cleanup.

### 3) Eventual Consistency

**What can go wrong:** temporary mismatches (e.g., emailVerified).  
**Detection:** comparison to Firebase Auth source of truth.  
**Recovery:** next auth resolution resyncs.

### 4) Temporary Disablement During Activation

**What can go wrong:** transient disabled state if flow is interrupted.  
**Detection:** invariant checks at auth resolution.  
**Recovery:** owner repair or user reattempt.

## Final Policy Statement

These are ACCEPTED constraints. No backend migration is planned.
