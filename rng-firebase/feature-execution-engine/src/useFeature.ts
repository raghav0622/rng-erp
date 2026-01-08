import type { FeatureHookResult } from './types';

export function useFeature<T>(feature: string): FeatureHookResult<T> {
  throw new Error(
    'useFeature is not implemented. All feature access must go through useFeatureQuery, useFeatureMutation, or useFeatureSubscription.',
  );
}
