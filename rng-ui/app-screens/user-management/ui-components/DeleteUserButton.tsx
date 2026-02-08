'use client';

import { Button } from '@mantine/core';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface DeleteUserButtonProps {
  isLoading: boolean;
  onConfirm: () => void;
  size?: string;
}

export function DeleteUserButton({ isLoading, onConfirm, size = 'sm' }: DeleteUserButtonProps) {
  return (
    <DeleteConfirmModal
      renderTrigger={({ onClick }) => (
        <Button size={size} variant="light" color="red" onClick={onClick} loading={isLoading}>
          Delete User
        </Button>
      )}
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}
