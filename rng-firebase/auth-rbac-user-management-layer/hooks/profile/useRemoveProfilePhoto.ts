// useRemoveProfilePhoto: remove user photo

import { useMutation } from '@tanstack/react-query';
import { useResolvedExecutionContext } from '../../../feature-execution-engine/src/execution-context';
import { writeAuditEvent } from '../../shared/audit-log';
// import { userRepo } from '...'; // Replace with actual user repository import

// Removes the current user's profile photo
export function useRemoveProfilePhoto() {
  const ctx = useResolvedExecutionContext();
  return useMutation({
    mutationFn: async () => {
      // Replace with actual repository update
      // await userRepo.update(ctx.user.uid, { photoURL: null });

      // Audit event
      writeAuditEvent({
        actorUid: ctx.user.uid,
        actorRole: ctx.role,
        action: 'remove_profile_photo',
        targetUid: ctx.user.uid,
        createdAt: Date.now(),
      });

      // Return new photoURL (pseudo, replace with actual value)
      return { photoURL: null };
    },
    retry: false,
  });
}
