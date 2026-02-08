'use client';

import { Modal } from '@mantine/core';
import { ReactNode, useState } from 'react';

export interface RNGConfirmationModalProps {
  title?: ReactNode;
  children: (onClose: () => void) => ReactNode;
  renderTrigger: (props: { onClick: () => void }) => ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  centered?: boolean;
  closeOnClickOutside?: boolean;
}

/**
 * RNGConfirmationModal - Stateful confirmation modal with render props pattern
 * Use this for confirmation dialogs that manage their own open/close state
 * Use RNGModal for modals with rich content and trigger buttons
 */
export function RNGConfirmationModal({
  title,
  children,
  renderTrigger,
  size = 'sm',
  centered = true,
  closeOnClickOutside = false,
}: RNGConfirmationModalProps) {
  const [opened, setOpened] = useState(false);

  const handleClose = () => setOpened(false);

  return (
    <>
      {renderTrigger({ onClick: () => setOpened(true) })}
      <Modal
        title={title}
        opened={opened}
        onClose={handleClose}
        size={size}
        centered={centered}
        closeOnClickOutside={closeOnClickOutside}
      >
        {children(handleClose)}
      </Modal>
    </>
  );
}
