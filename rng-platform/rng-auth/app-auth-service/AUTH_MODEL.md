# Auth Model (Canonical)

## Split Authority

- **Firebase Auth**: Identity and email verification authority.
- **AppUser (Firestore)**: ERP user projection and role/activation state.

## One-Time AuthUid Linking Rule

Each Firebase Auth user (`authUid`) can be linked exactly once to one AppUser. Links are immutable.

## Email Verification Authority

`emailVerified` is authoritative in Firebase Auth. Firestore mirrors it during auth resolution. The mirror can lag; Firebase is always the source of truth.

## Disablement Semantics

`isDisabled` is enforced in Firestore only. Disabled users may keep existing Firebase sessions until the next auth resolution.

## Concurrent Sessions

Multiple concurrent sessions are allowed. There is no global session revocation.

## No Global Revocation

The system does not revoke sessions globally. This is an explicit client-side policy choice.
