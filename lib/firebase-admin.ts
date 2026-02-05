/**
 * Firebase Admin SDK bootstrap for server-side operations.
 * Used for operations that require admin privileges (e.g., deleting Auth users).
 *
 * SECURITY: Only use in server-side code (API routes, middleware, server actions).
 * NEVER expose this to the client.
 *
 * INSTALLATION: Ensure firebase-admin is installed:
 * npm install firebase-admin
 * OR
 * yarn add firebase-admin
 *
 * Required environment variables:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY
 */
import * as admin from 'firebase-admin';
import { env } from './env';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
