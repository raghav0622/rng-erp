'use client';

import RNGForm from '@/rng-forms/RNGForm';
import {
  getAuthErrorMessage,
  normalizeErrorMessage,
  signInSchema,
  useSignIn,
} from '@/rng-platform';
import { Anchor, Divider, Group } from '@mantine/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthScreen } from './AuthScreen';

export interface SignInScreenProps {
  /**
   * URL to redirect to on successful sign-in
   * @default '/dashboard'
   */
  redirectTo?: string;
  /**
   * Callback fired on successful sign-in
   */
  onSignInSuccess?: () => void;
}

/**
 * Sign In screen component.
 * Handles user authentication with email and password.
 */
export function SignInScreen({ redirectTo = '/dashboard', onSignInSuccess }: SignInScreenProps) {
  const router = useRouter();
  const signIn = useSignIn();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setExternalErrors([]);
    try {
      await signIn.mutateAsync(values);
      onSignInSuccess?.();
      // On success, redirect with loading state
      setIsRedirecting(true);
      router.push(redirectTo);
    } catch (error) {
      // Map error code to user-friendly message
      const errorMessages = getAuthErrorMessage(error);
      const normalizedErrors = normalizeErrorMessage(errorMessages);
      setExternalErrors(normalizedErrors);
    }
  };

  return (
    <AuthScreen
      isLoading={isRedirecting}
      loadingMessage="Signing in..."
      title="Sign In"
      description="Welcome back! Please sign in to continue."
    >
      <RNGForm
        schema={{
          items: [
            {
              type: 'text',
              name: 'email',
              label: 'Email',
              placeholder: 'you@example.com',
              required: true,
            },
            {
              type: 'password',
              name: 'password',
              label: 'Password',
              placeholder: 'Enter your password',
              required: true,
            },
          ],
        }}
        validationSchema={signInSchema}
        onSubmit={handleSubmit}
        submitLabel={signIn.isPending ? 'Signing in...' : 'Sign In'}
        showReset={false}
        externalErrors={externalErrors}
        requireChange={false}
      />
      <Divider />
      <Group justify="center">
        <Anchor component={Link} href="/forgot-password" size="sm">
          Forgot password?
        </Anchor>
        <Divider orientation="vertical" />
        <Anchor component={Link} href="/signup-with-invite" size="sm">
          Sign Up With Invite
        </Anchor>
      </Group>
    </AuthScreen>
  );
}
