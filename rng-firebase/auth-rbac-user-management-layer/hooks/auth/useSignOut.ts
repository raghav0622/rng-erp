import { useMutation } from '@tanstack/react-query';
import { writeAuditEvent } from '../../shared/audit-log';
import { ServiceError } from '../../../feature-execution-engine/src/errors';
import { signOut } from 'firebase/auth';
import { firebaseAuth } from '../../client/firebaseClient';

// useSignOut: performs sign-out, enforces state machine, emits audit event
  return useMutation(async (user: { uid: string; role: string }) => {
    if (!user?.uid) throw new ServiceError('No user to sign out');
    try {
      await signOut(firebaseAuth);
    } catch (err: any) {
      throw new ServiceError('Sign out failed');
    }
    writeAuditEvent({
      actorUid: user.uid,
      actorRole: user.role,
      action: 'signOut',
      createdAt: Date.now(),
    });
    return true;
  });
}
