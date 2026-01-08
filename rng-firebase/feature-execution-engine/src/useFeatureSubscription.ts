import { useContext, useEffect, useState } from 'react';
import { ExecutionContext } from '../../auth-rbac-user-management-layer/shared/execution-context';
import { assertRBAC } from './assertRBAC';
import type { FeatureHookResult } from './types';
// Import the repository registry and feature definitions as needed

// Canonical ExecutionContext React context (must be provided at app shell level)
import { createContext } from 'react';
export const ExecutionContextReact = createContext<ExecutionContext | null>(null);

export function useFeatureSubscription<T>(
  featureDef: {
    feature: string;
    action: string;
    permissions?: true;
    subscribe: (ctx: ExecutionContext, setData: (data: T) => void) => () => void;
  },
  options?: { context?: { teamId?: string; isAssigned?: boolean } },
): FeatureHookResult<T> {
  // Resolve execution context (canonical, never from props)
  const ctx = useContext(ExecutionContextReact);
  if (!ctx) throw new Error('ExecutionContext not found in React context');
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<unknown>(undefined);

  useEffect(() => {
    setIsLoading(true);
    setIsError(false);
    setError(undefined);
    try {
      assertRBAC(
        {
          feature: featureDef.feature,
          action: featureDef.action,
          permissions: featureDef.permissions,
          context: options?.context,
        },
        ctx,
      );
      const unsubscribe = featureDef.subscribe(ctx, (result: T) => {
        setData(result);
        setIsLoading(false);
      });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } catch (e) {
      setIsError(true);
      setError(e);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureDef, ctx, options?.context]);

  return { data, isLoading, isError, error };
}
