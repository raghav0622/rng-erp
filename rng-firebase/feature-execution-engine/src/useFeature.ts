import type { FeatureHookResult } from './types';

export function useFeature<T>(feature: string): FeatureHookResult<T> {
  throw new Error('useFeature must be implemented by the application.');
}
