import { serverConfig } from '@/lib/firebase-auth-edge';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  if (!idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();

    // Set the Firebase ID token as a signed cookie
    // The middleware will validate and refresh it automatically
    cookieStore.set(serverConfig.cookieName, idToken, serverConfig.cookieSerializeOptions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Failed to set cookie' }, { status: 500 });
  }
}
