'use client';

import RNGForm from '@/rng-forms/RNGForm';
import {
  getAuthErrorMessage,
  normalizeErrorMessage,
  ownerSignUpSchema,
  useIsOwnerBootstrapped,
  useOwnerSignUp,
} from '@/rng-platform';
import { RNGLoadingOverlay } from '@/rng-ui/ux';
import { Text } from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthScreen } from './AuthScreen';

export interface OnboardingScreenProps {
  /**
   * URL to redirect to after successful onboarding
   * @default '/dashboard'
   */
  redirectTo?: string;
  /**
   * Callback fired on successful onboarding
   */
  onOnboardingSuccess?: () => void;
}

/**
 * Onboarding/Owner Setup screen component.
 * Handles the initial owner account creation setup.
 */
export function OnboardingScreen({
  redirectTo = '/dashboard',
  onOnboardingSuccess,
}: OnboardingScreenProps) {
  const router = useRouter();
  const { data: isBootstrapped, isLoading } = useIsOwnerBootstrapped();
  const ownerSignUp = useOwnerSignUp();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);

  useEffect(() => setExternalErrors([]), []);

  const handleSubmit = async (values: any) => {
    setExternalErrors([]);
    try {
      await ownerSignUp.mutateAsync(values);
      onOnboardingSuccess?.();
      // Use client-side navigation - session is already updated
      router.push(redirectTo);
    } catch (error) {
      // Map error code to user-friendly message
      const errorMessages = getAuthErrorMessage(error);
      const normalizedErrors = normalizeErrorMessage(errorMessages);
      setExternalErrors(normalizedErrors);
    }
  };

  if (isLoading) {
    return <RNGLoadingOverlay message="Checking setup status..." />;
  }

  if (isBootstrapped) {
    return (
      <AuthScreen title="Already Set Up">
        <Text size="sm" ta="center" c="dimmed">
          Your organization has already been set up. Please sign in with the existing owner account.
        </Text>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Setup Your Organization">
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
              type: 'password',
              name: 'confirmPassword',
              label: 'Confirm Password',
              placeholder: 'Re-enter your password',
              required: true,
            },
            {
              type: 'image-upload',
              name: 'photoUrl',
              label: 'Profile Photo (Optional)',
              description: 'Upload a profile photo. Recommended: square image, at least 400x400px',
            },
          ],
        }}
        validationSchema={ownerSignUpSchema}
        onSubmit={handleSubmit}
        submitLabel={ownerSignUp.isPending ? 'Creating account...' : 'Create Owner Account'}
        showReset={false}
        externalErrors={externalErrors}
      />
    </AuthScreen>
  );
}
