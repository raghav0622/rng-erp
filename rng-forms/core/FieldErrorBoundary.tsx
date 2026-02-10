'use client';

import { Alert, Button, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import React from 'react';
import { globalLogger } from '@/lib';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the entire form
 *
 * @example
 * <ErrorBoundary>
 *   <RNGForm schema={schema} onSubmit={handleSubmit} />
 * </ErrorBoundary>
 */
export class FieldErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    globalLogger.error('Field Error Boundary caught an error:', { error, errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Alert
          icon={<IconAlertTriangle size={16} />}
          title="Field Error"
          color="red"
          variant="light"
          withCloseButton={false}
        >
          <Stack gap="xs">
            <Text size="sm">This field encountered an error and could not be displayed.</Text>
            {this.state.error && (
              <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                {this.state.error.message}
              </Text>
            )}
            <Button size="xs" variant="light" onClick={this.handleReset}>
              Try Again
            </Button>
          </Stack>
        </Alert>
      );
    }

    return this.props.children;
  }
}

export default FieldErrorBoundary;
