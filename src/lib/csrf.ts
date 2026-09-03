import crypto from 'crypto';
import { cookies } from 'next/headers';

const CSRF_COOKIE_NAME = 'mwa_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a CSRF token and store it in a cookie.
 * Returns the token to include in the request body/headers.
 */
export async function generateCsrfToken(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript for inclusion in headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });
  return token;
}

/**
 * Validate a CSRF token from a request against the stored cookie.
 * Should be called in API route handlers for state-changing operations.
 */
export async function validateCsrfToken(req: Request): Promise<boolean> {
  // Skip CSRF for GET, HEAD, OPTIONS (safe methods)
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  // Check header first, then body
  const headerToken = req.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Timing-safe comparison
  if (cookieToken.length !== headerToken.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
}

/**
 * Middleware helper: returns 403 if CSRF validation fails for state-changing methods.
 */
export async function csrfGuard(req: Request): Promise<Response | null> {
  const isValid = await validateCsrfToken(req);
  if (!isValid) {
    return new Response(
      JSON.stringify({ error: 'Invalid CSRF token' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return null;
}
