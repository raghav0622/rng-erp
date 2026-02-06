'use client';

import RNGForm from '@/rng-forms/RNGForm';
import { inviteUserSchema, useInviteUser } from '@/rng-platform';
import { RNGPageContent } from '@/rng-ui/ux';
import { Alert, Center, Loader, Stack, Text } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function InviteUserPage() {
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

      // Handle AppAuthError types with specific messages
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
            // InternalAuthError now has custom messages - use them
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

      // Fallback for validation errors array
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

  if (inviteComplete) {
    return (
      <RNGPageContent
        title="Invitation Sent!"
        description="The invitation has been sent successfully"
        size="md"
      >
        <Center py="xl">
          <Stack align="center" gap="lg">
            <IconCheck size={64} color="var(--mantine-color-green-6)" stroke={2} />
            <Stack align="center" gap="xs">
              <Text size="lg" fw={500}>
                Invitation has been sent to:
              </Text>
              <Text size="xl" fw={700} c="blue">
                {invitedEmail}
              </Text>
            </Stack>
            <Loader size="sm" mt="md" />
            <Text size="sm" c="dimmed">
              Redirecting to user management...
            </Text>
          </Stack>
        </Center>
      </RNGPageContent>
    );
  }

  return (
    <RNGPageContent
      title="Invite Team Member"
      description="Send an invitation to join your organization"
    >
      <Stack gap="lg">
        <RNGForm
          schema={{
            items: [
              {
                type: 'text',
                name: 'name',
                label: 'Full Name',
                placeholder: 'John Doe',
                required: true,
                colProps: { span: { base: 12, sm: 6 } },
              },
              {
                type: 'text',
                name: 'email',
                label: 'Email Address',
                placeholder: 'john.doe@example.com',
                required: true,
                colProps: { span: { base: 12, sm: 6 } },
              },
              {
                type: 'select',
                name: 'role',
                label: 'Role',
                required: true,
                options: [
                  { value: 'manager', label: 'Manager' },
                  { value: 'employee', label: 'Employee' },
                  { value: 'client', label: 'Client' },
                ],
                description: 'Select the role for this user',
                colProps: { span: { base: 12, sm: 6 } },
              },
              {
                type: 'text',
                name: 'roleCategory',
                label: 'Role Category (Optional)',
                placeholder: 'e.g., Sales, Engineering, Operations',
                description: 'Optional category for organizational purposes',
                colProps: { span: { base: 12, sm: 6 } },
              },
            ],
          }}
          validationSchema={inviteUserSchema}
          onSubmit={handleSubmit}
          submitLabel="Send Invitation"
          showReset={true}
          externalErrors={externalErrors}
        />
        <Alert color="blue" variant="light">
          <Text size="sm">
            The invited user will receive an email with instructions to complete their registration
            and set a password.
          </Text>
        </Alert>
      </Stack>
    </RNGPageContent>
  );
}
