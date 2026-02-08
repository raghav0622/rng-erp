'use client';

import { RNGLoadingOverlay } from '@/rng-ui/ux';
import { Suspense } from 'react';
import { ResetPasswordScreen } from './_ResetPasswordScreen';

export function ResetPasswordRoute() {
  return (
    <Suspense fallback={<RNGLoadingOverlay message="Loading reset form..." />}>
      <ResetPasswordScreen />
    </Suspense>
  );
}
