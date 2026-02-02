'use client';

import { Alert, Button, Modal, PasswordInput, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconLock } from '@tabler/icons-react';
import { Suspense, useState } from 'react';
import { useConfirmPassword } from '../../../rng-auth';

export interface PasswordVerificationModalProps {
  /**
   * Modal open state
   */
  opened: boolean;
  /**
   * Called when modal is closed (cancel or backdrop click)
   */
  onClose: () => void;
  /**
   * Called when password is successfully verified
   */
  onVerified: () => void;
  /**
   * Action name for display (e.g., "delete this user", "perform this action")
   */
  actionName: string;
  /**
   * Optional warning message (defaults to generic warning)
   */
  warningMessage?: string;
  /**
   * Optional danger zone content
   */
  dangerContent?: React.ReactNode;
}

/**
 * Password Verification Modal
 *
 * Requires user to re-enter their password before proceeding with destructive operations.
 * Uses Firebase reauthentication via useConfirmPassword hook.
 *
 * Features:
 * - Firebase reauthentication
 * - Clear error messages
 * - Danger zone UI
 * - Suspense-friendly
 *
 * @example
 * ```tsx
 * const [showVerify, setShowVerify] = useState(false);
 *
 * <PasswordVerificationModal
 *   opened={showVerify}
 *   onClose={() => setShowVerify(false)}
 *   onVerified={handleDelete}
 *   actionName="delete this user"
 *   warningMessage="This action cannot be undone."
 * />
 * ```
 */
export function PasswordVerificationModal({
  opened,
  onClose,
  onVerified,
  actionName,
  warningMessage,
  dangerContent,
}: PasswordVerificationModalProps) {
  return (
    <Suspense fallback={null}>
      <PasswordVerificationModalInner
        opened={opened}
        onClose={onClose}
        onVerified={onVerified}
        actionName={actionName}
        warningMessage={warningMessage}
        dangerContent={dangerContent}
      />
    </Suspense>
  );
}

function PasswordVerificationModalInner({
  opened,
  onClose,
  onVerified,
  actionName,
  warningMessage,
  dangerContent,
}: PasswordVerificationModalProps) {
  const [password, setPassword] = useState('');
  const confirmPassword = useConfirmPassword();

  const handleVerify = async () => {
    if (!password.trim()) return;

    confirmPassword.mutate(password, {
      onSuccess: () => {
        setPassword('');
        onVerified();
      },
    });
  };

  const handleClose = () => {
    setPassword('');
    confirmPassword.reset();
    onClose();
  };

  const isError = confirmPassword.isError;
  const errorMessage = isError ? 'Incorrect password. Please try again.' : undefined;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text size="lg" fw={600}>
          Verify Your Password
        </Text>
      }
      centered
      size="md"
    >
      <Stack gap="md">
        <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
          {warningMessage || `You are about to ${actionName}. This is a sensitive operation.`}
        </Alert>

        {dangerContent}

        <Text size="sm" c="dimmed">
          Please re-enter your password to confirm this action.
        </Text>

        <PasswordInput
          label="Your Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && password.trim()) {
              handleVerify();
            }
          }}
          error={errorMessage}
          leftSection={<IconLock size={16} />}
          autoFocus
          disabled={confirmPassword.isPending}
        />

        <Stack gap="sm">
          <Button
            color="red"
            fullWidth
            onClick={handleVerify}
            loading={confirmPassword.isPending}
            disabled={!password.trim()}
          >
            Verify & Continue
          </Button>
          <Button
            variant="subtle"
            fullWidth
            onClick={handleClose}
            disabled={confirmPassword.isPending}
          >
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Modal>
  );
}

export default PasswordVerificationModal;
