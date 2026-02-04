'use client';

import { Drawer, Modal } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { ReactNode, useState } from 'react';

export interface RNGModalProps {
  /**
   * Modal/Drawer title
   */
  title?: ReactNode;

  /**
   * Modal content - function receives onClose handler
   * @example
   * children={(onClose) => <EditForm onSuccess={onClose} />}
   */
  children: (onClose: () => void) => ReactNode;

  /**
   * Trigger element - renders the button/element that opens the modal
   * Uses render props pattern for flexibility
   * @example
   * renderTrigger={(props) => <Button {...props}>Open Modal</Button>}
   */
  renderTrigger: (props: { onClick: () => void }) => ReactNode;

  /**
   * Size of the modal
   * @default 'md'
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Whether the modal can be closed by clicking outside
   * @default true
   */
  closeOnClickOutside?: boolean;

  /**
   * Whether to center the modal
   * @default true
   */
  centered?: boolean;

  /**
   * Z-index
   * @default 1000
   */
  zIndex?: number;

  /**
   * Initial opened state for the modal
   * @default false
   */
  initialOpened?: boolean;
}

/**
 * RNGModal - Responsive modal component with internal state management
 *
 * Features:
 * - Modal on desktop/tablet
 * - Bottom drawer on mobile
 * - Internal state management (no parent state needed)
 * - RenderProps pattern for trigger and content
 * - Passes onClose to children for seamless form handling
 *
 * @example
 * <RNGModal
 *   title="Edit User"
 *   renderTrigger={(props) => <Button {...props}>Edit</Button>}
 * >
 *   {(onClose) => <EditForm onSuccess={onClose} />}
 * </RNGModal>
 */
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

export default RNGModal;
