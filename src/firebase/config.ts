import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
  collection,
  addDoc,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL per skill guidelines: explicitly pass firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection validation test per skill requirement
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
    }
    return false;
  }
}

// User profile interface
export interface UserProfileData {
  uid: string;
  displayName: string;
  email?: string;
  avatar: string;
  gamesPlayed: number;
  gamesWon: number;
  winStreak: number;
  createdAt: string;
}

// Sync user profile upon Google Sign-In
export async function syncUserProfile(user: User): Promise<UserProfileData> {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    } else {
      const newProfile: UserProfileData = {
        uid: user.uid,
        displayName: user.displayName || 'Ludo Player',
        email: user.email || undefined,
        avatar: '👑',
        gamesPlayed: 0,
        gamesWon: 0,
        winStreak: 0,
        createdAt: new Date().toISOString(),
      };
      await setDoc(userRef, newProfile);
      return newProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

// Record match history to Firestore
export async function recordMatchCompletion(data: {
  winnerName: string;
  winnerColor: string;
  mode: string;
  totalRolls: number;
  durationSeconds: number;
}) {
  if (!auth.currentUser) return;
  const path = 'matches';
  try {
    const matchId = `match_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const matchData = {
      matchId,
      winnerName: (data.winnerName || 'Winner').slice(0, 50),
      winnerColor: (data.winnerColor || 'red').slice(0, 20),
      mode: (data.mode || 'classic').slice(0, 20),
      totalRolls: Number(data.totalRolls) || 0,
      durationSeconds: Number(data.durationSeconds) || 0,
      completedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, path, matchId), matchData);
    console.log('Match successfully archived to Firestore:', matchId);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// Google Login helper with descriptive error reporting
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
      const helpfulMsg = `Firebase Auth Error: Domain "${currentHost}" is not yet in Authorized Domains.\n\nTo fix:\n1. Open Firebase Console -> Authentication -> Settings -> Authorized domains\n2. Add "${currentHost}"\n3. Click Save and try again.`;
      console.error(helpfulMsg);
      alert(helpfulMsg);
    } else if (err.code === 'auth/popup-blocked') {
      const msg = 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
      console.warn(msg);
      alert(msg);
    } else if (err.code === 'auth/popup-closed-by-user') {
      console.log('User closed the sign-in popup.');
    } else {
      console.error('Google Sign-in failed:', err.message || error);
    }
    throw error;
  }
}

// Logout helper
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
