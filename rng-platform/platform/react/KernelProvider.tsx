import { createContext, ReactNode, useContext } from 'react';
import type { FeatureExecutionFacadeOptions } from '../../rng-kernel/execution/execution.facade';

interface KernelProviderProps {
  value: FeatureExecutionFacadeOptions;
  children: ReactNode;
}

const KernelContext = createContext<FeatureExecutionFacadeOptions | undefined>(undefined);

export const KernelProvider = ({ value, children }: KernelProviderProps) => (
  <KernelContext.Provider value={value}>{children}</KernelContext.Provider>
);

export function useKernel() {
  const ctx = useContext(KernelContext);
  if (!ctx) {
    throw {
      name: 'KernelProviderError',
      message: 'useKernel must be used within a KernelProvider',
    };
  }
  return ctx;
}
