'use client';

import { RNGConfirmationModal } from '@/rng-ui/ux';
import { Button, Group, Stack, Text } from '@mantine/core';

interface DeleteConfirmModalProps {
  onConfirm: () => void;
  isLoading: boolean;
  renderTrigger: (props: { onClick: () => void }) => React.ReactNode;
}

export function DeleteConfirmModal({
  onConfirm,
  isLoading,
  renderTrigger,
}: DeleteConfirmModalProps) {
  return (
    <RNGConfirmationModal title="Delete User" renderTrigger={renderTrigger}>
      {(onClose) => (
        <Stack gap="md">
          <Text size="sm">
            This will deactivate the user and prevent them from signing in. You can restore the user
            later if needed.
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              loading={isLoading}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      )}
    </RNGConfirmationModal>
  );
}
