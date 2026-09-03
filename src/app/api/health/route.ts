import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
  const startTime = Date.now();

  // Database check
  const dbStart = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latencyMs: Date.now() - dbStart };
  } catch (error) {
    checks.database = {
      status: 'unhealthy',
      latencyMs: Date.now() - dbStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Article count check
  try {
    const articleCount = await db.article.count();
    checks.articles = { status: 'ok', latencyMs: 0 };
    (checks.articles as Record<string, unknown>).count = articleCount;
  } catch (error) {
    checks.articles = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Feed count check
  try {
    const feedCount = await db.rssFeed.count({ where: { isActive: true } });
    checks.feeds = { status: 'ok', latencyMs: 0 };
    (checks.feeds as Record<string, unknown>).activeCount = feedCount;
  } catch (error) {
    checks.feeds = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  const totalLatencyMs = Date.now() - startTime;
  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy' || c.status === 'ok');

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      version: process.env.npm_package_version || 'unknown',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      totalLatencyMs,
      checks,
    },
    { status: allHealthy ? 200 : 503 }
  );
}
