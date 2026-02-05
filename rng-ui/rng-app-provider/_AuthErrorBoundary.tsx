'use client';

import { AppAuthError } from '@/rng-platform';
import { Alert, Button, Container, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconLock, IconUserOff } from '@tabler/icons-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface AuthErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: AppAuthError, reset: () => void) => ReactNode;
  onError?: (error: AppAuthError, errorInfo: ErrorInfo) => void;
}

interface AuthErrorBoundaryState {
  error: AppAuthError | null;
}

/**
 * Error boundary that understands typed AppAuthError.
 * Provides security-conscious, role-aware error messaging.
 */
export class AuthErrorBoundary extends Component<AuthErrorBoundaryProps, AuthErrorBoundaryState> {
  constructor(props: AuthErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): AuthErrorBoundaryState {
    // Check if it's an AppAuthError by verifying required properties and shape
    // All AppAuthError subclasses have 'code', 'message', and 'name' properties
    // and code values start with 'auth/'
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      'message' in error &&
      'name' in error
    ) {
      const e = error as Record<string, unknown>;
      // Verify the shape matches AppAuthError
      if (
        typeof e.code === 'string' &&
        typeof e.message === 'string' &&
        typeof e.name === 'string' &&
        e.code.startsWith('auth/')
      ) {
        return { error: error as AppAuthError };
      }
    }
    // Wrap unknown errors as internal errors
    return {
      error: {
        code: 'auth/internal',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        name: 'InternalAuthError',
      } as AppAuthError,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appAuthError = this.state.error;
    if (appAuthError && this.props.onError) {
      this.props.onError(appAuthError, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (!error) {
      return children;
    }

    if (fallback) {
      return fallback(error, this.handleReset);
    }

    return <DefaultAuthErrorFallback error={error} onReset={this.handleReset} />;
  }
}

/**
 * Default error fallback with typed error messaging
 */
function DefaultAuthErrorFallback({
  error,
  onReset,
}: {
  error: AppAuthError;
  onReset: () => void;
}) {
  const errorDetails = getErrorDetails(error);

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg" align="center">
        <div style={{ color: errorDetails.color }}>{errorDetails.icon}</div>
        <Stack gap="xs" align="center">
          <Title order={2}>{errorDetails.title}</Title>
          <Text c="dimmed" ta="center">
            {errorDetails.message}
          </Text>
        </Stack>

        <Alert
          icon={<IconAlertCircle size={16} />}
          color={errorDetails.color}
          variant="light"
          w="100%"
        >
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              {errorDetails.userAction}
            </Text>
            {errorDetails.technicalHint && (
              <Text size="xs" c="dimmed">
                {errorDetails.technicalHint}
              </Text>
            )}
          </Stack>
        </Alert>

        <Button onClick={onReset} variant="light">
          Try Again
        </Button>
      </Stack>
    </Container>
  );
}

interface ErrorDetails {
  title: string;
  message: string;
  userAction: string;
  technicalHint?: string;
  icon: ReactNode;
  color: string;
}

/**
 * Map AppAuthError codes to user-friendly messages
 */
function getErrorDetails(error: AppAuthError): ErrorDetails {
  const code = error.code;

  switch (code) {
    case 'auth/invalid-credentials':
      return {
        title: 'Invalid Credentials',
        message: 'The email or password you entered is incorrect.',
        userAction: 'Please check your credentials and try again.',
        icon: <IconLock size={48} />,
        color: 'red',
      };

    case 'auth/email-already-in-use':
      return {
        title: 'Email Already Registered',
        message: 'An account with this email already exists.',
        userAction: 'Try signing in instead, or use a different email address.',
        icon: <IconAlertCircle size={48} />,
        color: 'orange',
      };

    case 'auth/weak-password':
      return {
        title: 'Password Too Weak',
        message: 'Your password does not meet security requirements.',
        userAction: 'Use at least 8 characters with uppercase, lowercase, numbers, and symbols.',
        icon: <IconLock size={48} />,
        color: 'orange',
      };

    case 'auth/invalid-email':
      return {
        title: 'Invalid Email',
        message: 'The email address format is invalid.',
        userAction: 'Please enter a valid email address.',
        icon: <IconAlertCircle size={48} />,
        color: 'orange',
      };

    case 'auth/too-many-requests':
      return {
        title: 'Too Many Requests',
        message: 'You have made too many attempts.',
        userAction: 'Please wait a few minutes before trying again.',
        technicalHint: 'This is a security measure to prevent abuse.',
        icon: <IconAlertCircle size={48} />,
        color: 'orange',
      };

    case 'auth/user-disabled':
      return {
        title: 'Account Disabled',
        message: 'Your account has been disabled.',
        userAction: 'Contact your administrator for assistance.',
        icon: <IconUserOff size={48} />,
        color: 'red',
      };

    case 'auth/session-expired':
      return {
        title: 'Session Expired',
        message: 'Your session has expired for security reasons.',
        userAction: 'Please sign in again to continue.',
        icon: <IconLock size={48} />,
        color: 'yellow',
      };

    case 'auth/not-authenticated':
      return {
        title: 'Not Authenticated',
        message: 'You need to be signed in to access this page.',
        userAction: 'Please sign in to continue.',
        icon: <IconLock size={48} />,
        color: 'blue',
      };

    case 'auth/not-authorized':
      return {
        title: 'Not Authorized',
        message: 'You do not have permission to perform this action.',
        userAction: 'Contact your administrator if you believe this is an error.',
        icon: <IconUserOff size={48} />,
        color: 'red',
      };

    case 'auth/owner-already-exists':
      return {
        title: 'Owner Already Exists',
        message: 'An owner account already exists for this organization.',
        userAction: 'Sign in with the existing owner account or contact support.',
        icon: <IconAlertCircle size={48} />,
        color: 'orange',
      };

    case 'auth/owner-bootstrap-race':
      return {
        title: 'Setup Race Condition',
        message: 'Another setup process completed first.',
        userAction: 'The system has been cleaned up. Please sign in with the existing account.',
        technicalHint: 'Concurrent owner bootstrap was detected and resolved.',
        icon: <IconAlertCircle size={48} />,
        color: 'orange',
      };

    case 'auth/invariant-violation':
      return {
        title: 'Data Integrity Error',
        message: 'A system invariant was violated.',
        userAction: 'Please contact technical support with this error code.',
        technicalHint: error.message,
        icon: <IconAlertCircle size={48} />,
        color: 'red',
      };

    case 'auth/infrastructure-error':
      return {
        title: 'Service Unavailable',
        message: 'Authentication service is temporarily unavailable.',
        userAction: 'Please check your connection and try again.',
        technicalHint: error.message,
        icon: <IconAlertCircle size={48} />,
        color: 'red',
      };

    case 'auth/invite-invalid':
      return {
        title: 'Invalid Invite',
        message: 'This invitation is invalid or has expired.',
        userAction: 'Request a new invitation from your administrator.',
        icon: <IconAlertCircle size={48} />,
        color: 'orange',
      };

    case 'auth/invite-already-accepted':
      return {
        title: 'Invite Already Used',
        message: 'This invitation has already been accepted.',
        userAction: 'Sign in with your existing account.',
        icon: <IconAlertCircle size={48} />,
        color: 'orange',
      };

    case 'auth/invite-revoked':
      return {
        title: 'Invite Revoked',
        message: 'This invitation has been revoked.',
        userAction: 'Contact your administrator for a new invitation.',
        icon: <IconUserOff size={48} />,
        color: 'red',
      };

    case 'auth/internal':
    default:
      return {
        title: 'Authentication Error',
        message: 'An unexpected error occurred during authentication.',
        userAction: 'Please try again or contact support if the problem persists.',
        technicalHint: process.env.NODE_ENV === 'development' ? error.message : undefined,
        icon: <IconAlertCircle size={48} />,
        color: 'red',
      };
  }
}
