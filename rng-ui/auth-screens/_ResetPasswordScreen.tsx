'use client';

import RNGForm from '@/rng-forms/RNGForm';
import {
  confirmPasswordResetSchema,
  getAuthErrorMessage,
  normalizeErrorMessage,
  useConfirmPasswordReset,
} from '@/rng-platform';
import { Alert, Anchor, Button, Group, Stack, Text } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthScreen } from './AuthScreen';

export interface ResetPasswordScreenProps {
  /**
   * URL to redirect to on successful password reset
   * @default '/signin'
   */
  redirectTo?: string;
  /**
   * Callback fired on successful password reset
   */
  onResetSuccess?: () => void;
}

/**
 * Reset Password screen component.
 * Handles password reset confirmation after user clicks email link.
 *
 * This screen:
 * - Extracts oobCode from URL query parameters
 * - Allows user to enter new password
 * - Validates password strength
 * - Confirms password reset with Firebase
 * - Redirects to sign in on success
 *
 * @example
 * ```tsx
 * // User lands here from email link: /reset-password?oobCode=ABC123
 * <ResetPasswordScreen redirectTo="/signin" />
 * ```
 */
export function ResetPasswordScreen({
  redirectTo = '/signin',
  onResetSuccess,
}: ResetPasswordScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmReset = useConfirmPasswordReset();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [resetComplete, setResetComplete] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    // Extract oobCode from URL query params
    const code = searchParams.get('oobCode');

    if (!code) {
      setCodeError('Invalid password reset link. Please request a new password reset email.');
    } else {
      setOobCode(code);
    }
  }, [searchParams]);

  const handleSubmit = async (values: { newPassword: string; confirmPassword: string }) => {
    if (!oobCode) {
      setExternalErrors(['Invalid reset code. Please request a new password reset.']);
      return;
    }

    setExternalErrors([]);
    try {
      await confirmReset.mutateAsync({
        code: oobCode,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      setResetComplete(true);
      onResetSuccess?.();
      // Redirect to sign in after 3 seconds
      setTimeout(() => router.push(redirectTo), 3000);
    } catch (error) {
      // Map error code to user-friendly message
      const errorMessages = getAuthErrorMessage(error);
      const normalizedErrors = normalizeErrorMessage(errorMessages);
      setExternalErrors(normalizedErrors);
    }
  };

  // Show error if no code in URL
  if (codeError) {
    return (
      <AuthScreen
        title="Invalid Reset Link"
        description="The password reset link is invalid or expired"
      >
        <Stack gap="lg" align="center">
          <Alert color="red" variant="light" w="100%">
            <Text size="sm">{codeError}</Text>
          </Alert>

          <Text size="sm" c="dimmed" ta="center">
            Password reset links expire after 1 hour. Please request a new password reset if you
            need to change your password.
          </Text>

          <Group justify="center" w="100%">
            <Button component="a" href="/forgot-password" fullWidth>
              Request New Reset Link
            </Button>
          </Group>

          <Group justify="center">
            <Anchor href="/signin" size="sm">
              Back to Sign In
            </Anchor>
          </Group>
        </Stack>
      </AuthScreen>
    );
  }

  // Show success message after password reset
  if (resetComplete) {
    return (
      <AuthScreen
        title="Password Reset Successful"
        description="Your password has been changed successfully"
      >
        <Stack gap="lg" align="center">
          <div style={{ color: 'var(--mantine-color-green-6)' }}>
            <IconCheck size={64} />
          </div>
          <Alert color="green" variant="light" w="100%">
            <Text size="sm">
              Your password has been updated. You can now sign in with your new password.
            </Text>
          </Alert>

          <Text size="xs" c="dimmed" ta="center">
            Redirecting to sign in page...
          </Text>

          <Button onClick={() => router.push(redirectTo)} fullWidth>
            Sign In Now
          </Button>
        </Stack>
      </AuthScreen>
    );
  }

  // Show password reset form
  return (
    <AuthScreen title="Reset Your Password" description="Enter your new password below">
      <RNGForm
        schema={{
          items: [
            {
              type: 'password',
              name: 'newPassword',
              label: 'New Password',
              placeholder: 'Enter your new password',
              required: true,
              description:
                'Minimum 8 characters with uppercase, lowercase, number, and special character',
              showStrength: true,
            },
            {
              type: 'password',
              name: 'confirmPassword',
              label: 'Confirm New Password',
              placeholder: 'Re-enter your new password',
              required: true,
            },
          ],
        }}
        validationSchema={confirmPasswordResetSchema}
        onSubmit={handleSubmit}
        submitLabel={confirmReset.isPending ? 'Resetting...' : 'Reset Password'}
        showReset={false}
        externalErrors={externalErrors}
        requireChange={false}
      />

      <Group justify="center" mt="md">
        <Anchor href="/signin" size="sm">
          Back to Sign In
        </Anchor>
      </Group>
    </AuthScreen>
  );
}
