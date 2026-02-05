'use client';

import { Drawer, Modal } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ReactNode, useState } from 'react';

export interface RNGModalProps {
  title?: ReactNode;
  children: (onClose: () => void) => ReactNode;
  renderTrigger: (props: { onClick: () => void }) => ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  closeOnClickOutside?: boolean;
  centered?: boolean;
  zIndex?: number;
  initialOpened?: boolean;
}

export function RNGModal({
  title,
  children,
  renderTrigger,
  size = 'md',
  closeOnClickOutside = true,
  centered = true,
  zIndex = 1000,
  initialOpened = false,
}: RNGModalProps) {
  const [opened, setOpened] = useState(initialOpened);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleClose = () => setOpened(false);

  if (isMobile) {
    return (
      <>
        {renderTrigger({ onClick: () => setOpened(true) })}
        <Drawer
          opened={opened}
          onClose={handleClose}
          title={title}
          position="bottom"
          size="auto"
          closeOnClickOutside={closeOnClickOutside}
          zIndex={zIndex}
        >
          {children(handleClose)}
        </Drawer>
      </>
    );
  }

  return (
    <>
      {renderTrigger({ onClick: () => setOpened(true) })}
      <Modal
        opened={opened}
        onClose={handleClose}
        title={title}
        size={size}
        centered={centered}
        closeOnClickOutside={closeOnClickOutside}
        zIndex={zIndex}
      >
        {children(handleClose)}
      </Modal>
    </>
  );
}
