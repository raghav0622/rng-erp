'use client';

import { Button } from '@mantine/core';
import { StatusConfirmModal } from './StatusConfirmModal';

interface StatusToggleButtonProps {
  isDisabled: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  size?: string;
}

export function StatusToggleButton({
  isDisabled,
  isLoading,
  onConfirm,
  size = 'sm',
}: StatusToggleButtonProps) {
  return (
    <StatusConfirmModal
      renderTrigger={({ onClick }) => (
        <Button
          size={size}
          variant="light"
          color={isDisabled ? 'green' : 'orange'}
          onClick={onClick}
          loading={isLoading}
        >
          {isDisabled ? 'Enable User' : 'Disable User'}
        </Button>
      )}
      onConfirm={onConfirm}
      isDisabled={isDisabled}
      isLoading={isLoading}
    />
  );
}
