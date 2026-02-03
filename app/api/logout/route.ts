import { serverConfig } from '@/lib/firebase-auth-edge';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(serverConfig.cookieName);

  return NextResponse.json({ success: true });
}
