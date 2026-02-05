import { adminAuth } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Internal API endpoint to delete a Firebase Auth user.
 * Only callable with admin credentials (Firebase Admin SDK).
 *
 * POST /api/auth/delete-user
 * Body: { uid: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    // Delete Firebase Auth user
    await adminAuth.deleteUser(uid);

    return NextResponse.json({ success: true, uid });
  } catch (error: any) {
    console.error('Error deleting Firebase Auth user:', error);

    // User not found is not an error - we still want to complete the deletion
    if (error?.code === 'auth/user-not-found') {
      return NextResponse.json({ success: true, uid: '', notFound: true });
    }

    return NextResponse.json({ error: error?.message || 'Failed to delete user' }, { status: 500 });
  }
}
