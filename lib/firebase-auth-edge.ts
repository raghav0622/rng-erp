import { env } from './env';

export const serverConfig = {
  serviceAccount: {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    // Note: Firebase Admin SDK expects 'privateKey' but next-firebase-auth-edge
    // internally converts this for JWT operations
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  } as {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  },
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  cookieName: env.SESSION_COOKIE_NAME,
  cookieSignatureKeys: [env.COOKIE_SECRET_CURRENT, env.COOKIE_SECRET_PREVIOUS].filter(
    (key): key is string => Boolean(key),
  ),
  cookieSerializeOptions: {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: env.SESSION_COOKIE_MAX_AGE_DAYS * 60 * 60 * 24, // in seconds
  },
};

export const clientConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
