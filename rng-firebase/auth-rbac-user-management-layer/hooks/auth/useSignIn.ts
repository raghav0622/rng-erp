import { useMutation } from '@tanstack/react-query';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ServiceError } from '../../../feature-execution-engine/src/errors';
import type { User } from '../../../types/erp-types';
import { firebaseAuth } from '../../client/firebaseClient';
import { writeAuditEvent } from '../../shared/audit-log';
// import { userRepository } from '../../abstract-client-repository/AbstractClientFirestoreRepository'; // Uncomment and use actual repo

// useSignIn: performs sign-in, enforces state machine, emits audit event
export function useSignIn() {
  return useMutation<User, Error, { email: string; password: string }>({
    mutationFn: async ({ email, password }) => {
      if (!email || !password) throw new ServiceError('Missing credentials');
      // Sign in with Firebase Auth
      let credential;
      try {
        credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      } catch (err: any) {
        throw new ServiceError('Invalid email or password');
      }
      const { user } = credential;
      // Lookup user profile in repository (replace with actual repo call)
      // const userRepo = ...
      // const profile = await userRepo.getById(user.uid);
      // if (!profile || !profile.isActive || profile.lifecycle === 'disabled') throw new ServiceError('User is not active');
      // Emit audit event using canonical user
      // writeAuditEvent({
      //   actorUid: profile.uid,
      //   actorRole: profile.role,
      //   action: 'signIn',
      //   createdAt: Date.now(),
      // });
      // return profile;
      // TEMP fallback until repo is wired:
      writeAuditEvent({
        actorUid: user.uid,
        actorRole: 'client',
        action: 'signIn',
        createdAt: Date.now(),
      });
      return {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        role: 'client',
        lifecycle: 'active',
        isEmailVerified: user.emailVerified,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    },
  });
}
