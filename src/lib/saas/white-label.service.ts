import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────

export interface ClientPortal {
  id: string;
  organizationId: string;
  clientId: string;
  siteId: string;
  clientName: string;
  clientEmail: string;
  branding: {
    logo: string | null;
    primaryColor: string;
    secondaryColor: string;
    customDomain: string | null;
  };
  permissions: string[];
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ClientBranding {
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  customDomain: string | null;
  favicon: string | null;
  footerText: string;
  loginPageTitle: string;
}

// ─── Client Management ──────────────────────────────────────

const CLIENT_PORTALS = new Map<string, ClientPortal>();

export async function createClientPortal(data: {
  organizationId: string;
  siteId: string;
  clientName: string;
  clientEmail: string;
  branding?: Partial<ClientBranding>;
}): Promise<ClientPortal> {
  // Verify site and org exist
  const site = await db.site.findUnique({ where: { id: data.siteId } });
  if (!site) throw new Error('Site not found');

  const portal: ClientPortal = {
    id: `portal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    organizationId: data.organizationId,
    clientId: `client-${Date.now()}`,
    siteId: data.siteId,
    clientName: data.clientName,
    clientEmail: data.clientEmail,
    branding: {
      logo: data.branding?.logo || null,
      primaryColor: data.branding?.primaryColor || '#6366f1',
      secondaryColor: data.branding?.secondaryColor || '#8b5cf6',
      customDomain: data.branding?.customDomain || null,
    },
    permissions: ['articles.view', 'articles.edit', 'analytics.view'],
    status: 'INVITED',
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  };

  CLIENT_PORTALS.set(portal.id, portal);

  // Record as an audit entry
  await db.auditLog.create({
    data: {
      siteId: data.siteId,
      action: 'CLIENT_INVITED',
      resource: 'ClientPortal',
      resourceId: portal.id,
      metadata: JSON.stringify({ clientName: data.clientName, clientEmail: data.clientEmail }),
    },
  });

  return portal;
}

export async function getClientPortals(organizationId: string): Promise<ClientPortal[]> {
  return Array.from(CLIENT_PORTALS.values()).filter((p) => p.organizationId === organizationId);
}

export async function updateClientBranding(
  portalId: string,
  branding: Partial<ClientBranding>,
): Promise<ClientPortal | null> {
  const portal = CLIENT_PORTALS.get(portalId);
  if (!portal) return null;

  portal.branding = { ...portal.branding, ...branding };
  return portal;
}

export async function updateClientPermissions(
  portalId: string,
  permissions: string[],
): Promise<ClientPortal | null> {
  const portal = CLIENT_PORTALS.get(portalId);
  if (!portal) return null;

  portal.permissions = permissions;
  return portal;
}

export async function disableClientPortal(portalId: string): Promise<boolean> {
  const portal = CLIENT_PORTALS.get(portalId);
  if (!portal) return false;

  portal.status = 'DISABLED';
  return true;
}

// ─── White-Label Configuration ──────────────────────────────

export interface WhiteLabelConfig {
  siteId: string;
  customDomain: string | null;
  branding: ClientBranding;
  removePoweredBy: boolean;
  customEmailDomain: string | null;
  supportEmail: string | null;
  termsUrl: string | null;
  privacyUrl: string | null;
}

const WHITE_LABEL_CONFIGS = new Map<string, WhiteLabelConfig>();

export async function getWhiteLabelConfig(siteId: string): Promise<WhiteLabelConfig> {
  const existing = WHITE_LABEL_CONFIGS.get(siteId);
  if (existing) return existing;

  const site = await db.site.findUnique({ where: { id: siteId } });

  const config: WhiteLabelConfig = {
    siteId,
    customDomain: site?.domain || null,
    branding: {
      logo: null,
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      customDomain: site?.domain || null,
      favicon: null,
      footerText: '',
      loginPageTitle: `${site?.name || 'Blog'} Dashboard`,
    },
    removePoweredBy: false,
    customEmailDomain: null,
    supportEmail: null,
    termsUrl: null,
    privacyUrl: null,
  };

  WHITE_LABEL_CONFIGS.set(siteId, config);
  return config;
}

export async function updateWhiteLabelConfig(
  siteId: string,
  updates: Partial<WhiteLabelConfig>,
): Promise<WhiteLabelConfig> {
  const config = await getWhiteLabelConfig(siteId);
  Object.assign(config, updates);
  WHITE_LABEL_CONFIGS.set(siteId, config);
  return config;
}

// ─── Multi-Site Dashboard ───────────────────────────────────

export async function getAgencyDashboard(organizationId: string): Promise<{
  sites: { id: string; name: string; domain: string | null; healthScore: number | null; articleCount: number }[];
  totalClients: number;
  totalArticles: number;
  totalRevenue: number;
}> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    include: { sites: true },
  });

  if (!org) throw new Error('Organization not found');

  const sites = await Promise.all(
    org.sites.map(async (site) => {
      const articleCount = await db.article.count({ where: { siteId: site.id } });
      return {
        id: site.id,
        name: site.name,
        domain: site.domain,
        healthScore: site.healthScore,
        articleCount,
      };
    }),
  );

  return {
    sites,
    totalClients: CLIENT_PORTALS.size,
    totalArticles: sites.reduce((s, site) => s + site.articleCount, 0),
    totalRevenue: 0,
  };
}
