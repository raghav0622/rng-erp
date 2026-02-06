'use client';

import RNGForm from '@/rng-forms/RNGForm';
import {
  getAuthErrorMessage,
  normalizeErrorMessage,
  sendPasswordResetEmailSchema,
  useSendPasswordResetEmail,
} from '@/rng-platform';
import { Alert, Anchor, Button, Group, Stack, Text } from '@mantine/core';
import { IconCheck, IconMail } from '@tabler/icons-react';
import { useState } from 'react';
import { AuthScreen } from './AuthScreen';

export interface ForgotPasswordScreenProps {
  /**
   * Callback fired when email is successfully sent
   */
  onEmailSent?: (email: string) => void;
}

/**
 * Forgot Password screen component.
 * Handles password reset email flow.
 */
export function ForgotPasswordScreen({ onEmailSent }: ForgotPasswordScreenProps) {
  const sendResetEmail = useSendPasswordResetEmail();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const handleSubmit = async (values: { email: string }) => {
    setExternalErrors([]);
    try {
      await sendResetEmail.mutateAsync({ email: values.email });
      setSentEmail(values.email);
      setEmailSent(true);
      onEmailSent?.(values.email);
    } catch (error) {
      // Map error code to user-friendly message
      const errorMessages = getAuthErrorMessage(error);
      const normalizedErrors = normalizeErrorMessage(errorMessages);
      setExternalErrors(normalizedErrors);
    }
  };

  if (emailSent) {
    return (
      <AuthScreen
        title="Check Your Email"
        description={`We've sent password reset instructions to: ${sentEmail}`}
      >
        <Stack gap="lg" align="center">
          <div style={{ color: 'var(--mantine-color-green-6)' }}>
            <IconCheck size={64} />
          </div>
          <Alert icon={<IconMail size={16} />} color="blue" variant="light" w="100%">
            <Text size="sm">
              Click the link in the email to reset your password. The link will expire in 1 hour.
            </Text>
          </Alert>

          <Text size="xs" c="dimmed" ta="center">
            Didn't receive the email? Check your spam folder or try again.
          </Text>

          <Button onClick={() => setEmailSent(false)} variant="light" fullWidth>
            Send Another Email
          </Button>

          <Group justify="center">
            <Anchor href="/signin" size="sm">
              Back to Sign In
            </Anchor>
          </Group>
        </Stack>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Forgot Password"
      description="Enter your email to receive reset instructions"
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
          ],
        }}
        validationSchema={sendPasswordResetEmailSchema}
        onSubmit={handleSubmit}
        submitLabel={sendResetEmail.isPending ? 'Sending...' : 'Send Reset Link'}
        showReset={false}
        externalErrors={externalErrors}
        requireChange={false}
      />

      <Group justify="center">
        <Anchor href="/signin" size="sm">
          Back to Sign In
        </Anchor>
      </Group>
    </AuthScreen>
  );
}
