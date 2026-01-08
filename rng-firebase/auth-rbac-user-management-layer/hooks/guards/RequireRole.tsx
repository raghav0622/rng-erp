// <RequireRole role="owner" />: throws if not correct role
export function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
  // Implementation will check user role and throw if not correct
  // ...
  throw new Error('Not implemented');
}
