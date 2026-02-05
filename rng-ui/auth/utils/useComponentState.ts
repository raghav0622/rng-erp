'use client';

import { useState } from 'react';

/**
 * DRY hook for managing simple open/close modal state
 * Used across multiple components to eliminate duplicate useState logic
 *
 * Pattern seen in: UserMenu, PasswordConfirmationModal, EmailVerificationScreen
 *
 * @example
 * ```tsx
 * const { opened, open, close, toggle } = useModalState();
 *
 * return (
 *   <>
 *     <Button onClick={open}>Open Modal</Button>
 *     <Modal opened={opened} onClose={close}>
 *       Content
 *     </Modal>
 *   </>
 * );
 * ```
 */
export function useModalState(initialOpen = false) {
  const [opened, setOpened] = useState(initialOpen);

  const open = () => setOpened(true);
  const close = () => setOpened(false);
  const toggle = () => setOpened((prev) => !prev);

  return { opened, open, close, toggle, setOpened };
}

/**
 * DRY hook for managing menu state (open/close + keyboard navigation)
 * Used across multiple UI components for consistent behavior
 *
 * Pattern seen in: UserMenu, UserActionsMenu
 *
 * @example
 * ```tsx
 * const menu = useMenuState();
 *
 * return (
 *   <Menu opened={menu.opened} onOpen={menu.open} onClose={menu.close}>
 *     ...
 *   </Menu>
 * );
 * ```
 */
export function useMenuState(initialOpen = false) {
  const [opened, setOpened] = useState(initialOpen);

  const open = () => setOpened(true);
  const close = () => setOpened(false);

  return { opened, open, close, setOpened };
}

/**
 * DRY hook for managing form error state
 * Used across screens and forms for consistent error handling
 *
 * Pattern seen in: EmailVerificationScreen, ChangePasswordScreen, PasswordConfirmationModal
 *
 * @example
 * ```tsx
 * const errors = useErrorState();
 *
 * return (
 *   <>
 *     <ErrorAlert messages={errors.messages} />
 *     <Button onClick={() => errors.add('New error')}>Add Error</Button>
 *   </>
 * );
 * ```
 */
export function useErrorState(initialErrors: string[] = []) {
  const [messages, setMessages] = useState<string[]>(initialErrors);

  const add = (message: string) => setMessages((prev) => [...prev, message]);
  const addMultiple = (newMessages: string[]) => setMessages((prev) => [...prev, ...newMessages]);
  const clear = () => setMessages([]);
  const reset = () => setMessages(initialErrors);

  return {
    messages,
    setMessages,
    add,
    addMultiple,
    clear,
    reset,
    hasErrors: messages.length > 0,
  };
}

/**
 * DRY hook for managing screen state transitions
 * Used across full-page authentication flows
 *
 * Pattern seen in: EmailVerificationScreen, ChangePasswordScreen
 *
 * @example
 * ```tsx
 * const state = useScreenState();
 *
 * return (
 *   state.isComplete ? (
 *     <SuccessMessage />
 *   ) : (
 *     <Form onSubmit={() => state.setComplete(true)} />
 *   )
 * );
 * ```
 */
export function useScreenState<T extends string | boolean = boolean>(initialState = false) {
  const [state, setState] = useState<T>(initialState as T);

  const setComplete = (value: T) => setState(value);
  const reset = () => setState(initialState as T);

  return {
    state,
    setState,
    setComplete,
    reset,
    isComplete: Boolean(state),
  };
}
