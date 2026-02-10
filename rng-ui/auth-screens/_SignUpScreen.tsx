'use client';

import RNGForm from '@/rng-forms/RNGForm';
import {
  getAuthErrorMessage,
  normalizeErrorMessage,
  signUpWithInviteSchema,
  useSignUpWithInvite,
} from '@/rng-platform';
import { Anchor, Stack, Text } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthScreen } from './_AuthScreen';

export interface SignUpScreenProps {
  /**
   * URL to redirect to on successful sign-up
   * @default '/dashboard'
   */
  redirectTo?: string;
  /**
   * Delay before redirecting (in milliseconds)
   * @default 2000
   */
  redirectDelay?: number;
  /**
   * Callback fired on successful sign-up
   */
  onSignUpSuccess?: () => void;
}

/**
 * Sign Up with Invite screen component.
 * Handles user registration via invitation.
 */
export function SignUpScreen({
  redirectTo = '/dashboard',
  redirectDelay = 2000,
  onSignUpSuccess,
}: SignUpScreenProps) {
  const router = useRouter();
  const signUpWithInvite = useSignUpWithInvite();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [signupComplete, setSignupComplete] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => setExternalErrors([]), []);

  const handleSubmit = async (values: any) => {
    setExternalErrors([]);
    try {
      await signUpWithInvite.mutateAsync(values);
      setSignupComplete(true);
      onSignUpSuccess?.();
      setIsRedirecting(true);
      // Use client-side navigation with delay to show success message
      setTimeout(() => {
        router.push(redirectTo);
      }, redirectDelay);
    } catch (error) {
      // Map error code to user-friendly message
      const errorMessages = getAuthErrorMessage(error);
      const normalizedErrors = normalizeErrorMessage(errorMessages);
      setExternalErrors(normalizedErrors);
    }
  };

  if (isRedirecting) {
    return <AuthScreen isLoading={true} loadingMessage="Completing registration..." />;
  }

  if (signupComplete) {
    return (
      <AuthScreen title="Registration Complete!">
        <Stack gap="xl" align="center">
          <div style={{ color: 'var(--mantine-color-green-6)' }}>
            <IconCheck size={64} />
          </div>
          <Text c="dimmed" size="sm" ta="center">
            Your account has been created.
          </Text>
        </Stack>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Complete Your Registration"
      description="Enter your password to activate your account"
    >
      <RNGForm
        schema={{
          items: [
            {
              type: 'text',
              name: 'email',
              label: 'Email Address',
              placeholder: 'your-email@example.com',
              required: true,
              description: 'Must match the email from your invitation',
            },
            {
              type: 'password',
              name: 'password',
              label: 'Create Password',
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
          ],
        }}
        validationSchema={signUpWithInviteSchema}
        onSubmit={handleSubmit}
        externalErrors={externalErrors}
        submitLabel="Complete Registration"
        showReset={false}
      />
      <Text size="sm" c="dimmed" ta="center" mt="md">
        Already have an account? <Anchor href="/signin">Sign In</Anchor>
      </Text>
    </AuthScreen>
  );
}
