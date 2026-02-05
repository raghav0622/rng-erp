'use client';

import { useConfirmPassword } from '@/rng-platform';
import { Button, Group, Modal, PasswordInput, Stack, Text } from '@mantine/core';
import { useState } from 'react';

export interface PasswordConfirmationModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  error?: string;
}

/**
 * Password confirmation modal
 *
 * Features:
 * - Verify current password
 * - For sensitive operations (delete, disable, role change)
 * - Secure password verification via service
 * - Shows error on failed verification
 * - Supports async verification
 *
 * Usage:
 * - Wrap destructive operations
 * - Collect password before proceeding
 * - Close on success
 *
 * @example
 * const [opened, setOpened] = useState(false);
 * const handleDelete = async () => {
 *   const confirmed = await PasswordConfirmationModal.show();
 *   if (confirmed) await deleteUser();
 * };
 *
 * <PasswordConfirmationModal
 *   opened={opened}
 *   onClose={() => setOpened(false)}
 *   onConfirm={handleDelete}
 *   title="Confirm Identity"
 *   description="Enter your password to proceed"
 * />
 */
export function PasswordConfirmationModal({
  opened,
  onClose,
  onConfirm,
  title = 'Confirm Password',
  description = 'Please enter your password to confirm this action.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading: externalLoading,
  error: externalError,
}: PasswordConfirmationModalProps) {
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const confirmPassword = useConfirmPassword();

  const isLoading = confirmPassword.isPending || externalLoading;

  const handleConfirm = async () => {
    setErrors([]);

    if (!password) {
      setErrors(['Password is required']);
      return;
    }

    try {
      await confirmPassword.mutateAsync({ password });
      onConfirm(password);
      setPassword('');
    } catch (error) {
      const appError = error as any;
      setErrors([appError?.message || 'Password verification failed']);
    }
  };

  const handleClose = () => {
    setPassword('');
    setErrors([]);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={handleClose} title={title} centered>
      <Stack gap="md">
        {typeof description === 'string' ? (
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        ) : (
          description
        )}

        {(errors.length > 0 || externalError) && (
          <div
            style={{ backgroundColor: 'var(--mantine-color-red-0)', padding: 12, borderRadius: 6 }}
          >
            {errors.map((error, idx) => (
              <Text key={idx} size="xs" color="red">
                {error}
              </Text>
            ))}
            {externalError && (
              <Text size="xs" color="red">
                {externalError}
              </Text>
            )}
          </div>
        )}

        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleConfirm();
            }
          }}
          disabled={isLoading}
          autoFocus
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" onClick={handleClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button onClick={handleConfirm} loading={isLoading}>
            {confirmText}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default PasswordConfirmationModal;
