'use client';

import { AuthLoadingOverlay } from '@/rng-platform/rng-auth/app-auth-components';

export default function UnauthenticatedLoadingFallback() {
  return <AuthLoadingOverlay />;
}
