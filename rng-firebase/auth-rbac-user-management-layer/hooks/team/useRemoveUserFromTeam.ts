// useRemoveUserFromTeam: remove user from team

import { useMutation } from '@tanstack/react-query';
import { useResolvedExecutionContext } from '../../../feature-execution-engine/src/execution-context';
import { writeAuditEvent } from '../../shared/audit-log';
// import { teamMemberRepo } from '...'; // Replace with actual team member repository import

// Removes a user from a team
export function useRemoveUserFromTeam() {
  const ctx = useResolvedExecutionContext();
  return useMutation({
    mutationFn: async ({ uid, teamId }: { uid: string; teamId: string }) => {
      // Replace with actual repository call
      // await teamMemberRepo.delete(`${teamId}:${uid}`);

      // Audit event
      writeAuditEvent({
        actorUid: ctx.user.uid,
        actorRole: ctx.role,
        action: 'remove_user_from_team',
        targetUid: uid,
        metadata: { teamId },
        createdAt: Date.now(),
      });

      // Return result (pseudo, replace with actual logic)
      return { uid, teamId };
    },
    retry: false,
  });
}
