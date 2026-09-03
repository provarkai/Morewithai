import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';

// GET all settings for a site
export async function GET(req: NextRequest) {
  try {
    await requirePermission('settings.read');
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get('siteId');

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const settings = await db.setting.findMany({ where: { siteId } });
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    return NextResponse.json(settingsMap);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST save settings (upsert) for a site
export async function POST(req: NextRequest) {
  try {
    await requirePermission('settings.write');
    const body = await req.json();
    const { settings, siteId } = body;

    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'settings object is required' }, { status: 400 });
    }

    for (const [key, value] of Object.entries(settings)) {
      await db.setting.upsert({
        where: { key_siteId: { key, siteId } },
        update: { value: String(value) },
        create: { key, value: String(value), siteId },
      });
    }

    return NextResponse.json({ message: 'Settings saved successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}

// DELETE a setting for a site
export async function DELETE(req: NextRequest) {
  try {
    await requirePermission('settings.write');
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    const siteId = searchParams.get('siteId');

    if (!key || !siteId) {
      return NextResponse.json({ error: 'key and siteId are required' }, { status: 400 });
    }

    await db.setting.delete({ where: { key_siteId: { key, siteId } } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete setting' }, { status: 500 });
  }
}
