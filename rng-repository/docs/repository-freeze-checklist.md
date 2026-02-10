# Repository Freeze Checklist (v2 — LOCKED)

Use this checklist for **any** change to rng-repository. v2.x is frozen: only critical bug fixes and contract-aligned behavior changes are allowed. New features or breaking changes require v3.

## API Stability

- [ ] **Public API Unchanged**: Verify `IRepository<T>` and exported types have not been modified.
- [ ] **No New Public Methods**: No new methods on `IRepository` or `AbstractClientFirestoreRepository`.
- [ ] **No New Public Exports**: `index.ts` must not export new symbols. No new types in the public list.
- [ ] **No Error Code Changes**: `RepositoryErrorCode` enum is frozen in v2.x.
- [ ] **No Retry Semantics Changes**: Retry logic and default backoff remain stable.

## Safety

- [ ] **Client-Only Usage**: Confirm no `firebase-admin` imports or usage.
- [ ] **No Secrets**: Ensure no API keys or credentials are hardcoded.
- [ ] **Input Sanitization**: Verify all writes pass through `sanitizeForWrite`.

## Architecture

- [ ] **No ORM Behavior**: Confirm no "active record" patterns or lazy loading.
- [ ] **No Business Logic**: Ensure domain rules remain in the application layer.
- [ ] **No RBAC Logic**: Confirm authorization is left to Security Rules.

## Testing

- [ ] **Contract Tests Passing**: Run `tests/contract/repository.contract.spec.ts`.
- [ ] **Error Semantics Verified**: Ensure errors match `RepositoryErrorCode`.
- [ ] **Offline Queue Tested**: Verify queue behavior under simulated offline conditions.

## Documentation

- [ ] **README Updated**: Reflect any configuration changes.
- [ ] **Contract Documented**: Update `repository-contract.md` if behavior clarifies.
- [ ] **Non-Goals Respected**: Ensure changes do not violate `guarantees-and-non-goals.md`.
