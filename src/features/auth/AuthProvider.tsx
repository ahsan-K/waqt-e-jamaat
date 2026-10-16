import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { auth } from '@/services/firebase/app';
import { ensureSignedIn } from '@/services/firebase/auth';
import { subscribeFavourites, type FavouriteEntry } from '@/services/firebase/namazi';
import { subscribeProfile, type UserProfile } from '@/services/firebase/users';

type AuthState = {
  user: User | null;
  /** Auth state known (first onAuthStateChanged fired). */
  ready: boolean;
  /** Signed in with Apple / Google / email (not the silent guest). */
  isRegistered: boolean;
  profile: UserProfile | null;
  profileLoaded: boolean;
  favourites: Record<string, FavouriteEntry>;
};

const initial: AuthState = {
  user: null,
  ready: false,
  isRegistered: false,
  profile: null,
  profileLoaded: false,
  favourites: {},
};

const AuthContext = createContext<AuthState>(initial);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<{ uid: string; value: UserProfile | null } | null>(null);
  const [favs, setFavs] = useState<{ uid: string; value: Record<string, FavouriteEntry> } | null>(
    null,
  );

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setReady(true);
        // Guest = anonymous user, created silently (PLAN §7).
        if (!u) void ensureSignedIn();
      }),
    [],
  );

  const uid = user?.uid;
  const isRegistered = !!user && !user.isAnonymous;

  useEffect(() => {
    if (!uid) return;
    return subscribeProfile(uid, (value) => setProfile({ uid, value }));
  }, [uid]);

  useEffect(() => {
    if (!uid || !isRegistered) return;
    return subscribeFavourites(uid, (value) => setFavs({ uid, value }));
  }, [uid, isRegistered]);

  const value: AuthState = {
    user,
    ready,
    isRegistered,
    profile: profile && profile.uid === uid ? profile.value : null,
    profileLoaded: !uid || profile?.uid === uid,
    favourites: isRegistered && favs && favs.uid === uid ? favs.value : {},
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  return use(AuthContext);
}
