import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, rateLimitMiddleware } from './rate-limit';

// Mock NextRequest
function createMockRequest(ip?: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (ip) {
    headers['x-forwarded-for'] = ip;
  }

  const cookies: Record<string, { value: string }> = {};
  if (cookie) {
    cookies['mwa_session'] = { value: cookie };
  }

  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
    },
    cookies: {
      get: (name: string) => cookies[name] || null,
    },
  } as any;
}

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests within limit', () => {
    const req = createMockRequest('127.0.0.1');
    const result = checkRateLimit(req, { windowMs: 60000, maxRequests: 5 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('blocks requests exceeding limit', () => {
    const req = createMockRequest('10.0.0.1');

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit(req, { windowMs: 60000, maxRequests: 5 });
    }

    // Next request should be blocked
    const result = checkRateLimit(req, { windowMs: 60000, maxRequests: 5 });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('uses different keys for different IPs', () => {
    const req1 = createMockRequest('10.0.0.1');
    const req2 = createMockRequest('10.0.0.2');

    // Exhaust limit for req1
    for (let i = 0; i < 3; i++) {
      checkRateLimit(req1, { windowMs: 60000, maxRequests: 3 });
    }

    // req2 should still be allowed
    const result = checkRateLimit(req2, { windowMs: 60000, maxRequests: 3 });
    expect(result.allowed).toBe(true);
  });

  it('uses session cookie as key when available', () => {
    const req = createMockRequest('10.0.0.1', 'session-abc');

    // Exhaust limit
    for (let i = 0; i < 3; i++) {
      checkRateLimit(req, { windowMs: 60000, maxRequests: 3 });
    }

    // Same session from different IP should still be blocked
    const reqFromDifferentIp = createMockRequest('10.0.0.99', 'session-abc');
    const result = checkRateLimit(reqFromDifferentIp, { windowMs: 60000, maxRequests: 3 });
    expect(result.allowed).toBe(false);
  });

  it('resets after window expires', () => {
    const req = createMockRequest('10.0.0.5');

    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      checkRateLimit(req, { windowMs: 10000, maxRequests: 3 });
    }

    // Should be blocked
    expect(checkRateLimit(req, { windowMs: 10000, maxRequests: 3 }).allowed).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(11000);

    // Should be allowed again
    const result = checkRateLimit(req, { windowMs: 10000, maxRequests: 3 });
    expect(result.allowed).toBe(true);
  });

  it('uses default config when none provided', () => {
    const req = createMockRequest('10.0.0.100');
    const result = checkRateLimit(req);
    expect(result.allowed).toBe(true);
    expect(typeof result.remaining).toBe('number');
    expect(typeof result.resetAt).toBe('number');
  });

  it('handles requests with no IP and no cookie', () => {
    const req = createMockRequest();
    const result = checkRateLimit(req, { windowMs: 60000, maxRequests: 10 });
    expect(result.allowed).toBe(true);
  });

  it('returns resetAt timestamp in the future', () => {
    const req = createMockRequest('10.0.0.200');
    const now = Date.now();
    const result = checkRateLimit(req, { windowMs: 30000, maxRequests: 10 });
    expect(result.resetAt).toBeGreaterThan(now);
    expect(result.resetAt).toBeLessThanOrEqual(now + 30000);
  });
});

describe('rateLimitMiddleware', () => {
  it('returns a function', () => {
    const limiter = rateLimitMiddleware({ windowMs: 60000, maxRequests: 100 });
    expect(typeof limiter).toBe('function');
  });

  it('the returned function works as checkRateLimit', () => {
    const limiter = rateLimitMiddleware({ windowMs: 60000, maxRequests: 2 });
    const req = createMockRequest('10.0.0.300');

    expect(limiter(req).allowed).toBe(true);
    expect(limiter(req).allowed).toBe(true);
    expect(limiter(req).allowed).toBe(false);
  });
});
