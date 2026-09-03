import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createBackup, restoreBackup, getBackupStats } from '@/lib/operations/backup.service';
import type { BackupData } from '@/lib/operations/backup.service';

// GET — export all data as downloadable JSON backup
export async function GET(req: NextRequest) {
  try {
    await requirePermission('site.manage');

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = await getBackupStats();
      return NextResponse.json(stats);
    }

    const backup = await createBackup();

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Backup failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST — import data from uploaded JSON backup
export async function POST(req: NextRequest) {
  try {
    await requirePermission('site.manage');

    const body = await req.json();
    const { backup } = body as { backup?: BackupData };

    if (!backup || !backup.data || !backup.version) {
      return NextResponse.json(
        { error: 'Invalid backup format. Expected { version, data }.' },
        { status: 400 }
      );
    }

    const result = await restoreBackup(backup);

    return NextResponse.json({
      message: 'Backup restore completed',
      imported: result.imported,
      errors: result.errors,
      totalImported: Object.values(result.imported).reduce((a, b) => a + b, 0),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Restore failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
