// useAssignUserToTeam: assign user to team

import { useMutation } from '@tanstack/react-query';
import { useResolvedExecutionContext } from '../../../feature-execution-engine/src/execution-context';
import { writeAuditEvent } from '../../shared/audit-log';
// import { teamMemberRepo } from '...'; // Replace with actual team member repository import
import type { TeamMember } from '../../../types/erp-types';

// Assigns a user to a team
export function useAssignUserToTeam() {
  const ctx = useResolvedExecutionContext();
  return useMutation({
    mutationFn: async ({
      uid,
      teamId,
      role,
    }: {
      uid: string;
      teamId: string;
      role: 'manager' | 'employee';
    }) => {
      // Replace with actual repository call
      // const member: TeamMember = await teamMemberRepo.create({ uid, teamId, role });

      // Audit event
      writeAuditEvent({
        actorUid: ctx.user.uid,
        actorRole: ctx.role,
        action: 'assign_user_to_team',
        targetUid: uid,
        metadata: { teamId, role },
        createdAt: Date.now(),
      });

      // Return member (pseudo, replace with actual member object)
      return { uid, teamId, role } as TeamMember;
    },
    retry: false,
  });
}
