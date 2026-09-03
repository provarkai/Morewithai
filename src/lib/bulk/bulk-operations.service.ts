import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────

export type BulkAction =
  | 'UPDATE_CATEGORY'
  | 'ADD_TAGS'
  | 'REMOVE_TAGS'
  | 'UPDATE_STATUS'
  | 'REGENERATE_SEO'
  | 'SCHEDULE'
  | 'DELETE'
  | 'EXPORT';

export interface BulkOperation {
  id: string;
  siteId: string;
  action: BulkAction;
  articleIds: string[];
  params: Record<string, unknown>;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalArticles: number;
  processedArticles: number;
  failedArticles: number;
  errors: string[];
  startedAt: string;
  completedAt?: string;
}

// ─── In-memory operation tracking ───────────────────────────

const ACTIVE_OPERATIONS = new Map<string, BulkOperation>();

// ─── Core Operations ────────────────────────────────────────

export async function executeBulkAction(
  siteId: string,
  action: BulkAction,
  articleIds: string[],
  params: Record<string, unknown>,
): Promise<BulkOperation> {
  const operation: BulkOperation = {
    id: `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    siteId,
    action,
    articleIds,
    params,
    status: 'RUNNING',
    totalArticles: articleIds.length,
    processedArticles: 0,
    failedArticles: 0,
    errors: [],
    startedAt: new Date().toISOString(),
  };

  ACTIVE_OPERATIONS.set(operation.id, operation);

  // Process asynchronously
  processOperation(operation).catch(() => {
    operation.status = 'FAILED';
    operation.completedAt = new Date().toISOString();
  });

  return operation;
}

async function processOperation(op: BulkOperation): Promise<void> {
  for (const articleId of op.articleIds) {
    try {
      switch (op.action) {
        case 'UPDATE_CATEGORY':
          await db.article.update({
            where: { id: articleId },
            data: { categoryId: op.params.categoryId as string },
          });
          break;

        case 'ADD_TAGS': {
          const tagNames = (op.params.tagNames as string[]) || [];
          for (const tagName of tagNames) {
            const slug = tagName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const tag = await db.tag.upsert({
              where: { slug_siteId: { slug, siteId: op.siteId } },
              create: { siteId: op.siteId, name: tagName, slug },
              update: {},
            });
            await db.articleTag.upsert({
              where: { articleId_tagId: { articleId, tagId: tag.id } },
              create: { articleId, tagId: tag.id },
              update: {},
            });
          }
          break;
        }

        case 'REMOVE_TAGS': {
          const removeTagNames = (op.params.tagNames as string[]) || [];
          const tags = await db.tag.findMany({
            where: { siteId: op.siteId, name: { in: removeTagNames } },
          });
          await db.articleTag.deleteMany({
            where: { articleId, tagId: { in: tags.map((t) => t.id) } },
          });
          break;
        }

        case 'UPDATE_STATUS':
          await db.article.update({
            where: { id: articleId },
            data: { status: op.params.status as string },
          });
          break;

        case 'SCHEDULE':
          await db.article.update({
            where: { id: articleId },
            data: {
              scheduledAt: new Date(op.params.scheduledDate as string),
            },
          });
          break;

        case 'DELETE':
          await db.article.delete({ where: { id: articleId } });
          break;

        default:
          break;
      }
      op.processedArticles++;
    } catch (err: unknown) {
      op.failedArticles++;
      op.errors.push(`${articleId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  op.status = op.failedArticles > 0 ? 'COMPLETED' : 'COMPLETED';
  op.completedAt = new Date().toISOString();
}

export function getBulkOperation(id: string): BulkOperation | null {
  return ACTIVE_OPERATIONS.get(id) || null;
}

export function listBulkOperations(siteId: string): BulkOperation[] {
  return Array.from(ACTIVE_OPERATIONS.values()).filter((op) => op.siteId === siteId);
}

// ─── Bulk Selection Helpers ─────────────────────────────────

export interface BulkSelectParams {
  siteId: string;
  status?: string;
  categoryId?: string;
  tagId?: string;
  olderThanDays?: number;
  hasTraffic?: boolean;
  limit?: number;
}

export async function selectArticlesForBulk(params: BulkSelectParams): Promise<{ id: string; title: string; status: string }[]> {
  const where: any = { siteId: params.siteId };

  if (params.status) where.status = params.status;
  if (params.categoryId) where.categoryId = params.categoryId;
  if (params.olderThanDays) {
    where.createdAt = { lt: new Date(Date.now() - params.olderThanDays * 24 * 60 * 60 * 1000) };
  }

  const articles = await db.article.findMany({
    where,
    select: { id: true, title: true, rewrittenTitle: true, status: true },
    take: params.limit || 200,
    orderBy: { createdAt: 'desc' },
  });

  return articles.map((a) => ({ id: a.id, title: a.rewrittenTitle || a.title, status: a.status }));
}
