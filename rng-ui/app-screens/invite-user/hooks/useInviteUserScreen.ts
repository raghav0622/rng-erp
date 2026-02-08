'use client';

import { inviteUserSchema, useInviteUser } from '@/rng-platform';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ZodTypeAny } from 'zod';

export function useInviteUserScreen(): {
  externalErrors: string[];
  inviteComplete: boolean;
  invitedEmail: string;
  isSubmitting: boolean;
  handleSubmit: (values: any) => Promise<void>;
  inviteUserSchema: ZodTypeAny;
} {
  const router = useRouter();
  const inviteUser = useInviteUser();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [inviteComplete, setInviteComplete] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');

  const handleSubmit = async (values: any) => {
    setExternalErrors([]);
    try {
      await inviteUser.mutateAsync(values);
      setInvitedEmail(values.email);
      setInviteComplete(true);
      setTimeout(() => router.push('/dashboard/user-management'), 2000);
    } catch (error: any) {
      const errorMessages: string[] = [];

      if (error?.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessages.push('This email address is already registered in the system.');
            break;
          case 'auth/invalid-email':
            errorMessages.push('The email address format is invalid.');
            break;
          case 'auth/invalid-input':
            errorMessages.push(error.message || 'Invalid input provided.');
            break;
          case 'auth/internal':
            if (error.message && error.message !== 'Authentication error occurred.') {
              errorMessages.push(error.message);
            } else {
              errorMessages.push('Failed to send invitation. Please try again.');
            }
            break;
          case 'auth/not-authorized':
            errorMessages.push('You do not have permission to invite users.');
            break;
          case 'auth/too-many-requests':
            errorMessages.push('Too many invitation attempts. Please try again later.');
            break;
          default:
            errorMessages.push(
              error.message || 'An unexpected error occurred while sending the invitation.',
            );
        }
      } else if (error?.message) {
        errorMessages.push(error.message);
      }

      if (error?.errors && Array.isArray(error.errors)) {
        errorMessages.push(...error.errors);
      }

      setExternalErrors(
        errorMessages.length > 0
          ? errorMessages
          : ['An unexpected error occurred while sending the invitation.'],
      );
    }
  };

  return {
    externalErrors,
    inviteComplete,
    invitedEmail,
    isSubmitting: inviteUser.isPending,
    handleSubmit,
    inviteUserSchema: inviteUserSchema as ZodTypeAny,
  };
}
