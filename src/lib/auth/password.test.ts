import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('test-password-123');
    expect(hash).toMatch(/^\$2[aby]?\$\d{2}\$/);
  });

  it('produces different hashes for the same password', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    // bcrypt uses random salt, so hashes should differ
    expect(hash1).not.toBe(hash2);
  });

  it('handles empty string', async () => {
    const hash = await hashPassword('');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('handles very long passwords', async () => {
    const longPassword = 'a'.repeat(72); // bcrypt max
    const hash = await hashPassword(longPassword);
    expect(hash).toMatch(/^\$2[aby]?\$\d{2}\$/);
  });
});

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const password = 'my-secure-password';
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  it('returns false for incorrect password', async () => {
    const hash = await hashPassword('correct-password');
    const result = await verifyPassword('wrong-password', hash);
    expect(result).toBe(false);
  });

  it('returns false for empty password against non-empty hash', async () => {
    const hash = await hashPassword('something');
    const result = await verifyPassword('', hash);
    expect(result).toBe(false);
  });

  it('handles passwords with special characters', async () => {
    const password = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  it('handles passwords with unicode', async () => {
    const password = 'pässwörd日本語';
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  it('handles passwords with spaces', async () => {
    const password = 'password with spaces';
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });
});
