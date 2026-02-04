'use client';

import RNGForm from '@/rng-forms/RNGForm';
import { AuthLoadingOverlay } from '@/rng-platform/rng-auth/app-auth-components';
import { ownerSignUpSchema } from '@/rng-platform/rng-auth/app-auth-hooks/schemas';
import { useOwnerSignUp } from '@/rng-platform/rng-auth/app-auth-hooks/useAuthMutations';
import { useIsOwnerBootstrapped } from '@/rng-platform/rng-auth/app-auth-hooks/useBootstrapQueries';
import type { AppAuthError } from '@/rng-platform/rng-auth/app-auth-service/app-auth.errors';
import { Alert, Container, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function OnboardingPage() {
  const redirectTo = '/dashboard';
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
      const appError = error as AppAuthError;
      const customHandlers: Record<string, string | string[]> = {
        'auth/owner-bootstrap-race': [
          'Another user completed setup while you were filling out the form.',
          'The system has been cleaned up automatically.',
          'Please sign in with the existing owner account instead.',
        ],
        'auth/owner-already-exists': [
          'An owner account already exists.',
          'Please use the sign in page to access your account.',
        ],
      };
      const customMsg = customHandlers[appError.code];
      const msg = typeof customMsg === 'string' ? [customMsg] : customMsg;
      setExternalErrors(msg || [appError.message]);
    }
  };

  if (isLoading) return <AuthLoadingOverlay message="Checking setup status..." />;

  if (isBootstrapped) {
    return (
      <Container size="xs">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Already Set Up"
          color="blue"
          variant="light"
        >
          <Text size="sm">
            Your organization has already been set up. Please sign in with the existing owner
            account.
          </Text>
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xs">
      <Stack>
        <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            <strong>Note:</strong> Owner account has full access and cannot be deleted.
          </Text>
        </Alert>
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
      </Stack>
    </Container>
  );
}
