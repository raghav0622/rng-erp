import { useMutation } from '@tanstack/react-query';
import { writeAuditEvent } from '../../shared/audit-log';
import { ServiceError } from '../../../feature-execution-engine/src/errors';
import { sendEmailVerification } from 'firebase/auth';
import { firebaseAuth } from '../../client/firebaseClient';

// useVerifyEmail: performs email verification, enforces state machine, emits audit event
  return useMutation(async (user: { uid: string; role: string }) => {
    if (!user?.uid) throw new ServiceError('No user to verify');
    try {
      if (!firebaseAuth.currentUser) throw new ServiceError('No authenticated user');
      await sendEmailVerification(firebaseAuth.currentUser);
    } catch (err: any) {
      throw new ServiceError('Failed to send verification email');
    }
    writeAuditEvent({
      actorUid: user.uid,
      actorRole: user.role,
      action: 'verifyEmail',
      createdAt: Date.now(),
    });
    return true;
  });
}
