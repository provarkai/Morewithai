import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from '@/lib/ai/client';

// ─── Types ──────────────────────────────────────────────────

export interface ContentBrief {
  id: string;
  topic: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  targetWordCount: number;
  suggestedTitle: string;
  metaDescription: string;
  outline: BriefOutlineSection[];
  competitorAnalysis: CompetitorInsight[];
  serpFeatures: string[];
  searchIntent: string;
  audienceProfile: string;
  tone: string;
  faqs: { question: string; answer: string }[];
  internalLinkTargets: string[];
  callToAction: string;
  estimatedDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
  estimatedTraffic: string;
  generatedAt: string;
}

export interface BriefOutlineSection {
  heading: string;
  level: number;
  keyPoints: string[];
  estimatedWords: number;
  targetKeyword: string;
}

export interface CompetitorInsight {
  domain: string;
  title: string;
  wordCount: number;
  keyTopics: string[];
  gaps: string[];
  strengths: string[];
}

// ─── Brief Generation ───────────────────────────────────────

const BRIEF_SYSTEM = `You are a world-class content strategist and SEO expert. Generate comprehensive content briefs that help writers create high-ranking, valuable articles.

Your briefs should be data-driven, specific, and actionable. Include competitor analysis, SERP insights, and a detailed outline with word count estimates.`;

export async function generateContentBrief(
  topic: string,
  siteId: string,
  options?: {
    targetAudience?: string;
    brandVoice?: string;
    niche?: string;
    existingArticleId?: string;
  },
): Promise<ContentBrief> {
  const userPrompt = `Generate a comprehensive content brief for the topic: "${topic}"

${options?.targetAudience ? `Target Audience: ${options.targetAudience}` : ''}
${options?.brandVoice ? `Brand Voice: ${options.brandVoice}` : ''}
${options?.niche ? `Niche: ${options.niche}` : ''}

Return a JSON object with this exact structure:
{
  "topic": "${topic}",
  "targetKeyword": "primary keyword",
  "secondaryKeywords": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "targetWordCount": 2000,
  "suggestedTitle": "SEO-optimized title",
  "metaDescription": "Under 160 chars meta description",
  "outline": [
    {
      "heading": "H2 Section Title",
      "level": 2,
      "keyPoints": ["point 1", "point 2"],
      "estimatedWords": 300,
      "targetKeyword": "section keyword"
    }
  ],
  "competitorAnalysis": [
    {
      "domain": "example.com",
      "title": "Competitor Article Title",
      "wordCount": 1500,
      "keyTopics": ["topic1", "topic2"],
      "gaps": ["missing angle 1"],
      "strengths": ["good coverage of X"]
    }
  ],
  "serpFeatures": ["featured snippet opportunity", "People Also Ask", "video results"],
  "searchIntent": "informational",
  "audienceProfile": "Description of the target reader",
  "tone": "professional yet accessible",
  "faqs": [
    {"question": "Common question?", "answer": "Brief answer for FAQ schema"}
  ],
  "internalLinkTargets": ["related topic 1", "related topic 2"],
  "callToAction": "Suggested CTA for the article",
  "estimatedDifficulty": "MEDIUM",
  "estimatedTraffic": "500-1000 monthly searches"
}

Return ONLY the JSON, no explanations.`;

  const result = await callAI({
    siteId,
    jobType: 'CONTENT_BRIEF',
    systemPrompt: BRIEF_SYSTEM,
    userPrompt,
    temperature: 0.4,
    maxTokens: 3000,
    responseFormat: 'json',
  });

  let brief: Omit<ContentBrief, 'id' | 'generatedAt'>;
  try {
    const match = result.content.match(/\{[\s\S]*\}/);
    if (match) {
      brief = JSON.parse(match[0]);
    } else {
      throw new Error('No JSON found');
    }
  } catch {
    // Fallback minimal brief
    brief = {
      topic,
      targetKeyword: topic.toLowerCase(),
      secondaryKeywords: [],
      targetWordCount: 1500,
      suggestedTitle: topic,
      metaDescription: `Learn about ${topic} in this comprehensive guide.`,
      outline: [
        { heading: `What is ${topic}?`, level: 2, keyPoints: ['Definition', 'Context'], estimatedWords: 200, targetKeyword: topic },
        { heading: `How ${topic} Works`, level: 2, keyPoints: ['Mechanism', 'Examples'], estimatedWords: 400, targetKeyword: topic },
        { heading: 'Benefits', level: 2, keyPoints: ['Key advantages'], estimatedWords: 300, targetKeyword: `${topic} benefits` },
        { heading: 'Getting Started', level: 2, keyPoints: ['Steps', 'Resources'], estimatedWords: 400, targetKeyword: `${topic} guide` },
      ],
      competitorAnalysis: [],
      serpFeatures: [],
      searchIntent: 'informational',
      audienceProfile: 'General audience',
      tone: 'professional',
      faqs: [],
      internalLinkTargets: [],
      callToAction: 'Sign up for more insights',
      estimatedDifficulty: 'MEDIUM',
      estimatedTraffic: 'Unknown',
    };
  }

  return {
    id: `brief-${Date.now()}`,
    ...brief,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates a brief based on an existing article that needs improvement.
 */
export async function generateBriefFromArticle(
  articleId: string,
  siteId: string,
): Promise<ContentBrief> {
  const article = await db.article.findFirst({
    where: { id: articleId, siteId },
    select: {
      title: true,
      rewrittenTitle: true,
      rewrittenContent: true,
      originalContent: true,
      primaryKeyword: true,
      secondaryKeywords: true,
      excerpt: true,
      seoTitle: true,
      seoDescription: true,
      slug: true,
      category: { select: { name: true } },
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  if (!article) throw new Error('Article not found');

  const content = (article.rewrittenContent || article.originalContent || '').slice(0, 3000);
  const tags = article.tags.map((t) => t.tag.name).join(', ');

  const userPrompt = `Analyze this existing article and generate an improved content brief.

CURRENT TITLE: "${article.rewrittenTitle || article.title}"
${article.primaryKeyword ? `PRIMARY KEYWORD: ${article.primaryKeyword}` : ''}
${article.category ? `CATEGORY: ${article.category.name}` : ''}
${tags ? `TAGS: ${tags}` : ''}
EXCERPT: ${article.excerpt || 'none'}

CONTENT:
${content}

Generate a content brief that:
1. Identifies weaknesses in the current article
2. Suggests a better structure and more comprehensive outline
3. Adds missing sections the competitors cover
4. Improves the keyword strategy
5. Adds FAQ opportunities

Return the same JSON structure as a standard content brief.`;

  const result = await callAI({
    siteId,
    articleId,
    jobType: 'CONTENT_BRIEF_IMPROVEMENT',
    systemPrompt: BRIEF_SYSTEM,
    userPrompt,
    temperature: 0.4,
    maxTokens: 3000,
    responseFormat: 'json',
  });

  let brief: Omit<ContentBrief, 'id' | 'generatedAt'>;
  try {
    const match = result.content.match(/\{[\s\S]*\}/);
    if (match) {
      brief = JSON.parse(match[0]);
    } else {
      throw new Error('No JSON found');
    }
  } catch {
    return generateContentBrief(article.rewrittenTitle || article.title, siteId);
  }

  return {
    id: `brief-${articleId}-${Date.now()}`,
    ...brief,
    generatedAt: new Date().toISOString(),
  };
}
