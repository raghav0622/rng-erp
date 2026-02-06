import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Internal API endpoint to revoke all sessions for a user in Firestore.
 * This provides instant multi-device logout by marking all sessions as revoked.
 * Only callable with admin credentials (Firebase Admin SDK).
 *
 * POST /api/auth/revoke-user-sessions
 * Body: { uid: string }
 */
export async function POST(request: NextRequest) {
  console.log('[revoke-user-sessions] POST request received');

  try {
    const { uid } = await request.json();
    console.log('[revoke-user-sessions] Request body parsed:', { uid });

    if (!uid) {
      console.error('[revoke-user-sessions] Missing uid in request');
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    console.log('[revoke-user-sessions] Revoking all Firestore sessions for user:', uid);

    // Query all sessions for this user
    const sessionsSnapshot = await adminDb
      .collection('sessions')
      .where('userId', '==', uid)
      .where('revoked', '==', false)
      .get();

    console.log('[revoke-user-sessions] Found active sessions:', sessionsSnapshot.size);

    // Revoke all active sessions in a batch
    const batch = adminDb.batch();
    let revokedCount = 0;

    sessionsSnapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        revoked: true,
        revokedAt: new Date(),
      });
      revokedCount++;
    });

    if (revokedCount > 0) {
      await batch.commit();
      console.log('[revoke-user-sessions] Revoked sessions in Firestore:', revokedCount);
    } else {
      console.log('[revoke-user-sessions] No active sessions found to revoke');
    }

    // Also revoke Firebase Auth tokens
    console.log('[revoke-user-sessions] Revoking Firebase Auth refresh tokens');
    await adminAuth.revokeRefreshTokens(uid);

    // Disable user in Firebase Auth
    const userRecord = await adminAuth.getUser(uid);
    if (!userRecord.disabled) {
      console.log('[revoke-user-sessions] Disabling user in Firebase Auth');
      await adminAuth.updateUser(uid, { disabled: true });
    } else {
      console.log('[revoke-user-sessions] User already disabled in Firebase Auth');
    }

    const response = {
      success: true,
      uid,
      sessionsRevoked: revokedCount,
      tokensRevokedAt: new Date().toISOString(),
    };
    console.log('[revoke-user-sessions] Success response:', response);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[revoke-user-sessions] Error:', error);
    console.error('[revoke-user-sessions] Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    // User not found is not an error - user might already be deleted
    if (error?.code === 'auth/user-not-found') {
      console.log('[revoke-user-sessions] User not found, returning success');
      return NextResponse.json({
        success: true,
        uid: '',
        notFound: true,
        sessionsRevoked: 0,
      });
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to revoke sessions' },
      { status: 500 },
    );
  }
}
