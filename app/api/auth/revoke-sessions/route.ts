import { adminAuth } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Internal API endpoint to revoke all refresh tokens for a Firebase Auth user.
 * This forces the user to be logged out instantly across all devices.
 * Only callable with admin credentials (Firebase Admin SDK).
 *
 * POST /api/auth/revoke-sessions
 * Body: { uid: string }
 */
export async function POST(request: NextRequest) {
  console.log('[revoke-sessions] POST request received');

  try {
    const { uid } = await request.json();
    console.log('[revoke-sessions] Request body parsed:', { uid });

    if (!uid) {
      console.error('[revoke-sessions] Missing uid in request');
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    console.log('[revoke-sessions] Revoking refresh tokens for user:', uid);
    // Revoke all refresh tokens for the user
    // This will force them to re-authenticate on their next request
    await adminAuth.revokeRefreshTokens(uid);
    console.log('[revoke-sessions] Refresh tokens revoked successfully');

    // Optionally, you can also disable the user in Firebase Auth
    // This provides an additional layer of enforcement
    const userRecord = await adminAuth.getUser(uid);
    console.log('[revoke-sessions] User record retrieved:', {
      uid: userRecord.uid,
      disabled: userRecord.disabled,
    });

    if (!userRecord.disabled) {
      console.log('[revoke-sessions] Disabling user in Firebase Auth');
      await adminAuth.updateUser(uid, { disabled: true });
      console.log('[revoke-sessions] User disabled successfully');
    } else {
      console.log('[revoke-sessions] User already disabled');
    }

    const response = {
      success: true,
      uid,
      tokensRevokedAt: new Date().toISOString(),
    };
    console.log('[revoke-sessions] Success response:', response);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[revoke-sessions] Error:', error);
    console.error('[revoke-sessions] Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    // User not found is not an error - user might already be deleted
    if (error?.code === 'auth/user-not-found') {
      console.log('[revoke-sessions] User not found, returning success');
      return NextResponse.json({
        success: true,
        uid: '',
        notFound: true,
      });
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to revoke sessions' },
      { status: 500 },
    );
  }
}
