import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword, createSession, getSessionCookieOptions, AUTH_CONFIG } from '@/lib/auth';

// In-memory rate limiter (per email)
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

function isRateLimited(email: string): boolean {
  const record = loginAttempts.get(email);
  if (!record) return false;
  if (record.lockedUntil > Date.now()) return true;
  if (Date.now() - record.lockedUntil > AUTH_CONFIG.lockoutMinutes * 60 * 1000) {
    loginAttempts.delete(email);
    return false;
  }
  return false;
}

function recordFailedAttempt(email: string): void {
  const record = loginAttempts.get(email) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= AUTH_CONFIG.maxLoginAttempts) {
    record.lockedUntil = Date.now() + AUTH_CONFIG.lockoutMinutes * 60 * 1000;
  }
  loginAttempts.set(email, record);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Rate limiting
    if (isRateLimited(email)) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${AUTH_CONFIG.lockoutMinutes} minutes.` },
        { status: 429 },
      );
    }

    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || !user.isActive) {
      recordFailedAttempt(email);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      recordFailedAttempt(email);
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Clear failed attempts
    loginAttempts.delete(email);

    // Create session
    const { token, expiresAt } = await createSession(user.id);

    const cookieOpts = getSessionCookieOptions();
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      expiresAt: expiresAt.toISOString(),
    });

    response.cookies.set(cookieOpts.name, token, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
