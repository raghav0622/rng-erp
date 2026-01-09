# Auth State Machine Matrix (CANONICAL)

This file is the canonical source of truth for all AuthStatus × AuthEvent transitions. All other representations (flows, types) are derived from this matrix. Any change here must be reflected in auth.flows.ts and auth.types.ts.

This document enumerates all valid AuthStatus × AuthEvent transitions and explicitly documents invalid transitions.

| Current Status          | Event           | Next Status / Error                                    |
| ----------------------- | --------------- | ------------------------------------------------------ |
| unauthenticated         | APP_BOOT        | unauthenticated                                        |
| unauthenticated         | SIGN_IN_SUCCESS | authenticated / email_unverified / disabled (per user) |
| unauthenticated         | SIGN_OUT        | unauthenticated                                        |
| unauthenticated         | EMAIL_VERIFIED  | email_unverified (no user)                             |
| unauthenticated         | USER_DISABLED   | disabled                                               |
| owner_bootstrap_allowed | SIGN_IN_SUCCESS | authenticated / email_unverified                       |
| owner_bootstrap_allowed | SIGN_OUT        | unauthenticated                                        |
| invited_signup_allowed  | SIGN_IN_SUCCESS | authenticated / email_unverified                       |
| invited_signup_allowed  | SIGN_OUT        | unauthenticated                                        |
| authenticated           | SIGN_OUT        | unauthenticated                                        |
| authenticated           | USER_DISABLED   | disabled                                               |
| authenticated           | EMAIL_VERIFIED  | authenticated                                          |
| email_unverified        | EMAIL_VERIFIED  | authenticated                                          |
| email_unverified        | SIGN_OUT        | unauthenticated                                        |
| email_unverified        | USER_DISABLED   | disabled                                               |
| disabled                | any             | disabled (irreversible)                                |

All transitions are enforced by the exhaustive state machine (see domain/auth/auth.state-machine.ts).
See canonical types: AuthStatus, AuthEvent, AuthFlowResult.
