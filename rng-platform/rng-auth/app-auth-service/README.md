# AppAuthService (Client-Side ERP Auth)

**Status**: ✅ FROZEN v1 (FINAL)  
**Type**: Client-side authentication service (intentionally not backend-enforced)  
**Quality**: Enterprise-grade with comprehensive invariant checking  
**Stability**: Locked for multi-year production use

## Purpose

AppAuthService is the authoritative client-side authentication and user management service for the ERP. It integrates Firebase Auth with a Firestore-backed AppUser projection and enforces ERP-specific invariants at the client layer.

## Architecture Highlights

- **Split Authority**: Firebase Auth (identity) + Firestore AppUser (role/activation)
- **Invariant-Driven**: Comprehensive invariant checks across auth lifecycle
- **Resilient**: Race condition detection, rollback logic, error recovery
- **Resource-Safe**: Memory leaks prevented, timers cleaned up, listeners managed
- **Testable**: Observable state machine with explicit error types

## Client-Only by Policy (Frozen)

This module is intentionally client-only. It does not use Admin SDK or server-side enforcement. All behavior, limitations, and recovery procedures are explicit policy decisions that have been finalized.

## Guarantees (Canonical)

✅ **Session Integrity**: Authenticated session always maps to a valid AppUser projection  
✅ **Invariant Enforcement**: Auth invariants validated on every auth resolution  
✅ **Email Authority**: Email verification uses Firebase Auth as source of truth  
✅ **State Clarity**: Session state is explicit and Suspense-friendly  
✅ **Detectability**: Known failure states are detectable and recoverable via maintenance APIs  
✅ **Race Mitigation**: Owner bootstrap race detected & cleaned up; invite linking includes rollback  
✅ **Resource Safety**: No memory leaks, timers cleaned on logout, listeners cleared  
✅ **Error Resilience**: All operations wrapped in appropriate error handling

## Non-Guarantees (Explicitly Accepted)

- No atomic Auth + Firestore operations (client-side by design)
- No distributed transactions or server-side locks
- No server-enforced uniqueness (invariants are best-effort)
- No global session revocation
- Partial failures are expected and managed via invariant checks

## Implementation Highlights

**Rollback Logic**: Auth identity linking includes rollback protection to prevent orphaned users  
**Email Sync**: Email verification state synchronized with Firebase Auth during auth resolution  
**Session Expiry**: Local UX timeout (24h) for stale sessions; not auth revocation  
**Orphan Detection**: Owner-accessible maintenance APIs for cleanup and diagnostics  
**State Machine**: Observable, guarded transitions with explicit error recording

## Why This Design Works for ERP

ERP usage requires:

1. **Clarity**: Explicit state machine, observable errors, documented limitations
2. **Auditability**: Comprehensive invariants, error logging, operation traces
3. **Recovery**: Owner maintenance APIs, cleanup tools, explicit repair workflows

Client-side recovery tools and explicit invariants provide operational control in this architecture without backend complexity.

## Performance Characteristics

- **Memory**: O(n) where n = unique authenticated users (rate limit maps)
- **Session Timer**: Stops when logged out (resource-efficient)
- **Mutation Latency**: 30 second timeout per auth operation
- **Rate Limits**: 30 owner ops/min, 3 password changes/min, 5 resets/hour

## Deployment Model

This v1 service is designed for stable, long-term production use. It is frozen and not intended to migrate to backend enforcement or Admin SDK patterns.
