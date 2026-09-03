import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getEmailProvider } from '@/lib/email/provider';
import { buildPasswordResetEmail } from '@/lib/email/templates';
import { log } from '@/lib/logger';
import crypto from 'crypto';

// POST /api/auth/reset — Request a password reset
// Body: { email: string }
// Returns: { message: string } (always returns success to prevent email enumeration)
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ message: 'If an account exists with this email, a reset link has been sent.' });
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ message: 'If an account exists with this email, a reset link has been sent.' });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Delete any existing reset tokens for this user
    await db.passwordReset.deleteMany({ where: { userId: user.id } });

    // Create new reset token
    await db.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Send reset email via configured email provider
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const resetUrl = `${origin}/auth/reset?token=${token}`;
    try {
      // Use global email settings (from env vars) for auth-related emails
      const emailProvider = await getEmailProvider('global');
      const { subject, html } = buildPasswordResetEmail({
        resetUrl,
        userName: user.name || user.email,
        expiryMinutes: 60,
      });
      await emailProvider.send(user.email, subject, html, {
        from: process.env.EMAIL_FROM || 'noreply@morewithai.online',
        previewText: 'Reset your MoreWithAI password',
      });
      log.info(`Password reset email sent to ${user.email}`);
    } catch (emailErr) {
      log.error('Failed to send reset email:', emailErr);
    }

    return NextResponse.json({
      message: 'If an account exists with this email, a reset link has been sent.',
    });
  } catch (error: any) {
    console.error('[auth] Password reset request failed:', error);
    return NextResponse.json({ message: 'If an account exists with this email, a reset link has been sent.' });
  }
}

// PUT /api/auth/reset — Reset password with token
// Body: { token: string, password: string }
export async function PUT(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetToken = await db.passwordReset.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetToken) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    if (resetToken.expiresAt < new Date()) {
      await db.passwordReset.delete({ where: { id: resetToken.id } });
      return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 });
    }

    // Hash new password
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password
    await db.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    // Delete the reset token
    await db.passwordReset.delete({ where: { id: resetToken.id } });

    // Invalidate all existing sessions for this user
    await db.session.deleteMany({ where: { userId: resetToken.userId } });

    return NextResponse.json({ message: 'Password has been reset successfully' });
  } catch (error: any) {
    console.error('[auth] Password reset failed:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
