import { db } from '@/lib/db';

export interface BackupData {
  version: string;
  exportedAt: string;
  counts: Record<string, number>;
  data: Record<string, unknown[]>;
}

// All exportable models in dependency-safe order (children first)
const EXPORT_MODELS = [
  'user',
  'session',
  'author',
  'category',
  'tag',
  'site',
  'rssFeed',
  'articleTag',
  'articleVersion',
  'articleSource',
  'seoAnalysis',
  'contentScore',
  'internalLinkRecommendation',
  'contentRefresh',
  'aiJob',
  'article',
  'setting',
  'automationLog',
  'subscriber',
  'lead',
  'leadMagnet',
  'emailCampaign',
  'emailEvent',
  'emailAutomation',
  'ctaPlacement',
  'ctaExperiment',
  'callToAction',
  'affiliateProgram',
  'affiliateOffer',
  'affiliateClick',
  'product',
  'productPurchase',
  'adPlacement',
  'adEvent',
  'revenueEvent',
  'revenueAdjustment',
  'trafficMetric',
  'searchMetric',
  'conversionEvent',
  'contentOpportunity',
  'growthRecommendation',
  'topicCluster',
  'clusterArticle',
  'socialPost',
  'socialTemplate',
  'contentCalendarEvent',
  'automationRule',
  'organization',
  'organizationMember',
  'plan',
  'subscription',
  'usageRecord',
  'contentJob',
  'approvalTask',
  'scheduledTask',
  'auditLog',
  'webhook',
  'webhookEvent',
  'apiKey',
  'featureFlag',
  'siteFeatureFlag',
  'costEvent',
  'media',
  'landingPage',
] as const;

type ModelName = (typeof EXPORT_MODELS)[number];

async function exportAll(): Promise<BackupData> {
  const counts: Record<string, number> = {};
  const data: Record<string, unknown[]> = {};

  for (const modelName of EXPORT_MODELS) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (db as any)[modelName];
      if (!model || typeof model.findMany !== 'function') continue;
      const rows = await model.findMany();
      data[modelName] = rows;
      counts[modelName] = rows.length;
    } catch {
      // Model may not exist in current schema
      counts[modelName] = 0;
    }
  }

  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    counts,
    data,
  };
}

async function importData(backup: BackupData): Promise<{ imported: Record<string, number>; errors: string[] }> {
  const imported: Record<string, number> = {};
  const errors: string[] = [];

  for (const modelName of EXPORT_MODELS) {
    const rows = backup.data[modelName];
    if (!rows || !Array.isArray(rows) || rows.length === 0) continue;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (db as any)[modelName];
      if (!model || typeof model.createMany !== 'function') {
        errors.push(`Model ${modelName} not available`);
        continue;
      }

      // Strip _id fields that Prisma auto-generates
      const cleanRows = (rows as Record<string, unknown>[]).map((row) => {
        const clean: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(row)) {
          if (key === 'id' || key === '_id' || key.startsWith('_')) continue;
          clean[key] = val;
        }
        return clean;
      });

      const result = await model.createMany({ data: cleanRows, skipDuplicates: true });
      imported[modelName] = result.count;
    } catch (error) {
      errors.push(`${modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { imported, errors };
}

export async function createBackup(): Promise<BackupData> {
  return await exportAll();
}

export async function restoreBackup(backup: BackupData): Promise<{ imported: Record<string, number>; errors: string[] }> {
  return await importData(backup);
}

export async function getBackupStats(): Promise<{ models: { name: string; count: number }[]; totalRecords: number }> {
  const models: { name: string; count: number }[] = [];
  let totalRecords = 0;

  for (const modelName of EXPORT_MODELS) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const model = (db as any)[modelName];
      if (!model || typeof model.count !== 'function') continue;
      const count = await model.count();
      models.push({ name: modelName, count });
      totalRecords += count;
    } catch {
      // Skip
    }
  }

  return { models, totalRecords };
}
