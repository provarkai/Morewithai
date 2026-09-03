import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

// Test the token hashing function (extracted from session.ts logic)
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('Session token hashing', () => {
  it('produces consistent hashes', () => {
    const token = 'test-token-123';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different tokens', () => {
    const hash1 = hashToken('token-1');
    const hash2 = hashToken('token-2');
    expect(hash1).not.toBe(hash2);
  });

  it('produces 64-character hex string', () => {
    const hash = hashToken('test');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// Test CSRF token generation (logic extracted)
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

describe('CSRF token generation', () => {
  it('generates 64-character hex tokens', () => {
    const token = generateCsrfToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates unique tokens', () => {
    const token1 = generateCsrfToken();
    const token2 = generateCsrfToken();
    expect(token1).not.toBe(token2);
  });
});

// Test webhook signature verification (logic extracted)
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  const receivedSignature = signature.replace('sha256=', '');
  if (receivedSignature.length !== expectedSignature.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature),
    Buffer.from(expectedSignature),
  );
}

describe('Webhook signature verification', () => {
  const secret = 'webhook-secret-123';

  it('verifies valid signatures', () => {
    const payload = '{"event":"article.published"}';
    const signature = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  it('rejects invalid signatures', () => {
    const payload = '{"event":"article.published"}';
    expect(verifyWebhookSignature(payload, 'sha256=invalid', secret)).toBe(false);
  });

  it('rejects tampered payloads', () => {
    const payload = '{"event":"article.published"}';
    const signature = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
    expect(verifyWebhookSignature('{"event":"article.deleted"}', signature, secret)).toBe(false);
  });
});
