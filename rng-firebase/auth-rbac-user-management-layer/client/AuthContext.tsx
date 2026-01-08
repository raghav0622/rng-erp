import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import type { User } from '../../types/erp-types';

export type AuthUser = User;

export type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unverified' }
  | { status: 'disabled' };

const AuthContext = createContext<AuthState>({ status: 'unauthenticated' });

// Pseudo repository import (replace with actual import)
// import { userRepository } from '../../abstract-client-repository/AbstractClientFirestoreRepository';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({ status: 'unauthenticated' });

  useEffect(() => {
    // Pseudo: listen to Firebase Auth state changes
    // Replace with actual Firebase Auth listener
    const unsubscribe = () => {};
    // Example:
    // firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
    //   if (!firebaseUser) {
    //     setState({ status: 'unauthenticated' });
    //     return;
    //   }
    //   // Hydrate from repository
    //   const user = await userRepository.getById(firebaseUser.uid);
    //   if (!user) {
    //     setState({ status: 'unauthenticated' });
    //     return;
    //   }
    //   // Enforce invariants
    //   if (!user.isActive || user.lifecycle === 'disabled') {
    //     setState({ status: 'disabled' });
    //     return;
    //   }
    //   if (!user.isEmailVerified) {
    //     setState({ status: 'unverified' });
    //     return;
    //   }
    //   setState({ status: 'authenticated', user });
    // });
    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
};

export function useAuthStateInternal(): AuthState {
  return useContext(AuthContext);
}
