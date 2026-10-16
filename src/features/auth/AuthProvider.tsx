import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { auth } from '@/services/firebase/app';

type AuthState = { user: User | null; ready: boolean };

const AuthContext = createContext<AuthState>({ user: null, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: auth.currentUser, ready: false });

  useEffect(() => onAuthStateChanged(auth, (user) => setState({ user, ready: true })), []);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth() {
  return use(AuthContext);
}
