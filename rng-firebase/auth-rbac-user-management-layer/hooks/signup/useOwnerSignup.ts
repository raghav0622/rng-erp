// useOwnerSignup: first user only

import { useMutation } from '@tanstack/react-query';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useResolvedExecutionContext } from '../../../feature-execution-engine/src/execution-context';
import type { User } from '../../../types/erp-types';
import { firebaseAuth } from '../../client/firebaseClient';
import { writeAuditEvent } from '../../shared/audit-log';

// Owner bootstrap signup: only allowed if no users exist
export function useOwnerSignup() {
  const ctx = useResolvedExecutionContext();
  return useMutation({
    mutationFn: async ({
      email,
      password,
      displayName,
    }: {
      email: string;
      password: string;
      displayName: string;
    }) => {
      // Invariant: only allowed if no users exist (bootstrap)
      // (Assume a UserRepository exists and is imported as userRepo)
      // This is a placeholder; replace with actual repository instance
      // const userRepo = ...
      // const userCount = await userRepo.count();
      // if (userCount > 0) throw new Error('Owner signup not allowed: users already exist');

      // Create user in Firebase Auth
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await updateProfile(cred.user, { displayName });

      // Create user in Firestore via repository (pseudo, replace with actual repo call)
      // const user: User = await userRepo.create({
      //   uid: cred.user.uid,
      //   email,
      //   displayName,
      //   role: 'owner',
      //   lifecycle: 'active',
      //   isEmailVerified: cred.user.emailVerified,
      //   isActive: true,
      //   createdAt: Date.now(),
      //   updatedAt: Date.now(),
      // });

      // Audit event
      writeAuditEvent({
        actorUid: cred.user.uid,
        actorRole: 'owner',
        action: 'owner_signup',
        createdAt: Date.now(),
      });

      // Return user (pseudo, replace with actual user object)
      return {
        uid: cred.user.uid,
        email,
        displayName,
        role: 'owner',
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
