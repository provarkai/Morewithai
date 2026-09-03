import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const AUTH_COOKIE_NAME = 'mwa_session';

/** Add security headers to every response */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.stripe.com https://api.resend.com https://api.sendgrid.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  return response;
}

// Routes that do NOT require authentication
const PUBLIC_API_ROUTES = ['/api/public', '/api/auth/login', '/api/auth/session', '/api/auth/logout', '/api/health', '/api/events/pageview', '/api/events/cta', '/api/events/affiliate', '/api/events/conversion'];

// Routes with stricter rate limits (login, public events)
const STRICT_ROUTES = ['/api/auth/login', '/api/events/'];

// Standard rate limit: 120 req/min per client
const STANDARD_LIMIT = { windowMs: 60_000, maxRequests: 120, keyPrefix: 'rl' };
// Strict rate limit: 20 req/min per client (auth + public tracking)
const STRICT_LIMIT = { windowMs: 60_000, maxRequests: 20, keyPrefix: 'rl_strict' };
// Generous limit: 300 req/min (media uploads, which are larger but less frequent)
const UPLOAD_LIMIT = { windowMs: 60_000, maxRequests: 30, keyPrefix: 'rl_upload' };

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow Next.js internal routes and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/uploads') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css')
  ) {
    return NextResponse.next();
  }

  // ─── Rate Limiting (applied to ALL API routes) ───────────
  if (pathname.startsWith('/api/')) {
    // Determine which limit to apply
    let config = STANDARD_LIMIT;
    if (STRICT_ROUTES.some((r) => pathname.startsWith(r))) {
      config = STRICT_LIMIT;
    } else if (pathname.startsWith('/api/media') && req.method === 'POST') {
      config = UPLOAD_LIMIT;
    }

    const result = checkRateLimit(req, config);

    if (!result.allowed) {
      return addSecurityHeaders(NextResponse.json(
        { error: 'Too many requests. Please try again later.', resetAt: result.resetAt },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      ));
    }
  }

  // Allow public API routes (after rate limiting)
  if (PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))) {
    const response = addSecurityHeaders(NextResponse.next());
    const rateResult = checkRateLimit(req, STRICT_ROUTES.some((r) => pathname.startsWith(r)) ? STRICT_LIMIT : STANDARD_LIMIT);
    response.headers.set('X-RateLimit-Remaining', String(rateResult.remaining));
    return response;
  }

  // For API routes, check session cookie
  if (pathname.startsWith('/api/')) {
    const sessionToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return addSecurityHeaders(NextResponse.json({ error: 'Authentication required' }, { status: 401 }));
    }

    // CSRF defense-in-depth: for state-changing methods, verify Origin/Referer header
    // SameSite=Lax already blocks cross-site cookie sends, but this adds a second layer
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const origin = req.headers.get('origin');
      const referer = req.headers.get('referer');
      const host = req.headers.get('host');
      if (origin && host && !origin.includes(host)) {
        return addSecurityHeaders(NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 }));
      }
      if (referer && host && !referer.includes(host)) {
        return addSecurityHeaders(NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 }));
      }
    }

    return addSecurityHeaders(NextResponse.next());
  }

  // Page routes — allow through with security headers
  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/api/:path*'],
};
