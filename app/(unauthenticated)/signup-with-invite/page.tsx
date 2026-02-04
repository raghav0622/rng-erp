'use client';

import RNGForm from '@/rng-forms/RNGForm';
import { signUpWithInviteSchema } from '@/rng-platform/rng-auth/app-auth-hooks/schemas';
import { useSignUpWithInvite } from '@/rng-platform/rng-auth/app-auth-hooks/useAuthMutations';
import type { AppAuthError } from '@/rng-platform/rng-auth/app-auth-service/app-auth.errors';
import { Anchor, Container, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SignUpWithInvitePage() {
  const redirectTo = '/dashboard';
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
      setIsRedirecting(true);
      setTimeout(() => router.push(redirectTo), 2000);
    } catch (err) {
      const appError = err as AppAuthError;
      setExternalErrors([appError.message]);
    }
  };

  if (isRedirecting) {
    return (
      <Container size="xs">
        <Stack gap="xl" align="center">
          <Loader size="lg" />
          <Text>Completing registration...</Text>
        </Stack>
      </Container>
    );
  }

  if (signupComplete) {
    return (
      <Container size="xs">
        <Stack gap="xl">
          <Stack gap="xs" align="center">
            <div style={{ color: 'var(--mantine-color-green-6)' }}>
              <IconCheck size={64} />
            </div>
            <Title order={2}>Registration Complete!</Title>
            <Text c="dimmed" size="sm" ta="center">
              Your account has been created.
            </Text>
          </Stack>
          <Paper shadow="sm" p="xl" radius="md">
            <Text size="sm" ta="center">
              Redirecting...
            </Text>
          </Paper>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xs">
      <Stack>
        <Paper shadow="sm">
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
            headerTitle="Complete Your Registration"
            headerDescription="Enter your password to activate your account"
            showReset={false}
          />
        </Paper>
        <Text size="sm" c="dimmed" ta="center" mt="md">
          Already have an account? <Anchor href="/signin">Sign In</Anchor>
        </Text>
      </Stack>
    </Container>
  );
}
