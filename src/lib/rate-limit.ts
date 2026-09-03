import { NextRequest } from 'next/server';

// ─── Types ────────────────────────────────────────────────────

interface RateLimitConfig {
  windowMs?: number;    // default: 60000 (1 minute)
  maxRequests?: number; // default: 100
  keyPrefix?: string;   // default: 'rl'
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// ─── In-Memory Store ──────────────────────────────────────────

const store = new Map<string, number[]>();

// Periodically clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of store) {
    // Remove entries whose newest timestamp is older than 10 minutes
    if (timestamps.length === 0 || (timestamps[timestamps.length - 1] && timestamps[timestamps.length - 1] < now - 600_000)) {
      store.delete(key);
    }
  }
}, 300_000);

// ─── Helpers ──────────────────────────────────────────────────

function extractClientKey(req: NextRequest, prefix: string): string {
  // Check for mwa_session cookie first
  const sessionCookie = req.cookies.get('mwa_session');
  if (sessionCookie?.value) {
    return `${prefix}:${sessionCookie.value}`;
  }

  // Fall back to IP address
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  return `${prefix}:${ip}`;
}

function pruneOldTimestamps(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  // Since timestamps are appended in order, find the first index within the window
  let startIdx = 0;
  for (let i = 0; i < timestamps.length; i++) {
    if (timestamps[i] >= cutoff) {
      startIdx = i;
      break;
    }
    // If we never find a timestamp within the window, all are stale
    if (i === timestamps.length - 1) {
      startIdx = timestamps.length;
    }
  }
  return timestamps.slice(startIdx);
}

// ─── Core Function ────────────────────────────────────────────

export function checkRateLimit(
  req: NextRequest,
  config?: RateLimitConfig
): RateLimitResult {
  const windowMs = config?.windowMs ?? 60_000;
  const maxRequests = config?.maxRequests ?? 100;
  const keyPrefix = config?.keyPrefix ?? 'rl';

  const key = extractClientKey(req, keyPrefix);
  const now = Date.now();

  // Get or initialize the timestamp array for this key
  let timestamps = store.get(key) || [];

  // Remove timestamps outside the sliding window
  timestamps = pruneOldTimestamps(timestamps, windowMs);

  // Store the pruned array back
  if (timestamps.length === 0) {
    store.delete(key);
  }

  const count = timestamps.length;

  // Determine reset time based on the oldest timestamp in the window
  const oldestTimestamp = timestamps.length > 0 ? timestamps[0] : now;
  const resetAt = oldestTimestamp + windowMs;

  if (count >= maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Allow the request — push the current timestamp
  timestamps.push(now);
  store.set(key, timestamps);

  return {
    allowed: true,
    remaining: maxRequests - count - 1,
    resetAt,
  };
}

// ─── Middleware Helper ────────────────────────────────────────

/**
 * Creates a rate-limiting function that can be used in Next.js middleware.
 *
 * Usage in middleware.ts:
 * ```ts
 * const limiter = rateLimitMiddleware({ windowMs: 60000, maxRequests: 100 });
 * export function middleware(req: NextRequest) {
 *   const result = limiter(req);
 *   if (!result.allowed) {
 *     return new NextResponse('Too Many Requests', { status: 429 });
 *   }
 * }
 * ```
 */
export function rateLimitMiddleware(config?: RateLimitConfig) {
  return (req: NextRequest): RateLimitResult => {
    return checkRateLimit(req, config);
  };
}

export type { RateLimitConfig, RateLimitResult };
