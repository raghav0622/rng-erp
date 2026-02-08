'use client';

import RNGForm from '@/rng-forms/RNGForm';
import { RNGLoadingOverlay, RNGMessageAlert, RNGPageContent } from '@/rng-ui/ux';
import { Stack } from '@mantine/core';
import type { ZodTypeAny } from 'zod';

export interface InviteUserViewProps {
  inviteComplete: boolean;
  invitedEmail: string;
  externalErrors: string[];
  inviteUserSchema: ZodTypeAny;
  onSubmit: (values: any) => Promise<void>;
}

export function InviteUserView({
  inviteComplete,
  invitedEmail,
  externalErrors,
  inviteUserSchema,
  onSubmit,
}: InviteUserViewProps) {
  if (inviteComplete) {
    return (
      <RNGPageContent
        title="Invitation Sent!"
        description={invitedEmail ? `Invitation sent to ${invitedEmail}` : 'Invitation sent'}
        size="md"
      >
        <RNGLoadingOverlay message="Redirecting to user management..." />
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
          onSubmit={onSubmit}
          submitLabel="Send Invitation"
          showReset={true}
          externalErrors={externalErrors}
        />
        <RNGMessageAlert
          tone="blue"
          message="The invited user will receive an email with instructions to complete their registration and set a password."
        />
      </Stack>
    </RNGPageContent>
  );
}
