// useUploadProfilePhoto: upload user photo

import { useMutation } from '@tanstack/react-query';
import { useResolvedExecutionContext } from '../../../feature-execution-engine/src/execution-context';
import { writeAuditEvent } from '../../shared/audit-log';
// import { userRepo } from '...'; // Replace with actual user repository import

// Uploads a new profile photo for the current user
export function useUploadProfilePhoto() {
  const ctx = useResolvedExecutionContext();
  return useMutation({
    mutationFn: async (file: File) => {
      // Replace with actual upload logic and repository update
      // const photoURL = await uploadToStorage(file, ctx.user.uid);
      // await userRepo.update(ctx.user.uid, { photoURL });

      // Audit event
      writeAuditEvent({
        actorUid: ctx.user.uid,
        actorRole: ctx.role,
        action: 'upload_profile_photo',
        targetUid: ctx.user.uid,
        createdAt: Date.now(),
      });

      // Return new photoURL (pseudo, replace with actual value)
      return { photoURL: 'uploaded-url-placeholder' };
    },
    retry: false,
  });
}
