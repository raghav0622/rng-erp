'use client';

import RNGForm from '@/rng-forms/RNGForm';
import { Alert, Text } from '@mantine/core';
import { IconUserPlus } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { inviteUserSchema } from '../../app-auth-hooks/schemas';
import { useInviteUser } from '../../app-auth-hooks/useUserManagementMutations';
import {
  FormWrapper,
  ScreenContainer,
  ScreenHeader,
  SuccessMessage,
} from '../shared/ScreenComponents';
import { handleMutationError } from '../utils/screenHelpers';

export interface InviteUserScreenProps {
  redirectTo?: string;
  onSuccess?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function InviteUserScreen({
  redirectTo = '/users',
  onSuccess,
  header,
  footer,
}: InviteUserScreenProps) {
  const router = useRouter();
  const inviteUser = useInviteUser();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [inviteComplete, setInviteComplete] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');

  useEffect(() => setExternalErrors([]), []);

  const handleSubmit = async (values: any) => {
    setExternalErrors([]);
    try {
      await inviteUser.mutateAsync(values);
      setInvitedEmail(values.email);
      setInviteComplete(true);
      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      } else {
        setTimeout(() => router.push(redirectTo), 2000);
      }
    } catch (error) {
      handleMutationError(error, setExternalErrors);
    }
  };

  if (inviteComplete)
    return (
      <SuccessMessage
        title="Invitation Sent!"
        message="An invitation has been sent to:"
        detail={invitedEmail}
        redirect={redirectTo}
      />
    );

  return (
    <ScreenContainer
      header={
        header || (
          <ScreenHeader
            title="Invite Team Member"
            description="Send an invitation to join your organization"
            icon={IconUserPlus}
          />
        )
      }
      footer={footer}
    >
      <FormWrapper>
        <RNGForm
          schema={{
            items: [
              {
                type: 'text',
                name: 'name',
                label: 'Full Name',
                placeholder: 'John Doe',
                required: true,
              },
              {
                type: 'text',
                name: 'email',
                label: 'Email Address',
                placeholder: 'john.doe@example.com',
                required: true,
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
              },
              {
                type: 'text',
                name: 'roleCategory',
                label: 'Role Category (Optional)',
                placeholder: 'e.g., Sales, Engineering, Operations',
                description: 'Optional category for organizational purposes',
              },
            ],
          }}
          validationSchema={inviteUserSchema}
          onSubmit={handleSubmit}
          submitLabel="Send Invitation"
          showReset={true}
          externalErrors={externalErrors}
        />
        <Alert color="blue" variant="light" mt="md">
          <Text size="sm">
            The invited user will receive an email with instructions to complete their registration
            and set a password.
          </Text>
        </Alert>
      </FormWrapper>
    </ScreenContainer>
  );
}
