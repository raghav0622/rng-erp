/**
 * Firebase client bootstrap that exposes singleton app/auth/firestore/storage.
 */
import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Timestamp,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { env } from './env';

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export function serializeFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Timestamp) {
    return data.toDate().toISOString() as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeFirestoreData(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const newObj: Partial<T> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newObj[key] = serializeFirestoreData((data as any)[key]);
      }
    }
    return newObj as T;
  }

  return data;
}

export function toMillis(date: Timestamp | Date | number | undefined | null | any): number {
  if (!date) return 0;
  if (typeof date === 'number') return date;
  if (typeof date.toMillis === 'function') return date.toMillis();
  if (date instanceof Date) return date.getTime();
  return 0;
}

const clientAuthInstance = getAuth(app);
// Ensure session persists across reloads
setPersistence(clientAuthInstance, browserLocalPersistence).catch(() => {});
export const clientAuth = clientAuthInstance;
export const clientDb = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const clientStorage = getStorage(app);
export const clientApp = app;

export default clientApp;
