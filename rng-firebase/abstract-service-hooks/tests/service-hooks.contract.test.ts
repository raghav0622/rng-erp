import { describe, expect, it } from 'vitest';
import * as ServiceHooks from '../src';

describe('abstract-service-hooks contract', () => {
  it('should export all required abstractions', () => {
    expect(ServiceHooks).toHaveProperty('assertRBAC');
    expect(ServiceHooks).toHaveProperty('ServiceErrorBoundary');
    expect(ServiceHooks).toHaveProperty('ServiceSuspense');
    expect(ServiceHooks).toHaveProperty('useFeature');
    expect(ServiceHooks).toHaveProperty('useFeatureMutation');
    expect(ServiceHooks).toHaveProperty('useFeatureQuery');
    expect(ServiceHooks).toHaveProperty('useFeatureSubscription');
    expect(ServiceHooks).toHaveProperty('defineFeature');
    expect(ServiceHooks).toHaveProperty('defineFeatureQuery');
  });

  it('should throw for unimplemented hooks', () => {
    expect(() => ServiceHooks.useFeature('foo')).toThrow();
    expect(() => ServiceHooks.useFeatureMutation('foo')).toThrow();
    expect(() => ServiceHooks.useFeatureQuery('foo', 'bar')).toThrow();
    expect(() => ServiceHooks.useFeatureSubscription('foo', 'bar')).toThrow();
  });
});
