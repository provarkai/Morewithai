import { z } from 'zod';

// Research Result Schema
export const ResearchResultSchema = z.object({
  mainTopic: z.string(),
  keyFacts: z.array(z.string()),
  claims: z.array(z.string()),
  entities: z.array(z.string()),
  dates: z.array(z.string()).optional(),
  statistics: z.array(z.string()).optional(),
  contentGaps: z.array(z.string()),
  potentialAngles: z.array(z.string()),
});

export type ResearchResult = z.infer<typeof ResearchResultSchema>;

// Outline Section Schema (recursive)
export const OutlineSectionSchema: z.ZodType<{
  level: 'h1' | 'h2' | 'h3';
  text: string;
  children?: Array<{
    level: 'h1' | 'h2' | 'h3';
    text: string;
    children?: any[];
  }>;
}> = z.lazy(() =>
  z.object({
    level: z.enum(['h1', 'h2', 'h3']),
    text: z.string(),
    children: z.array(z.lazy(() => OutlineSectionSchema)).optional(),
  })
);

export type OutlineSection = z.infer<typeof OutlineSectionSchema>;

// Outline Result Schema
export const OutlineResultSchema = z.object({
  sections: z.array(OutlineSectionSchema),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  conclusion: z.string().optional(),
});

export type OutlineResult = z.infer<typeof OutlineResultSchema>;

// Generated Article Schema
export const GeneratedArticleSchema = z.object({
  title: z.string(),
  content: z.string().min(100),
  excerpt: z.string().optional(),
  primaryKeyword: z.string().optional(),
  secondaryKeywords: z.array(z.string()).optional(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
});

export type GeneratedArticle = z.infer<typeof GeneratedArticleSchema>;

// SEO Analysis Result Schema
export const SeoAnalysisResultSchema = z.object({
  primaryKeyword: z.string(),
  secondaryKeywords: z.array(z.string()),
  searchIntent: z.enum(['informational', 'navigational', 'commercial', 'transactional']),
  titleScore: z.number().min(0).max(10),
  metaScore: z.number().min(0).max(10),
  keywordScore: z.number().min(0).max(10),
  structureScore: z.number().min(0).max(10),
  linkScore: z.number().min(0).max(10),
  schemaScore: z.number().min(0).max(10),
  readabilityScore: z.number().min(0).max(10),
  overallScore: z.number().min(0).max(100),
  recommendations: z.array(z.string()).optional(),
});

export type SeoAnalysisResult = z.infer<typeof SeoAnalysisResultSchema>;

// Quality Score Result Schema
export const QualityScoreResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  contentScore: z.number().min(0).max(100),
  readabilityScore: z.number().min(0).max(100),
  accuracyScore: z.number().min(0).max(100),
  originalityScore: z.number().min(0).max(100),
  engagementScore: z.number().min(0).max(100),
  structureScore: z.number().min(0).max(100),
  seoScore: z.number().min(0).max(100),
  depthScore: z.number().min(0).max(100),
  recommendations: z.array(z.string()).optional(),
});

export type QualityScoreResult = z.infer<typeof QualityScoreResultSchema>;

// Internal Link Recommendation Schema
export const InternalLinkRecommendationSchema = z.object({
  targetArticleId: z.string(),
  title: z.string(),
  relevanceScore: z.number().min(0).max(100),
  suggestedAnchor: z.string(),
  reason: z.string(),
});

export type InternalLinkRecommendation = z.infer<typeof InternalLinkRecommendationSchema>;

// Taxonomy Result Schema
export const TaxonomyResultSchema = z.object({
  recommendedCategory: z.string().optional(),
  recommendedTags: z.array(z.string()).optional(),
});

export type TaxonomyResult = z.infer<typeof TaxonomyResultSchema>;

// Parse AI Response helper
export function parseAIResponse<T>(response: string, schema: z.ZodSchema<T>): T {
  // Clean ```json fences
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  const parsed = JSON.parse(cleaned);
  return schema.parse(parsed);
}
