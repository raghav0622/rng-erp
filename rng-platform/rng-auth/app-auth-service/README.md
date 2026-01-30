# AppAuthService (Client-Side ERP Auth)

**Status:** FROZEN CLIENT-SIDE AUTH MODULE

## Purpose

AppAuthService is the authoritative client-side authentication and user management service for the ERP. It integrates Firebase Auth with a Firestore-backed AppUser projection and enforces ERP-specific invariants at the client layer.

## Client-Only by Design

This module is intentionally client-only. It does not rely on Admin SDK or server-side enforcement. All behavior, limitations, and recovery procedures are explicit policy decisions.

## Guarantees

- Authenticated session always maps to a valid AppUser projection.
- Auth invariants are validated on every auth resolution.
- Email verification uses Firebase Auth as the source of truth.
- Session state is explicit and Suspense-friendly.
- Known failure states are detectable and recoverable by owner operations.

## Non-Guarantees (Explicitly Accepted)

- No atomic Auth + Firestore operations.
- No distributed transactions or server-side locks.
- No server-enforced uniqueness across collections.
- No global session revocation.
- Non-atomic invite activation is acceptable and documented.

## Why This Works for ERP

ERP usage prioritizes clarity, auditability, and deterministic recovery over strict real-time consistency. Client-side recovery tools and explicit invariants are sufficient for operational control in this context.
