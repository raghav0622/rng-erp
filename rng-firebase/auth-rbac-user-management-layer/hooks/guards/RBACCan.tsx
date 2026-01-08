// <RBACCan resource action fallback />: throws or renders fallback if not allowed
export function RBACCan({
  resource,
  action,
  fallback,
  children,
}: {
  resource: string;
  action: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Implementation will check RBAC and throw or render fallback
  // ...
  throw new Error('Not implemented');
}
