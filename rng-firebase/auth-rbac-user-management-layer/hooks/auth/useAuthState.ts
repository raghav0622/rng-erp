import { useAuthStateInternal } from '@/rng-firebase/auth-rbac-user-management-layer/client';

// UI-safe, derived auth state (never raw context)
export function useAuthState() {
  const auth = useAuthStateInternal();
  // AuthProvider now guarantees full user object and invariants
  if (auth.status === 'unauthenticated') return { status: 'unauthenticated' } as const;
  if (auth.status === 'disabled') return { status: 'disabled' } as const;
  if (auth.status === 'unverified') return { status: 'unverified' } as const;
  if (auth.status === 'authenticated') {
    return {
      status: 'authenticated',
      user: auth.user,
    } as const;
  }
  return { status: 'unauthenticated' } as const;
}
