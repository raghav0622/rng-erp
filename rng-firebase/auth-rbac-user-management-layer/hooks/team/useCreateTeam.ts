// useCreateTeam: create a new team

import { useMutation } from '@tanstack/react-query';
import { useResolvedExecutionContext } from '../../../feature-execution-engine/src/execution-context';
import { writeAuditEvent } from '../../shared/audit-log';
// import { teamRepo } from '...'; // Replace with actual team repository import
import type { Team } from '../../../types/erp-types';

// Creates a new team
export function useCreateTeam() {
  const ctx = useResolvedExecutionContext();
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      // Replace with actual repository call
      // const team: Team = await teamRepo.create({ name, createdAt: Date.now() });

      // Audit event
      writeAuditEvent({
        actorUid: ctx.user.uid,
        actorRole: ctx.role,
        action: 'create_team',
        metadata: { name },
        createdAt: Date.now(),
      });

      // Return team (pseudo, replace with actual team object)
      return { id: 'team-id-placeholder', name, createdAt: Date.now() } as Team;
    },
    retry: false,
  });
}
