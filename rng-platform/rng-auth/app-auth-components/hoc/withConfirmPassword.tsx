'use client';

import type { ComponentType } from 'react';
import { useState } from 'react';
import { PasswordConfirmationModal } from '../modals/PasswordConfirmationModal';

export interface WithConfirmPasswordOptions {
  /**
   * Modal title
   * @default 'Confirm Password'
   */
  title?: string;
  /**
   * Modal description
   */
  description?: React.ReactNode;
  /**
   * Confirm button text
   * @default 'Confirm'
   */
  confirmText?: string;
}

/**
 * HOC that requires password confirmation before rendering component
 *
 * Wraps component with password confirmation modal for destructive operations.
 * Component only renders after successful password verification.
 *
 * @example
 * const DeleteUserPage = withConfirmPassword(DeleteUserPageContent, {
 *   title: 'Confirm Deletion',
 *   description: 'Enter your password to delete this user'
 * });
 */
export function withConfirmPassword<P extends object>(
  Component: ComponentType<P>,
  options?: WithConfirmPasswordOptions,
) {
  const WrappedComponent = (props: P) => {
    const [confirmed, setConfirmed] = useState(false);
    const [showModal, setShowModal] = useState(true);

    if (confirmed) {
      return <Component {...props} />;
    }

    return (
      <PasswordConfirmationModal
        opened={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={() => {
          setConfirmed(true);
          setShowModal(false);
        }}
        title={options?.title}
        description={options?.description}
        confirmText={options?.confirmText}
      />
    );
  };

  WrappedComponent.displayName = `withConfirmPassword(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

export default withConfirmPassword;
