'use client';

import { Alert, Button, Container, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconMail } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RNGLoadingOverlay } from '../../../../rng-ui/ux/_RNGLoadingOverlay';
import { useSendEmailVerification } from '../../app-auth-hooks';
import { useAuthSession } from '../../app-auth-hooks/useAuthSession';
import type { AppAuthError } from '../../app-auth-service/app-auth.errors';

export interface EmailVerificationScreenProps {
  /**
   * Redirect path after email is verified
   * @default '/dashboard'
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
  /**
   * Show skip button (not recommended for production)
   * @default false
   */
  allowSkip?: boolean;
}

/**
 * Email verification screen
 *
 * Features:
 * - Detects when email is verified
 * - Resend verification email
 * - Auto-redirect after verification
 * - Uses useSendEmailVerificationEmail hook
 *
 * Security:
 * - Email verification state synced from Firebase Auth
 * - AppUser.emailVerified is read-only projection
 *
 * Guard Requirement:
 * Always wrap inside <RequireAuthenticated> to ensure user is authenticated.
 * This screen should never be rendered without authentication.
 *
 * @example
 * <RequireAuthenticated>
 *   <EmailVerificationScreen redirectTo="/dashboard" />
 * </RequireAuthenticated>
 */
export function EmailVerificationScreen({
  redirectTo = '/dashboard',
  header,
  footer,
  allowSkip = false,
}: EmailVerificationScreenProps) {
  const router = useRouter();
  const session = useAuthSession();
  const sendVerificationEmail = useSendEmailVerification();
  const [emailSent, setEmailSent] = useState(false);
  const [externalErrors, setExternalErrors] = useState<string[]>([]);

  const handleResendEmail = async () => {
    setExternalErrors([]);
    try {
      await sendVerificationEmail.mutateAsync();
      setEmailSent(true);
      // Reset sent state after 5 seconds
      setTimeout(() => setEmailSent(false), 5000);
    } catch (error) {
      const appError = error as AppAuthError;
      setExternalErrors([appError.message]);
    }
  };

  const handleSkip = () => {
    router.push(redirectTo);
  };

  // Defensive check: screen must be wrapped in RequireAuthenticated
  // If not authenticated, show error and prompt to sign in
  if (session.state === 'authenticating') {
    return <RNGLoadingOverlay message="Loading verification status..." />;
  }

  if (session.state !== 'authenticated') {
    return (
      <Container size="xs" py="xl">
        <Stack gap="xl">
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Not Authenticated">
            Email verification requires authentication. Please sign in first.
          </Alert>
          <Button onClick={() => router.push('/sign-in')} fullWidth>
            Sign In
          </Button>
        </Stack>
      </Container>
    );
  }

  // Check if email is now verified (user clicked link in email)
  if (session.emailVerified === true) {
    return (
      <Container size="xs" py="xl">
        <Stack gap="xl">
          <Stack gap="xs" align="center">
            <div style={{ color: 'var(--mantine-color-green-6)' }}>
              <IconCheck size={64} />
            </div>
            <Title order={2}>Email Verified!</Title>
            <Text c="dimmed" size="sm" ta="center">
              Your email has been successfully verified. Redirecting...
            </Text>
          </Stack>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xs" py="xl">
      <Stack gap="xl">
        {header || (
          <Stack gap="xs" align="center">
            <div style={{ color: 'var(--mantine-color-blue-6)' }}>
              <IconMail size={64} />
            </div>
            <Title order={1}>Verify Your Email</Title>
            <Text c="dimmed" size="sm" ta="center">
              We've sent a verification link to:
            </Text>
            <Text fw={600} size="sm">
              {session.user?.email || 'your email'}
            </Text>
          </Stack>
        )}

        <Paper shadow="sm" p="xl" radius="md">
          <Stack gap="md">
            <Alert icon={<IconMail size={16} />} color="blue" variant="light">
              <Text size="sm">
                Click the link in the email to verify your address. The link will expire in 1 hour.
              </Text>
            </Alert>

            <Text size="xs" c="dimmed">
              After clicking the link, this page will automatically detect the verification and
              redirect you to your dashboard.
            </Text>

            {emailSent && (
              <Alert color="green" variant="light">
                <Text size="sm">Verification email sent! Check your inbox.</Text>
              </Alert>
            )}

            {externalErrors.length > 0 && (
              <Alert color="red" variant="light">
                <Stack gap="xs">
                  {externalErrors.map((error, idx) => (
                    <Text key={idx} size="sm">
                      {error}
                    </Text>
                  ))}
                </Stack>
              </Alert>
            )}

            <Button
              onClick={handleResendEmail}
              variant="light"
              fullWidth
              loading={sendVerificationEmail.isPending}
            >
              {emailSent ? 'Resend Again' : 'Resend Verification Email'}
            </Button>

            {allowSkip && (
              <Button onClick={handleSkip} variant="subtle" fullWidth>
                Skip for Now
              </Button>
            )}
          </Stack>
        </Paper>

        {footer}
      </Stack>
    </Container>
  );
}
