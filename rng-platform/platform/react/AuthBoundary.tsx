import { createContext, ReactNode, useContext } from 'react';

interface AuthBoundaryProps {
  isAuthenticated: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

const AuthContext = createContext<boolean>(false);

export const AuthBoundary = ({ isAuthenticated, fallback = null, children }: AuthBoundaryProps) => {
  return (
    <AuthContext.Provider value={isAuthenticated}>
      {isAuthenticated ? children : fallback}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  return useContext(AuthContext);
}
