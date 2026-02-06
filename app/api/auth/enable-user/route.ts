import { adminAuth } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Internal API endpoint to enable a Firebase Auth user.
 * This re-enables a user that was previously disabled.
 * Only callable with admin credentials (Firebase Admin SDK).
 *
 * POST /api/auth/enable-user
 * Body: { uid: string }
 */
export async function POST(request: NextRequest) {
  console.log('[enable-user] POST request received');

  try {
    const { uid } = await request.json();
    console.log('[enable-user] Request body parsed:', { uid });

    if (!uid) {
      console.error('[enable-user] Missing uid in request');
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    console.log('[enable-user] Enabling user in Firebase Auth:', uid);
    // Enable the user in Firebase Auth
    await adminAuth.updateUser(uid, { disabled: false });
    console.log('[enable-user] User enabled successfully');

    const response = {
      success: true,
      uid,
      enabledAt: new Date().toISOString(),
    };
    console.log('[enable-user] Success response:', response);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[enable-user] Error:', error);
    console.error('[enable-user] Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    // User not found
    if (error?.code === 'auth/user-not-found') {
      console.error('[enable-user] User not found');
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
          notFound: true,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ error: error?.message || 'Failed to enable user' }, { status: 500 });
  }
}
