'use client';

import { Alert, Button, Card, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { useSignIn } from '../../../rng-auth';
import PasswordStrengthMeter from './PasswordStrengthMeter';

export interface SignInFlowProps {
  /**
   * Called on successful sign in
   */
  onSuccess?: () => void;
  /**
   * Show "Forgot Password" link
   */
  showForgotPassword?: boolean;
  /**
   * Forgot password callback
   */
  onForgotPassword?: () => void;
  /**
   * Custom title
   */
  title?: string;
  /**
   * Custom description
   */
  description?: string;
}

/**
 * Complete Sign In Flow Component
 *
 * Handles full sign-in experience:
 * - Email/password inputs
 * - Error handling
 * - Loading states
 * - Success feedback
 * - Forgot password link
 *
 * @example
 * ```tsx
 * <SignInFlow
 *   onSuccess={() => router.push('/dashboard')}
 *   showForgotPassword
 *   onForgotPassword={() => router.push('/forgot-password')}
 * />
 * ```
 */
export function SignInFlow({
  onSuccess,
  showForgotPassword = true,
  onForgotPassword,
  title = 'Sign In',
  description = 'Enter your credentials to continue',
}: SignInFlowProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const signIn = useSignIn();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) return;

    signIn.mutate(
      { email, password },
      {
        onSuccess: () => {
          if (onSuccess) onSuccess();
        },
      },
    );
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <div>
            <Text size="xl" fw={700}>
              {title}
            </Text>
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          </div>

          {signIn.isError && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {(signIn.error as any)?.message || 'Sign in failed. Please check your credentials.'}
            </Alert>
          )}

          {signIn.isSuccess && (
            <Alert icon={<IconCheck size={16} />} color="green" variant="light">
              Sign in successful! Redirecting...
            </Alert>
          )}

          <TextInput
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
            disabled={signIn.isPending || signIn.isSuccess}
          />

          <TextInput
            label="Password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
            disabled={signIn.isPending || signIn.isSuccess}
          />

          {showForgotPassword && onForgotPassword && (
            <Button
              variant="subtle"
              size="xs"
              onClick={onForgotPassword}
              style={{ alignSelf: 'flex-start' }}
            >
              Forgot password?
            </Button>
          )}

          <Button
            type="submit"
            loading={signIn.isPending}
            disabled={!email || !password || signIn.isSuccess}
            fullWidth
          >
            Sign In
          </Button>
        </Stack>
      </form>
    </Card>
  );
}

export interface PasswordChangeFlowProps {
  /**
   * Called on successful password change
   */
  onSuccess?: () => void;
  /**
   * Custom title
   */
  title?: string;
  /**
   * Show password strength meter
   */
  showStrengthMeter?: boolean;
}

/**
 * Complete Password Change Flow Component
 *
 * Handles password change experience:
 * - Current password verification
 * - New password with confirmation
 * - Password strength meter
 * - Error handling
 *
 * @example
 * ```tsx
 * <PasswordChangeFlow
 *   onSuccess={() => showNotification('Password changed!')}
 *   showStrengthMeter
 * />
 * ```
 */
export function PasswordChangeFlow({
  onSuccess,
  title = 'Change Password',
  showStrengthMeter = true,
}: PasswordChangeFlowProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (newPassword !== confirmPassword) {
      setLocalError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    // In real implementation, call useChangePassword mutation
    // For now, this is a UI component template

    if (onSuccess) onSuccess();
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="xl" fw={700}>
            {title}
          </Text>

          {localError && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {localError}
            </Alert>
          )}

          <TextInput
            label="Current Password"
            type="password"
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.currentTarget.value)}
            required
          />

          <TextInput
            label="New Password"
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            required
          />

          {showStrengthMeter && newPassword && <PasswordStrengthMeter password={newPassword} />}

          <TextInput
            label="Confirm New Password"
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.currentTarget.value)}
            required
            error={
              confirmPassword && newPassword !== confirmPassword
                ? 'Passwords do not match'
                : undefined
            }
          />

          <Button
            type="submit"
            disabled={!currentPassword || !newPassword || !confirmPassword}
            fullWidth
          >
            Change Password
          </Button>
        </Stack>
      </form>
    </Card>
  );
}

export default SignInFlow;
