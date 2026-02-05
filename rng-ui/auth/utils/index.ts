/**
 * Utility functions and hooks for auth components
 *
 * Includes:
 * - Component state hooks (DRY): useModalState, useMenuState, useErrorState, useScreenState
 * - Auth utilities: event logging, routes, role helpers
 * - Formatters: date formatting, user helpers
 */

export * from './authEventLogger';
export * from './dateFormatters';
export * from './prefetch';
export * from './roleHelpers';
export * from './userHelpers';

// DRY component state hooks
export { useErrorState, useMenuState, useModalState, useScreenState } from './useComponentState';
