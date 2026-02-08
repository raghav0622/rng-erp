import { serverConfig } from '@/lib/firebase-auth-edge';
import { refreshNextResponseCookiesWithToken } from 'next-firebase-auth-edge/next/cookies';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  if (!idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  try {
    // Create response first
    const response = NextResponse.json({ success: true });

    // Use next-firebase-auth-edge to properly sign and set the authentication cookies
    // This modifies the response headers to include the signed cookies
    await refreshNextResponseCookiesWithToken(idToken, request, response, serverConfig);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Failed to set cookie' }, { status: 500 });
  }
}
