// useAcceptInvite: invited users only

import { useMutation } from '@tanstack/react-query';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useResolvedExecutionContext } from '../../../feature-execution-engine/src/execution-context';
import type { User } from '../../../types/erp-types';
import { firebaseAuth } from '../../client/firebaseClient';
import { writeAuditEvent } from '../../shared/audit-log';

// Accept invite: invited users only
export function useAcceptInvite() {
  const ctx = useResolvedExecutionContext();
  return useMutation({
    mutationFn: async ({
      email,
      password,
      displayName,
      inviteToken,
    }: {
      email: string;
      password: string;
      displayName: string;
      inviteToken: string;
    }) => {
      // Invariant: only invited users can accept
      // (Assume inviteRepo exists and is imported)
      // const inviteRepo = ...
      // const invite = await inviteRepo.findOne({ where: [['token', '==', inviteToken], ['email', '==', email], ['status', '==', 'pending']] });
      // if (!invite) throw new Error('Invalid or expired invite');

      // Create user in Firebase Auth
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateProfile(cred.user, { displayName });

      // Create user in Firestore via repository (pseudo, replace with actual repo call)
      // const user: User = await userRepo.create({
      //   uid: cred.user.uid,
      //   email,
      //   displayName,
      //   role: invite.role,
      //   lifecycle: 'active',
      //   isEmailVerified: cred.user.emailVerified,
      //   isActive: true,
      //   createdAt: Date.now(),
      //   updatedAt: Date.now(),
      // });

      // Mark invite as accepted (pseudo, replace with actual repo call)
      // await inviteRepo.update(invite.id, { status: 'accepted', acceptedBy: cred.user.uid, acceptedAt: Date.now() });

      // Audit event
      writeAuditEvent({
        actorUid: cred.user.uid,
        actorRole: ctx.role,
        action: 'accept_invite',
        targetUid: email,
        createdAt: Date.now(),
      });

      // Return user (pseudo, replace with actual user object)
      return {
        uid: cred.user.uid,
        email,
        displayName,
        role: ctx.role,
        lifecycle: 'active',
        isEmailVerified: cred.user.emailVerified,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as User;
    },
    retry: false,
  });
}
