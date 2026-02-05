'use client';

import RNGForm from '@/rng-forms/RNGForm';
import { useAuthNotifications } from '@/rng-platform/rng-auth/app-auth-hooks';
import { sendPasswordResetEmailSchema } from '@/rng-platform/rng-auth/app-auth-hooks/schemas';
import { useSendPasswordResetEmail } from '@/rng-platform/rng-auth/app-auth-hooks/useAuthMutations';
import type { AppAuthError } from '@/rng-platform/rng-auth/app-auth-service/app-auth.errors';
import { Alert, Anchor, Button, Container, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconCheck, IconMail } from '@tabler/icons-react';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const sendResetEmail = useSendPasswordResetEmail();
  const notifications = useAuthNotifications();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const handleSubmit = async (values: { email: string }) => {
    setExternalErrors([]);
    try {
      await sendResetEmail.mutateAsync({ email: values.email });
      setSentEmail(values.email);
      setEmailSent(true);
      notifications.showSuccess(
        `Password reset instructions sent to ${values.email}`,
        'Email Sent',
      );
    } catch (error) {
      const appError = error as AppAuthError;
      setExternalErrors([appError.message]);
      notifications.showError(appError.message, 'Failed to Send Reset Email');
    }
  };

  if (emailSent) {
    return (
      <Container size="xs" py="xl">
        <Stack gap="xl">
          <Stack gap="xs" align="center">
            <div style={{ color: 'var(--mantine-color-green-6)' }}>
              <IconCheck size={64} />
            </div>
            <Title order={2}>Check Your Email</Title>
            <Text c="dimmed" size="sm" ta="center">
              We've sent password reset instructions to:
            </Text>
            <Text fw={600} size="sm">
              {sentEmail}
            </Text>
          </Stack>

          <Paper shadow="sm" p="xl" radius="md">
            <Stack gap="md">
              <Alert icon={<IconMail size={16} />} color="blue" variant="light">
                <Text size="sm">
                  Click the link in the email to reset your password. The link will expire in 1
                  hour.
                </Text>
              </Alert>

              <Text size="xs" c="dimmed">
                Didn't receive the email? Check your spam folder or try again.
              </Text>

              <Button onClick={() => setEmailSent(false)} variant="light" fullWidth>
                Send Another Email
              </Button>
            </Stack>
          </Paper>

          <Group justify="center">
            <Anchor href="/signin" size="sm">
              Back to Sign In
            </Anchor>
          </Group>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xs" py="xl">
      <Stack gap="xl">
        <Stack gap="xs" align="center">
          <Title order={1}>Forgot Password</Title>
          <Text c="dimmed" size="sm">
            Enter your email to receive reset instructions
          </Text>
        </Stack>

        <Paper shadow="sm" p="xl" radius="md">
          <Stack gap="md">
            <Alert color="blue" variant="light">
              <Text size="sm">
                <strong>Rate Limited:</strong> For security, password reset requests are limited. If
                you don't receive an email, please wait a few minutes before trying again.
              </Text>
            </Alert>

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
                ],
              }}
              validationSchema={sendPasswordResetEmailSchema}
              onSubmit={handleSubmit}
              submitLabel={sendResetEmail.isPending ? 'Sending...' : 'Send Reset Link'}
              showReset={false}
              externalErrors={externalErrors}
              requireChange={false}
            />
          </Stack>
        </Paper>

        <Group justify="center">
          <Anchor href="/signin" size="sm">
            Back to Sign In
          </Anchor>
        </Group>
      </Stack>
    </Container>
  );
}
