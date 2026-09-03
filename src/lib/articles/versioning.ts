import { db } from '@/lib/db';

export async function createVersion({
  articleId,
  title,
  content,
  excerpt,
  createdById,
  changeReason,
}: {
  articleId: string;
  title: string;
  content: string;
  excerpt?: string | null;
  createdById?: string | null;
  changeReason?: string;
}) {
  // Get the current max version number
  const maxVersion = await db.articleVersion.aggregate({
    where: { articleId },
    _max: { versionNumber: true },
  });
  const nextVersion = (maxVersion._max.versionNumber || 0) + 1;

  return db.articleVersion.create({
    data: {
      articleId,
      versionNumber: nextVersion,
      title,
      excerpt: excerpt || null,
      content,
      createdById: createdById || null,
      changeReason: changeReason || null,
    },
  });
}

export async function getVersions(articleId: string) {
  return db.articleVersion.findMany({
    where: { articleId },
    orderBy: { versionNumber: 'desc' },
    take: 50,
  });
}

export async function getVersion(articleId: string, versionId: string) {
  return db.articleVersion.findFirst({
    where: { id: versionId, articleId },
  });
}

export async function restoreVersion(articleId: string, versionId: string, restoredById?: string) {
  const version = await db.articleVersion.findUnique({ where: { id: versionId } });
  if (!version || version.articleId !== articleId) {
    throw new Error('Version not found');
  }

  // Create a version of the current state BEFORE restoring
  const currentArticle = await db.article.findUnique({ where: { id: articleId } });
  if (currentArticle) {
    await createVersion({
      articleId,
      title: currentArticle.rewrittenTitle || currentArticle.title,
      content: currentArticle.rewrittenContent || currentArticle.originalContent,
      excerpt: currentArticle.excerpt,
      createdById: restoredById,
      changeReason: `Auto-saved before restoring version ${version.versionNumber}`,
    });
  }

  // Restore the version content
  await db.article.update({
    where: { id: articleId },
    data: {
      rewrittenTitle: version.title,
      rewrittenContent: version.content,
      excerpt: version.excerpt,
    },
  });

  return version;
}

export async function compareVersions(versionId1: string, versionId2: string) {
  const [v1, v2] = await Promise.all([
    db.articleVersion.findUnique({ where: { id: versionId1 } }),
    db.articleVersion.findUnique({ where: { id: versionId2 } }),
  ]);
  if (!v1 || !v2) throw new Error('Version not found');

  // Simple text diff: return added/removed line counts
  const lines1 = v1.content.split('\n');
  const lines2 = v2.content.split('\n');
  const set1 = new Set(lines1);
  const set2 = new Set(lines2);
  const added = [...set2].filter((l) => !set1.has(l)).length;
  const removed = [...set1].filter((l) => !set2.has(l)).length;

  return { v1, v2, added, removed, totalLinesV1: lines1.length, totalLinesV2: lines2.length };
}
