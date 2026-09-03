import { NextRequest, NextResponse } from 'next/server';
import { destroySession, getSessionCookieOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = req.cookies;
    const token = cookieStore.get(getSessionCookieOptions().name)?.value;

    if (token) {
      await destroySession(token);
    }

    const cookieOpts = getSessionCookieOptions();
    const response = NextResponse.json({ message: 'Logged out' });
    response.cookies.delete(cookieOpts.name);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
