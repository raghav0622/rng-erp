'use client';

import RNGForm from '@/rng-forms/RNGForm';
import { Alert, Button, Container, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { confirmPasswordResetSchema } from '../../app-auth-hooks/schemas';
import { useConfirmPasswordReset } from '../../app-auth-hooks/useAuthMutations';
import type { AppAuthError } from '../../app-auth-service/app-auth.errors';

export interface ResetPasswordScreenProps {
  /**
   * Redirect path after successful reset
   * @default '/auth/signin'
   */
  redirectTo?: string;
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
 * Reset password screen (from email link)
 *
 * Features:
 * - Reads oobCode from URL params
 * - Uses useConfirmPasswordReset hook
 * - Schema validation via confirmPasswordResetSchema
 * - Success state with redirect
 *
 * @example
 * <ResetPasswordScreen redirectTo="/auth/signin" />
 */
export function ResetPasswordScreen({
  redirectTo = '/auth/signin',
  header,
  footer,
}: ResetPasswordScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('oobCode');
  const confirmReset = useConfirmPasswordReset();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [resetComplete, setResetComplete] = useState(false);

  const handleSubmit = async (values: { newPassword: string }) => {
    if (!code) {
      setExternalErrors(['Invalid or missing reset code. Please request a new reset link.']);
      return;
    }

    setExternalErrors([]);
    try {
      await confirmReset.mutateAsync({ code, newPassword: values.newPassword });
      setResetComplete(true);
      // Redirect after short delay
      setTimeout(() => {
        router.push(redirectTo);
      }, 2000);
    } catch (error) {
      const appError = error as AppAuthError;
      setExternalErrors([appError.message]);
    }
  };

  if (!code) {
    return (
      <Container size="xs" py="xl">
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Invalid Reset Link"
          color="red"
          variant="light"
        >
          <Stack gap="sm">
            <Text size="sm">
              This reset link is invalid or has expired. Please request a new password reset.
            </Text>
            <Button component="a" href="/auth/forgot-password" variant="light" size="sm">
              Request New Link
            </Button>
          </Stack>
        </Alert>
      </Container>
    );
  }

  if (resetComplete) {
    return (
      <Container size="xs" py="xl">
        <Stack gap="xl">
          <Stack gap="xs" align="center">
            <div style={{ color: 'var(--mantine-color-green-6)' }}>
              <IconCheck size={64} />
            </div>
            <Title order={2}>Password Reset Complete</Title>
            <Text c="dimmed" size="sm" ta="center">
              Your password has been successfully reset.
            </Text>
          </Stack>

          <Paper shadow="sm" p="xl" radius="md">
            <Text size="sm" ta="center">
              Redirecting to sign in...
            </Text>
          </Paper>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xs" py="xl">
      <Stack gap="xl">
        {header || (
          <Stack gap="xs" align="center">
            <Title order={1}>Reset Password</Title>
            <Text c="dimmed" size="sm">
              Enter your new password
            </Text>
          </Stack>
        )}

        <Paper shadow="sm" p="xl" radius="md">
          <RNGForm
            schema={{
              items: [
                {
                  type: 'password',
                  name: 'newPassword',
                  label: 'New Password',
                  placeholder: 'Enter a strong password',
                  required: true,
                  description:
                    'Minimum 8 characters with uppercase, lowercase, number, and special character',
                },
              ],
            }}
            validationSchema={confirmPasswordResetSchema}
            onSubmit={handleSubmit}
            submitLabel={confirmReset.isPending ? 'Resetting...' : 'Reset Password'}
            showReset={false}
            externalErrors={externalErrors}
          />
        </Paper>

        {footer}
      </Stack>
    </Container>
  );
}
