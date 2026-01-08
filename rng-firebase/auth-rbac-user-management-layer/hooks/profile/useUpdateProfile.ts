// useUpdateProfile: update user profile

import { useMutation } from '@tanstack/react-query';
import { useResolvedExecutionContext } from '../../../feature-execution-engine/src/execution-context';
import { writeAuditEvent } from '../../shared/audit-log';
// import { userRepo } from '...'; // Replace with actual user repository import
import type { User } from '../../../types/erp-types';

// Updates the current user's profile in the repository
export function useUpdateProfile() {
  const ctx = useResolvedExecutionContext();
  return useMutation({
    mutationFn: async (updates: Partial<User>) => {
      // Replace with actual repository call
      // const user = await userRepo.update(ctx.user.uid, updates);

      // Audit event
      writeAuditEvent({
        actorUid: ctx.user.uid,
        actorRole: ctx.role,
        action: 'update_profile',
        targetUid: ctx.user.uid,
        metadata: updates,
        createdAt: Date.now(),
      });

      // Return updated user (pseudo, replace with actual user object)
      return { ...ctx.user, ...updates };
    },
    retry: false,
  });
}
