import { auth } from './firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup,
  signInAnonymously,
  User
} from 'firebase/auth';

export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

export const linkGoogle = async (): Promise<void> => {
  if (!auth.currentUser) throw new Error("No user logged in");
  const provider = new GoogleAuthProvider();
  await linkWithPopup(auth.currentUser, provider);
};

export const createDemoGuestSession = async (): Promise<User> => {
  const result = await signInAnonymously(auth);
  return result.user;
};
