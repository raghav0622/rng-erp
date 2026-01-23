import { createContext, ReactNode, useContext } from 'react';

interface RBACBoundaryProps {
  allowed: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

const RBACContext = createContext<boolean>(false);

export const RBACBoundary = ({ allowed, fallback = null, children }: RBACBoundaryProps) => {
  return (
    <RBACContext.Provider value={allowed}>{allowed ? children : fallback}</RBACContext.Provider>
  );
};

export function useRBAC() {
  return useContext(RBACContext);
}
