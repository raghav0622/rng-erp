'use client';

import { RNGConfirmationModal } from '@/rng-ui/ux';
import { Button, Group, Stack, Text } from '@mantine/core';

interface StatusConfirmModalProps {
  onConfirm: () => void;
  isDisabled: boolean;
  isLoading: boolean;
  renderTrigger: (props: { onClick: () => void }) => React.ReactNode;
}

export function StatusConfirmModal({
  onConfirm,
  isDisabled,
  isLoading,
  renderTrigger,
}: StatusConfirmModalProps) {
  return (
    <RNGConfirmationModal title="Update User Status" renderTrigger={renderTrigger}>
      {(onClose) => (
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to {isDisabled ? 'enable' : 'disable'} this user?
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              color="orange"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              loading={isLoading}
            >
              Confirm
            </Button>
          </Group>
        </Stack>
      )}
    </RNGConfirmationModal>
  );
}
