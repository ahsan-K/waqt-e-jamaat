import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  OAuthProvider,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type AuthCredential,
  type User,
} from 'firebase/auth';
import { Platform } from 'react-native';

import { auth } from './app';

export type AuthErrorCode =
  | 'email-in-use'
  | 'wrong-credentials'
  | 'weak-password'
  | 'invalid-email'
  | 'network'
  | 'cancelled'
  | 'not-configured'
  | 'unknown';

export class AuthError extends Error {
  constructor(public code: AuthErrorCode) {
    super(code);
  }
}

function mapError(e: unknown): AuthError {
  if (e instanceof AuthError) return e;
  const code = (e as { code?: string })?.code ?? '';
  if (code.includes('email-already-in-use') || code.includes('credential-already-in-use')) {
    return new AuthError('email-in-use');
  }
  if (
    code.includes('wrong-password') ||
    code.includes('user-not-found') ||
    code.includes('invalid-credential') ||
    code.includes('invalid-login-credentials')
  ) {
    return new AuthError('wrong-credentials');
  }
  if (code.includes('weak-password')) return new AuthError('weak-password');
  if (code.includes('invalid-email')) return new AuthError('invalid-email');
  if (code.includes('network')) return new AuthError('network');
  if (code === 'ERR_REQUEST_CANCELED' || code.includes('cancel')) return new AuthError('cancelled');
  return new AuthError('unknown');
}

/** Silent guest sign-in (PLAN §7). No-op if someone is already signed in. */
export async function ensureSignedIn(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  try {
    return (await signInAnonymously(auth)).user;
  } catch {
    return null; // offline: app still works read-only from cache
  }
}

/**
 * Upgrade the guest (anonymous) user with a credential so nothing is lost;
 * if the account already exists, sign in to it instead.
 */
async function linkOrSignIn(credential: AuthCredential): Promise<{ user: User; isNew: boolean }> {
  const current = auth.currentUser;
  if (current?.isAnonymous) {
    try {
      const res = await linkWithCredential(current, credential);
      return { user: res.user, isNew: true };
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (!code.includes('credential-already-in-use') && !code.includes('email-already-in-use'))
        throw e;
      // Existing account: fall through to plain sign-in.
    }
  }
  const res = await signInWithCredential(auth, credential);
  return { user: res.user, isNew: false };
}

export async function registerWithEmail(name: string, email: string, password: string) {
  try {
    const current = auth.currentUser;
    const credential = EmailAuthProvider.credential(email.trim(), password);
    const user = current?.isAnonymous
      ? (await linkWithCredential(current, credential)).user
      : (await createUserWithEmailAndPassword(auth, email.trim(), password)).user;
    if (name.trim()) await updateProfile(user, { displayName: name.trim() });
    return user;
  } catch (e) {
    throw mapError(e);
  }
}

export async function loginWithEmail(email: string, password: string) {
  try {
    return (await signInWithEmailAndPassword(auth, email.trim(), password)).user;
  } catch (e) {
    throw mapError(e);
  }
}

/** Intezamia: fresh email/password account (not linked to the guest). */
export async function createManagerAccount(name: string, email: string, password: string) {
  try {
    const user = (await createUserWithEmailAndPassword(auth, email.trim(), password)).user;
    if (name.trim()) await updateProfile(user, { displayName: name.trim() });
    return user;
  } catch (e) {
    throw mapError(e);
  }
}

export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (e) {
    throw mapError(e);
  }
}

export const googleConfigured = !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export async function loginWithGoogle() {
  if (!googleConfigured) throw new AuthError('not-configured');
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
    });
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices();
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success' || !res.data.idToken) throw new AuthError('cancelled');
    return await linkOrSignIn(GoogleAuthProvider.credential(res.data.idToken));
  } catch (e) {
    throw mapError(e);
  }
}

export async function appleAvailable(): Promise<boolean> {
  return Platform.OS === 'ios' && (await AppleAuthentication.isAvailableAsync().catch(() => false));
}

export async function loginWithApple() {
  try {
    const rawNonce = Crypto.randomUUID();
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
    const res = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashed,
    });
    if (!res.identityToken) throw new AuthError('cancelled');
    const credential = new OAuthProvider('apple.com').credential({
      idToken: res.identityToken,
      rawNonce,
    });
    const result = await linkOrSignIn(credential);
    const fullName = [res.fullName?.givenName, res.fullName?.familyName].filter(Boolean).join(' ');
    if (fullName && !result.user.displayName)
      await updateProfile(result.user, { displayName: fullName });
    return result;
  } catch (e) {
    throw mapError(e);
  }
}

/** Sign out, then continue as a fresh guest. */
export async function signOut() {
  await fbSignOut(auth);
  await ensureSignedIn();
}
