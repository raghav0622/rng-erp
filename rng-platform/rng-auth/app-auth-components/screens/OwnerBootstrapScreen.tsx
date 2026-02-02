'use client';

import RNGForm from '@/rng-forms/RNGForm';
import { Alert, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ownerSignUpSchema } from '../../app-auth-hooks/schemas';
import { useOwnerSignUp } from '../../app-auth-hooks/useAuthMutations';
import { useIsOwnerBootstrapped } from '../../app-auth-hooks/useBootstrapQueries';
import { AuthLoadingOverlay } from '../boundaries/AuthLoadingOverlay';
import { ErrorAlert, FormWrapper, ScreenContainer } from '../shared/ScreenComponents';
import { handleMutationError } from '../utils/screenHelpers';

export interface OwnerBootstrapScreenProps {
  redirectTo?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function OwnerBootstrapScreen({
  redirectTo = '/dashboard',
  header,
  footer,
}: OwnerBootstrapScreenProps) {
  const router = useRouter();
  const { data: isBootstrapped, isLoading } = useIsOwnerBootstrapped();
  const ownerSignUp = useOwnerSignUp();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);

  useEffect(() => setExternalErrors([]), []);

  const handleSubmit = async (values: any) => {
    setExternalErrors([]);
    try {
      await ownerSignUp.mutateAsync(values);
      router.push(redirectTo);
    } catch (error) {
      handleMutationError(error, setExternalErrors, {
        'auth/owner-bootstrap-race': [
          'Another user completed setup while you were filling out the form.',
          'The system has been cleaned up automatically.',
          'Please sign in with the existing owner account instead.',
        ],
        'auth/owner-already-exists': [
          'An owner account already exists.',
          'Please use the sign in page to access your account.',
        ],
      });
    }
  };

  if (isLoading) return <AuthLoadingOverlay message="Checking setup status..." />;
  if (isBootstrapped)
    return (
      <ErrorAlert
        title="Already Set Up"
        description="Your organization has already been set up. Please sign in with the existing owner account."
      />
    );

  return (
    <ScreenContainer header={header} footer={footer}>
      <FormWrapper>
        <RNGForm
          schema={{
            items: [
              {
                type: 'text',
                name: 'name',
                label: 'Your Name',
                placeholder: 'John Doe',
                required: true,
              },
              {
                type: 'text',
                name: 'email',
                label: 'Email',
                placeholder: 'owner@example.com',
                required: true,
              },
              {
                type: 'password',
                name: 'password',
                label: 'Password',
                placeholder: 'Enter a strong password',
                required: true,
                description:
                  'Minimum 8 characters with uppercase, lowercase, number, and special character',
                showStrength: true,
              },
              {
                type: 'image-upload',
                name: 'photoUrl',
                label: 'Profile Photo (Optional)',
                description:
                  'Upload a profile photo. Recommended: square image, at least 400x400px',
              },
            ],
          }}
          validationSchema={ownerSignUpSchema}
          onSubmit={handleSubmit}
          submitLabel={ownerSignUp.isPending ? 'Creating account...' : 'Create Owner Account'}
          showReset={false}
          externalErrors={externalErrors}
        />
      </FormWrapper>
      <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
        <Text size="sm">
          <strong>Note:</strong> Owner account has full access and cannot be deleted.
        </Text>
      </Alert>
    </ScreenContainer>
  );
}
