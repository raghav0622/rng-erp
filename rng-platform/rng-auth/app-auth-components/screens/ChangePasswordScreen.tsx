'use client';

import RNGForm from '@/rng-forms/RNGForm';
import { Alert, Container, Paper, Stack, Text, Title } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { changePasswordSchema } from '../../app-auth-hooks/schemas';
import { useChangePassword } from '../../app-auth-hooks/useAuthMutations';
import type { AppAuthError } from '../../app-auth-service/app-auth.errors';

export interface ChangePasswordScreenProps {
  /**
   * Callback after successful password change
   */
  onSuccess?: () => void;
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
 * Change password screen (for authenticated users)
 *
 * Features:
 * - Requires current password
 * - Uses useChangePassword hook
 * - Schema validation via changePasswordSchema
 * - Rate limiting protection (3 attempts/minute)
 * - Success state
 *
 * Security:
 * - Requires recent authentication (may trigger reauthentication)
 * - Rate limited by service (see app-auth-service/README.md)
 *
 * @example
 * <ChangePasswordScreen onSuccess={() => router.push('/profile')} />
 */
export function ChangePasswordScreen({ onSuccess, header, footer }: ChangePasswordScreenProps) {
  const changePassword = useChangePassword();
  const [externalErrors, setExternalErrors] = useState<string[]>([]);
  const [changeComplete, setChangeComplete] = useState(false);

  const handleSubmit = async (values: { currentPassword: string; newPassword: string }) => {
    setExternalErrors([]);
    try {
      await changePassword.mutateAsync(values);
      setChangeComplete(true);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error) {
      const appError = error as AppAuthError;
      setExternalErrors([appError.message]);
    }
  };

  if (changeComplete) {
    return (
      <Container size="xs" py="xl">
        <Stack gap="xl">
          <Stack gap="xs" align="center">
            <div style={{ color: 'var(--mantine-color-green-6)' }}>
              <IconCheck size={64} />
            </div>
            <Title order={2}>Password Changed</Title>
            <Text c="dimmed" size="sm" ta="center">
              Your password has been successfully updated.
            </Text>
          </Stack>

          {onSuccess && (
            <Paper shadow="sm" p="xl" radius="md">
              <Text size="sm" ta="center">
                Returning to profile...
              </Text>
            </Paper>
          )}
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xs" py="xl">
      <Stack gap="xl">
        {header || (
          <Stack gap="xs" align="center">
            <Title order={1}>Change Password</Title>
            <Text c="dimmed" size="sm">
              Update your password for security
            </Text>
          </Stack>
        )}

        <Paper shadow="sm" p="xl" radius="md">
          <RNGForm
            schema={{
              items: [
                {
                  type: 'password',
                  name: 'currentPassword',
                  label: 'Current Password',
                  placeholder: 'Enter your current password',
                  required: true,
                },
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
            validationSchema={changePasswordSchema}
            onSubmit={handleSubmit}
            submitLabel={changePassword.isPending ? 'Changing...' : 'Change Password'}
            showReset={true}
            externalErrors={externalErrors}
          />
        </Paper>

        <Alert color="blue" variant="light">
          <Text size="sm">
            <strong>Security Note:</strong> Password changes are rate limited (3 attempts per
            minute) to protect your account.
          </Text>
        </Alert>

        {footer}
      </Stack>
    </Container>
  );
}
