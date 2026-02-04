'use client';

import RNGForm from '@/rng-forms/RNGForm';
import { useIsOwnerBootstrapped } from '@/rng-platform/rng-auth/app-auth-hooks';
import { signInSchema } from '@/rng-platform/rng-auth/app-auth-hooks/schemas';
import { useSignIn } from '@/rng-platform/rng-auth/app-auth-hooks/useAuthMutations';
import type { AppAuthError } from '@/rng-platform/rng-auth/app-auth-service/app-auth.errors';
import { Anchor, Container, Divider, Group, Loader, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignInPage() {
  const redirectTo = '/dashboard';
  const showBootstrapLink = useIsOwnerBootstrapped().data === false;
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
