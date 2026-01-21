// FORBIDDEN_IMPORT_GUARD.ts
// This file will throw at build time if forbidden imports are detected in app code.
// Forbidden: repositories/*, domain/*, rbac/*, auth/*, adapters/*
if (process.env.NODE_ENV !== 'test') {
  throw new Error(
    'Forbidden import: App code must not import from rng-firebase/repositories, domain, rbac, auth, or adapters. Use only the public kernel API.',
  );
}
