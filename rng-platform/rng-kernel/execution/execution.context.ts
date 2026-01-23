// ExecutionContext creation and invariants enforcement
import type { CanonicalRole } from '../../domain/rbac/rbac.contract';
import type { User } from '../../domain/user/user.contract';
import type { ExecutionContext } from './execution.contract';

export function createExecutionContext(params: {
  user: User;
  role: CanonicalRole;
  now: number;
  authEpoch: number;
}): Readonly<ExecutionContext> {
  const ctx: ExecutionContext = {
    user: params.user,
    role: params.role,
    now: params.now,
    authEpoch: params.authEpoch,
  };
  return deepFreeze(ctx);
}

function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  // Handle arrays
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      // @ts-ignore
      deepFreeze(obj[i]);
    }
    return Object.freeze(obj);
  }
  // Handle objects
  const propNames = Object.getOwnPropertyNames(obj);
  for (const name of propNames) {
    // @ts-ignore
    const value = obj[name];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return Object.freeze(obj);
}
