# Repository Freeze Checklist

Use this checklist to validate any changes to the repository.

## API Stability

- [ ] **Public API Unchanged**: Verify `IRepository<T>` has not been modified.
- [ ] **No New Public Methods**: Ensure no new methods are exposed on the abstract class.
- [ ] **Semver Compliance**: Any behavioral change requires a version bump.
- [ ] **No New Public Exports**: Verify `index.ts` or `types.ts` do not export new symbols.
- [ ] **No Error Code Changes**: Confirm `RepositoryErrorCode` enum is unchanged.
- [ ] **No Retry Semantics Changes**: Verify retry logic and default backoff remain stable.

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
