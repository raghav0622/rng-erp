import { serverConfig } from '@/lib/firebase-auth-edge';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(serverConfig.cookieName);

  // Create explicit response and delete cookie from headers (Next.js 16 compatibility)
  const response = NextResponse.json({ success: true });
  response.cookies.delete(serverConfig.cookieName);

  return response;
}
