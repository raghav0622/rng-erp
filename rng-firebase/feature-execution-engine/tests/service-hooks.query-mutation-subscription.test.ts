import { describe, expect, it } from 'vitest';
import * as ServiceHooks from '../src';

describe('abstract-service-hooks query/mutation/subscription', () => {
  it('should throw for all unimplemented hooks', () => {
    expect(() => ServiceHooks.useFeature('foo')).toThrow();
    expect(() => ServiceHooks.useFeatureMutation('foo')).toThrow();
    expect(() => ServiceHooks.useFeatureQuery('foo', 'bar')).toThrow();
    expect(() => ServiceHooks.useFeatureSubscription('foo', 'bar')).toThrow();
  });
});
