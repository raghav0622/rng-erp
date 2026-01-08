import { useContext } from 'react';
import { ExecutionContext } from '../../auth-rbac-user-management-layer/shared/execution-context';
import { ExecutionContextReact } from './useFeatureSubscription';

export function useResolvedExecutionContext(): ExecutionContext {
  const ctx = useContext(ExecutionContextReact);
  if (!ctx) throw new Error('ExecutionContext not found in React context');
  return ctx;
}
