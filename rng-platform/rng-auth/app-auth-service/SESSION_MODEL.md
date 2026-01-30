# AuthSession State Machine

## States

- `unknown`
- `unauthenticated`
- `authenticating`
- `authenticated`

## Allowed Transitions

- `unknown → unauthenticated | authenticating | authenticated`
- `unauthenticated → authenticating | unauthenticated`
- `authenticating → authenticated | unauthenticated`
- `authenticated → unauthenticated | authenticated`

## Invalid Transitions

Invalid transitions are **recorded** and **swallowed**, not thrown. This preserves app stability while retaining diagnostics.

## lastTransitionError

`lastTransitionError` exists to surface invalid transitions without crashing the application.

## Suspense Safety

State transitions are explicit and stable; consumers can safely suspend on session resolution.
