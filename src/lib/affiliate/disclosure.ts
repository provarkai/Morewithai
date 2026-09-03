import { db } from '@/lib/db';

const DEFAULT_DISCLOSURE =
  'This article may contain affiliate links. If you purchase through a link, we may earn a commission at no additional cost to you.';

// ─── Get Default Disclosure ───────────────────────────────────

export function getDefaultDisclosure(): string {
  return DEFAULT_DISCLOSURE;
}

// ─── Get Disclosure Text for Site ─────────────────────────────

export async function getDisclosureText(siteId: string): Promise<string> {
  const setting = await db.setting.findUnique({
    where: { key_siteId: { key: 'affiliate_disclosure', siteId } },
  });

  return setting?.value ?? DEFAULT_DISCLOSURE;
}
