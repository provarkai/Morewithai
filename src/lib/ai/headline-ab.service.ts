import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from '@/lib/ai/client';

// ─── Types ──────────────────────────────────────────────────

export interface HeadlineVariant {
  id: string;
  text: string;
  impressions: number;
  clicks: number;
  ctr: number;
  isWinner: boolean;
  isCurrent: boolean;
}

export interface HeadlineABTest {
  id: string;
  articleId: string;
  status: 'RUNNING' | 'COMPLETED' | 'CANCELLED';
  variants: HeadlineVariant[];
  winnerId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  config: {
    testDurationHours: number;
    minImpressions: number;
    confidenceLevel: number;
  };
}

// ─── AI Headline Generation ─────────────────────────────────

const HEADLINE_SYSTEM = `You are an expert copywriter and headline optimizer. Generate 4 compelling headline variants for an article.
Rules:
- Each headline must be unique in approach (curiosity, benefit, how-to, list, question, urgency)
- Keep headlines under 65 characters for SEO
- Use power words and emotional triggers
- Include the target keyword naturally
- Return ONLY a JSON array of 4 headline strings, no explanations.
Example: ["Headline 1", "Headline 2", "Headline 3", "Headline 4"]`;

export async function generateHeadlineVariants(
  articleId: string,
  siteId: string,
): Promise<string[]> {
  const article = await db.article.findFirst({
    where: { id: articleId, siteId },
    select: {
      title: true,
      rewrittenTitle: true,
      primaryKeyword: true,
      excerpt: true,
      rewrittenContent: true,
      originalContent: true,
    },
  });

  if (!article) throw new Error('Article not found');

  const title = article.rewrittenTitle || article.title;
  const content = (article.rewrittenContent || article.originalContent || '').slice(0, 2000);

  const userPrompt = `Generate 4 headline variants for this article:\n\nARTICLE TITLE: ${title}\n${article.primaryKeyword ? `TARGET KEYWORD: ${article.primaryKeyword}\n` : ''}${article.excerpt ? `EXCERPT: ${article.excerpt}\n` : ''}\nCONTENT PREVIEW:\n${content}`;

  const result = await callAI({
    siteId,
    articleId,
    jobType: 'HEADLINE_GENERATION',
    systemPrompt: HEADLINE_SYSTEM,
    userPrompt,
    temperature: 0.8,
    maxTokens: 500,
  });
  const raw = result.content;

  try {
    const match = raw.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return parsed.slice(0, 4);
      }
    }
  } catch {
    // Fallback: split by newlines
  }

  const lines = cleanAIResponse(raw).split('\n').filter((l) => l.trim().length > 5);
  return lines.slice(0, 4).map((l) => l.replace(/^\d+[\.\)]\s*/, '').replace(/^["']|["']$/g, ''));
}

// ─── A/B Test Management ────────────────────────────────────

export async function createHeadlineABTest(
  articleId: string,
  siteId: string,
  customVariants?: string[],
): Promise<HeadlineABTest> {
  const variantTexts = customVariants || await generateHeadlineVariants(articleId, siteId);

  if (variantTexts.length < 2) {
    throw new Error('At least 2 headline variants are required');
  }

  // Ensure a CTA exists for headline testing
  let cta = await db.callToAction.findFirst({
    where: { siteId, name: `headline-ab-cta-${articleId}` },
  });

  if (!cta) {
    cta = await db.callToAction.create({
      data: {
        siteId,
        name: `headline-ab-cta-${articleId}`,
        type: 'HEADLINE_AB',
        headline: variantTexts[0],
        description: `A/B test for article ${articleId}`,
        buttonText: 'Learn More',
        targetPlacement: 'INLINE',
      },
    });
  }

  // Create the experiment
  const experiment = await db.ctaExperiment.create({
    data: {
      siteId,
      ctaId: cta.id,
      name: `headline-ab-${articleId}`,
      status: 'RUNNING',
      startDate: new Date(),
    },
  });

  // Create variant entries
  for (let i = 0; i < variantTexts.length; i++) {
    await db.ctaVariant.create({
      data: {
        experimentId: experiment.id,
        name: `Variant ${i + 1}`,
        headline: variantTexts[i],
        buttonText: 'Learn More',
        buttonUrl: '#',
        isControl: i === 0,
      },
    });
  }

  const variants: HeadlineVariant[] = variantTexts.map((text, i) => ({
    id: `${experiment.id}-v${i}`,
    text,
    impressions: 0,
    clicks: 0,
    ctr: 0,
    isWinner: false,
    isCurrent: i === 0,
  }));

  return {
    id: experiment.id,
    articleId,
    status: 'RUNNING',
    variants,
    winnerId: null,
    startedAt: experiment.startDate.toISOString(),
    completedAt: null,
    config: {
      testDurationHours: 48,
      minImpressions: 100,
      confidenceLevel: 95,
    },
  };
}

export async function getHeadlineABTest(
  articleId: string,
  siteId: string,
): Promise<HeadlineABTest | null> {
  const experiment = await db.ctaExperiment.findFirst({
    where: {
      siteId,
      name: `headline-ab-${articleId}`,
    },
    include: { variants: true },
    orderBy: { createdAt: 'desc' },
  });

  if (!experiment) return null;

  const variants: HeadlineVariant[] = experiment.variants.map((v, i) => ({
    id: v.id,
    text: v.headline,
    impressions: v.impressionCount,
    clicks: v.clickCount,
    ctr: v.impressionCount > 0 ? (v.clickCount / v.impressionCount) * 100 : 0,
    isWinner: experiment.winnerVariantId === v.id,
    isCurrent: i === 0,
  }));

  return {
    id: experiment.id,
    articleId,
    status: experiment.status as HeadlineABTest['status'],
    variants,
    winnerId: experiment.winnerVariantId,
    startedAt: experiment.startDate.toISOString(),
    completedAt: experiment.endDate?.toISOString() || null,
    config: {
      testDurationHours: 48,
      minImpressions: 100,
      confidenceLevel: 95,
    },
  };
}

export async function completeHeadlineABTest(
  experimentId: string,
): Promise<{ winnerId: string; winnerText: string }> {
  const experiment = await db.ctaExperiment.findUnique({
    where: { id: experimentId },
    include: { variants: true },
  });

  if (!experiment) throw new Error('Test not found');

  // Find the winner (highest CTR with minimum impressions)
  let winner = experiment.variants[0];
  for (const v of experiment.variants) {
    const vCtr = v.impressionCount > 0 ? (v.clickCount / v.impressionCount) * 100 : 0;
    const wCtr = winner.impressionCount > 0 ? (winner.clickCount / winner.impressionCount) * 100 : 0;
    if (vCtr > wCtr || (vCtr === wCtr && v.impressionCount > winner.impressionCount)) {
      winner = v;
    }
  }

  await db.ctaExperiment.update({
    where: { id: experimentId },
    data: {
      status: 'COMPLETED',
      endDate: new Date(),
      winnerVariantId: winner.id,
    },
  });

  return {
    winnerId: winner.id,
    winnerText: winner.headline,
  };
}
