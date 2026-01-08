import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';
import { assertRBAC } from './assertRBAC';
import type { FeatureHookResult } from './types';
import { ExecutionContextReact } from './useFeatureSubscription';

export function useFeatureQuery<T>(
  featureDef: {
    feature: string;
    action: string;
    permissions?: true;
    query: (
      ctx: import('../../auth-rbac-user-management-layer/shared/execution-context').ExecutionContext,
    ) => Promise<T>;
  },
  options?: { context?: { teamId?: string; isAssigned?: boolean } },
): FeatureHookResult<T> {
  const ctx = useContext(ExecutionContextReact);
  if (!ctx) throw new Error('ExecutionContext not found in React context');

  const queryKey = [featureDef.feature, featureDef.action, ctx.user.id, options?.context];
  const queryFn = async () => {
    assertRBAC(
      {
        feature: featureDef.feature,
        action: featureDef.action,
        permissions: featureDef.permissions,
        context: options?.context,
      },
      ctx,
    );
    return featureDef.query(ctx);
  };

  const { data, isLoading, isError, error } = useQuery<T>({
    queryKey,
    queryFn,
    suspense: true,
    retry: false,
  });

  return { data, isLoading, isError, error };
}
