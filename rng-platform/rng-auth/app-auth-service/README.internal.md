# AppAuthService Internal & Maintenance APIs

## Scope

This document covers internal-only methods and maintenance operations that exist for client-side recovery.

## Internal APIs

- `listOrphanedLinkedUsers()`
- `cleanupOrphanedLinkedUser(userId)`
- `getLastAuthError()` / `getLastSessionTransitionError()`

## Orphaned User Scenarios

Orphaned AppUsers can occur when Auth and Firestore updates are interrupted mid-flow. This is expected in a client-only system.

## Recovery Expectations

Owners are responsible for repair using the provided maintenance APIs. These are first-class recovery tools, not errors to be hidden.

## Rationale

Client-only systems cannot guarantee atomicity across Auth and Firestore. Manual repair is the correct, explicit recovery strategy in this system.
