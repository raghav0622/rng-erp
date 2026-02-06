'use client';

import RNGForm from '@/rng-forms/RNGForm';
import type { AppAuthError } from '@/rng-platform';
import { signInSchema, useSignIn } from '@/rng-platform';
import { useRNGNotification } from '@/rng-ui/ux';
import { Anchor, Container, Divider, Group, Loader, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignInPage() {
  const redirectTo = '/dashboard';
  const router = useRouter();
  const signIn = useSignIn();
  const notifications = useRNGNotification();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setExternalErrors([]);
    try {
      await signIn.mutateAsync(values);
      // Show success notification
      notifications.showSuccess(`Welcome back, ${values.email}!`, 'Sign In Successful');
      // On success, redirect with loading state
      setIsRedirecting(true);
      router.push(redirectTo);
    } catch (error) {
      // Map error to user-friendly message
      const appError = error as AppAuthError;
      let errorMessage = appError.message;

      // Provide more specific error messages based on error code
      if (appError.code) {
        switch (appError.code) {
          case 'auth/invalid-credentials':
            errorMessage =
              'Invalid email or password. Please check your credentials and try again.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'Your account has been disabled. Please contact your administrator.';
            break;
          case 'auth/too-many-requests':
            errorMessage =
              'Too many failed attempts. Please wait a few minutes before trying again.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Email address format is invalid.';
            break;
          case 'auth/not-authenticated':
            errorMessage = 'Authentication failed. Please try again.';
            break;
          case 'auth/session-expired':
            errorMessage = 'Your session has expired. Please sign in again.';
            break;
          case 'auth/internal':
            // Use custom message if available
            if (appError.message !== 'Authentication error occurred.') {
              errorMessage = appError.message;
            } else {
              errorMessage = 'Sign in failed. Please try again or contact support.';
            }
            break;
        }
      }

      setExternalErrors([errorMessage]);
      notifications.showError(errorMessage, 'Sign In Failed');
    }
  };

  if (isRedirecting) {
    return (
      <Container size="xs" py="xl">
        <Stack gap="xl" align="center">
          <Loader size="lg" />
          <Text>Signing in...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xs">
      <Stack>
        <Stack gap="xs" align="center">
          <Title order={1}>Sign In</Title>
          <Text c="dimmed" size="sm">
            Welcome back! Please sign in to continue.
          </Text>
        </Stack>

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
      </Stack>
    </Container>
  );
}
