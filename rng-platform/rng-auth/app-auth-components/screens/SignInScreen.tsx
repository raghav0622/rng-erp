'use client';

import RNGForm from '@/rng-forms/RNGForm';
import {
  Anchor,
  Button,
  Container,
  Divider,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signInSchema } from '../../app-auth-hooks/schemas';
import { useSignIn } from '../../app-auth-hooks/useAuthMutations';
import type { AppAuthError } from '../../app-auth-service/app-auth.errors';

export interface SignInScreenProps {
  /**
   * Redirect path after successful sign in
   * @default '/dashboard'
   */
  redirectTo?: string;
  /**
   * Show link to forgot password screen
   * @default true
   */
  showForgotPassword?: boolean;
  /**
   * Show link to bootstrap (if signup allowed)
   * @default true
   */
  showBootstrapLink?: boolean;
  /**
   * Custom header content
   */
  header?: React.ReactNode;
  /**
   * Custom footer content
   */
  footer?: React.ReactNode;
}

/**
 * Sign in screen with email and password
 *
 * Features:
 * - Uses useSignIn hook
 * - Schema validation via signInSchema
 * - Error handling for all AppAuthError types
 * - Success redirect
 * - Links to forgot password and bootstrap
 *
 * @example
 * <SignInScreen redirectTo="/dashboard" />
 */
export function SignInScreen({
  redirectTo = '/dashboard',
  showForgotPassword = true,
  showBootstrapLink = true,
  header,
  footer,
}: SignInScreenProps) {
  const router = useRouter();
  const signIn = useSignIn();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleSubmit = async (values: { email: string; password: string }) => {
    setExternalErrors([]);
    try {
      await signIn.mutateAsync(values);
      // On success, redirect with loading state
      setIsRedirecting(true);
      router.push(redirectTo);
    } catch (error) {
      // Map error to user-friendly message
      const appError = error as AppAuthError;
      setExternalErrors([appError.message]);
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
    <Container size="xs" py="xl">
      <Stack gap="xl">
        {header || (
          <Stack gap="xs" align="center">
            <Title order={1}>Sign In</Title>
            <Text c="dimmed" size="sm">
              Welcome back! Please sign in to continue.
            </Text>
          </Stack>
        )}

        <Paper shadow="sm" p="xl" radius="md">
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

          {showForgotPassword && (
            <>
              <Divider my="md" />
              <Group justify="center">
                <Anchor href="/auth/forgot-password" size="sm">
                  Forgot password?
                </Anchor>
              </Group>
            </>
          )}
        </Paper>

        {showBootstrapLink && (
          <Paper p="md" withBorder>
            <Group justify="space-between">
              <Stack gap={4}>
                <Text size="sm" fw={600}>
                  First time here?
                </Text>
                <Text size="xs" c="dimmed">
                  Set up your organization
                </Text>
              </Stack>
              <Button component="a" href="/auth/bootstrap" variant="light" size="sm">
                Get Started
              </Button>
            </Group>
          </Paper>
        )}

        {footer}
      </Stack>
    </Container>
  );
}
