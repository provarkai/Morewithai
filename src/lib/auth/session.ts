import crypto from 'crypto';
import { db } from '@/lib/db';
import { AUTH_CONFIG } from './config';

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function hashToken(token: string): Promise<string> {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + AUTH_CONFIG.sessionExpiryHours * 60 * 60 * 1000);

  await db.session.create({
    data: { userId, tokenHash, expiresAt },
  });

  return { token, expiresAt };
}

export async function validateSession(token: string): Promise<{ userId: string; email: string; name: string; role: string } | null> {
  const tokenHash = await hashToken(token);

  const session = await db.session.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, name: true, role: true, isActive: true } } },
  });

  if (!session) return null;
  if (!session.user.isActive) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } });
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

export async function destroySession(token: string): Promise<void> {
  const tokenHash = await hashToken(token);
  await db.session.deleteMany({ where: { tokenHash } });
}

export async function destroyAllUserSessions(userId: string): Promise<void> {
  await db.session.deleteMany({ where: { userId } });
}

export function getSessionCookieOptions(): { name: string; httpOnly: boolean; secure: boolean; sameSite: 'lax'; path: string; maxAge: number } {
  return {
    name: AUTH_CONFIG.cookieName,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_CONFIG.sessionExpiryHours * 60 * 60,
  };
}
