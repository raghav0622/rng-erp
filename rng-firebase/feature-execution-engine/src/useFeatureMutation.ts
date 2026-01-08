import { useMutation } from '@tanstack/react-query';
import { useContext } from 'react';
import { assertRBAC } from './assertRBAC';
import type { FeatureMutationResult } from './types';
import { ExecutionContextReact } from './useFeatureSubscription';

export function useFeatureMutation<TInput, TResult>(
  featureDef: {
    feature: string;
    action: string;
    permissions?: true;
    execute: (
      input: TInput,
      ctx: import('../../auth-rbac-user-management-layer/shared/execution-context').ExecutionContext,
    ) => Promise<TResult>;
  },
  options?: { context?: { teamId?: string; isAssigned?: boolean } },
): FeatureMutationResult<TInput> {
  const ctx = useContext(ExecutionContextReact);
  if (!ctx) throw new Error('ExecutionContext not found in React context');

  const mutation = useMutation<TResult, unknown, TInput>({
    mutationFn: async (input: TInput) => {
      assertRBAC(
        {
          feature: featureDef.feature,
          action: featureDef.action,
          permissions: featureDef.permissions,
          context: options?.context,
        },
        ctx,
      );
      return featureDef.execute(input, ctx);
    },
    retry: false,
  });

  return {
    mutate: mutation.mutate,
    isLoading: mutation.isLoading,
    isError: mutation.isError,
    error: mutation.error,
  };
}
