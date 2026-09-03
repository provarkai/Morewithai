import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { validateSession, getSessionCookieOptions } from './session';
import { hasPermission } from './permissions';
export type Permission = string;
import { ROLES, type Role } from './config';

const ROLE_HIERARCHY: Record<string, number> = {
  ADMIN: 3,
  EDITOR: 2,
  AUTHOR: 1,
};

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieOptions().name)?.value;
  if (!token) return null;

  const session = await validateSession(token);
  if (!session) return null;

  return {
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role as Role,
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError('Authentication required', 401);
  }
  return user;
}

export async function requireRole(...roles: Role[]): Promise<AuthUser> {
  const user = await requireAuth();
  const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
  const requiredLevel = Math.max(...roles.map((r) => ROLE_HIERARCHY[r] ?? 0));

  if (userLevel < requiredLevel) {
    throw new AuthError('Insufficient permissions', 403);
  }
  return user;
}

export async function requirePermission(...permissions: string[]): Promise<AuthUser> {
  const user = await requireAuth();
  for (const perm of permissions) {
    if (!hasPermission(user.role as any, perm)) {
      throw new AuthError(`Missing permission: ${perm}`, 403);
    }
  }
  return user;
}

export function authError(message: string, status: number = 401): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.status = status;
  }
}
