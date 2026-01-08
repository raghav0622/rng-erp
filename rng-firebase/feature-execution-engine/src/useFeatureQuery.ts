import type { FeatureHookResult } from './types';

export function useFeatureQuery<T>(feature: string, query: string): FeatureHookResult<T> {
  throw new Error('useFeatureQuery must be implemented by the application.');
}
