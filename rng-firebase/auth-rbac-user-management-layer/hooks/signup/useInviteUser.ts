// useInviteUser: owner only

import { useMutation } from '@tanstack/react-query';
import { useResolvedExecutionContext } from '../../../feature-execution-engine/src/execution-context';
import type { Role } from '../../../types/erp-types';
import { writeAuditEvent } from '../../shared/audit-log';

// Invite user: owner only
export function useInviteUser() {
  const ctx = useResolvedExecutionContext();
  return useMutation({
    mutationFn: async ({
      email,
      displayName,
      role,
    }: {
      email: string;
      displayName: string;
      role: Role;
    }) => {
      // Invariant: only owner can invite
      if (ctx.role !== 'owner') throw new Error('Only owner can invite users');

      // Create invite in Firestore via repository (pseudo, replace with actual repo call)
      // const inviteRepo = ...
      // const invite = await inviteRepo.create({
      //   email,
      //   displayName,
      //   role,
      //   invitedBy: ctx.user.uid,
      //   status: 'pending',
      //   createdAt: Date.now(),
      // });

      // Optionally, send invite email (out of scope for client)

      // Audit event
      writeAuditEvent({
        actorUid: ctx.user.uid,
        actorRole: ctx.role,
        action: 'invite_user',
        targetUid: email,
        metadata: { role },
        createdAt: Date.now(),
      });

      // Return invite (pseudo, replace with actual invite object)
      return {
        email,
        displayName,
        role,
        invitedBy: ctx.user.uid,
        status: 'pending',
        createdAt: Date.now(),
      };
    },
    retry: false,
  });
}
