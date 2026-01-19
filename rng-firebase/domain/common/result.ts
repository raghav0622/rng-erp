// DomainResult<T> — Adapter → Domain result contract
// All adapter methods must return this type, never raw errors.

export type DomainResult<T> = { ok: true; value: T } | { ok: false; error: Error };
