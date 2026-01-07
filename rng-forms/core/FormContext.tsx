'use client';

import { createContext, ReactNode, useContext } from 'react';

/**
 * Global configuration state for RNGForm
 */
export interface RNGContextState {
  readOnly: boolean;
  debug: boolean;
  isSubmitting: boolean;
}

/**
 * Context for RNGForm global configuration
 */
const RNGContext = createContext<RNGContextState | undefined>(undefined);

/**
 * Hook to access RNGForm context
 * @throws Error if used outside of RNGForm provider
 */
export function useRNGContext(): RNGContextState {
  const context = useContext(RNGContext);

  if (context === undefined) {
    throw new Error('useRNGContext must be used within RNGForm');
  }

  return context;
}

/**
 * Provider props
 */
export interface RNGContextProviderProps {
  value: RNGContextState;
  children: ReactNode;
}

/**
 * Provider component for RNGForm context
 */
export function RNGContextProvider({ value, children }: RNGContextProviderProps) {
  return <RNGContext.Provider value={value}>{children}</RNGContext.Provider>;
}

export { RNGContext };
