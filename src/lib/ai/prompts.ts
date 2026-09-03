import type { GenerationMode, Tone, Audience, Length } from './types';

export function getResearchPrompt(data: { title: string; content: string; sourceUrl?: string; siteName?: string }): string {
  return 'You are a research analyst. Analyze the following source article and extract structured research data.\n\nSource Title: ' + data.title + '\n' + (data.sourceUrl ? 'Source URL: ' + data.sourceUrl + '\n' : '') + (data.siteName ? 'Site Context: ' + data.siteName + '\n' : '') + '\nSource Content:\n' + data.content.slice(0, 3000) + '\n\nExtract and return a JSON object with:\n- mainTopic: The core topic (string)\n- keyFacts: Array of important factual claims\n- claims: Array of main arguments\n- entities: Array of named entities (people, companies, products)\n- contentGaps: Array of topics NOT covered that a reader would want to know\n- potentialAngles: Array of 3-5 unique angles for an original article\n\nRespond with ONLY valid JSON, no markdown wrapping.';
}

export function getOutlinePrompt(data: { topic: string; angle?: string; research?: string; primaryKeyword?: string; mode?: GenerationMode }): string {
  return 'You are an expert content editor. Generate a detailed article outline.\n\nTopic: ' + data.topic + '\n' + (data.angle ? 'Angle: ' + data.angle + '\n' : '') + (data.primaryKeyword ? 'Primary keyword: ' + data.primaryKeyword + '\n' : '') + (data.research ? 'Research context:\n' + data.research.slice(0, 2000) : '') + '\n\nGenerate a JSON outline:\n{ "sections": [{"level":"h1","text":"Title"},{"level":"h2","text":"Introduction"},{"level":"h2","text":"Section","children":[{"level":"h3","text":"Sub"}]}], "faq": [{"question":"Q?","answer":"A"}], "conclusion": "Brief description" }\n\nInclude 4-8 h2 sections. Include 3-5 FAQ items. Respond with ONLY valid JSON.';
}

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  professional: 'Write in a professional, authoritative tone.',
  conversational: 'Write in a friendly, conversational tone.',
  educational: 'Write in a clear, educational tone.',
  journalistic: 'Write in a journalistic, objective tone.',
  expert: 'Write as a domain expert sharing deep insights.',
  friendly: 'Write in a warm, approachable tone.',
};

const LENGTH_INSTRUCTIONS: Record<Length, string> = {
  short: 'Keep concise: 400-700 words.',
  standard: 'Standard article: 800-1500 words.',
  long: 'Comprehensive: 1500-2500 words.',
  'deep-dive': 'In-depth authoritative: 2500-4000 words.',
};

const MODE_INSTRUCTIONS: Record<GenerationMode, string> = {
  NEWS: 'NEWS: Lead with most important info, include context.',
  EXPLAINER: 'EXPLAINER: Break down complex topic clearly.',
  GUIDE: 'GUIDE: Provide step-by-step instructions with examples.',
  LISTICLE: 'LISTICLE: Numbered list with informative descriptions.',
  COMPARISON: 'COMPARISON: Compare options objectively with verdict.',
  REVIEW: 'REVIEW: Evaluate thoroughly with criteria and verdict.',
  OPINION: 'OPINION: Present reasoned perspective with evidence.',
  EVERGREEN: 'EVERGREEN: Comprehensive search-focused reference content.',
};

export function getArticlePrompt(data: { topic: string; outline: string; research?: string; tone: Tone; audience: Audience; length: Length; mode: GenerationMode; primaryKeyword?: string; siteName?: string; brandVoice?: string; contentRules?: string }): string {
  return 'You are an expert blog writer and SEO specialist' + (data.siteName ? ' for "' + data.siteName + '"' : '') + '.\n\nCRITICAL RULES:\n- Create ORIGINAL content that adds value - do NOT paraphrase the source\n- Add your own insights, analysis, and context\n- Include practical information and examples\n- Avoid unsupported claims or invented statistics\n- Structure with <h2> and <h3> HTML heading tags\n' + (data.brandVoice ? '- Brand voice: ' + data.brandVoice + '\n' : '') + (data.contentRules ? '- Rules: ' + data.contentRules + '\n' : '') + '\nTopic: ' + data.topic + '\nMode: ' + MODE_INSTRUCTIONS[data.mode] + '\nTone: ' + TONE_INSTRUCTIONS[data.tone] + '\nAudience: ' + data.audience + '\nLength: ' + LENGTH_INSTRUCTIONS[data.length] + '\n' + (data.primaryKeyword ? 'Primary keyword: ' + data.primaryKeyword + '\n' : '') + '\nOUTLINE:\n' + data.outline + '\n' + (data.research ? 'RESEARCH:\n' + data.research.slice(0, 2000) : '') + '\n\nReturn JSON: { "title": "Compelling title (max 60 chars)", "content": "Full article HTML with <h2>,<h3>,<p>,<ul>,<strong>,<em> tags", "excerpt": "2-3 sentence summary", "primaryKeyword": "main keyword", "secondaryKeywords": ["kw1","kw2"], "faq": [{"question":"Q","answer":"A"}] }\n\nRespond with ONLY valid JSON, no markdown code blocks.';
}

export function getSeoPrompt(data: { title: string; content: string; metaDescription?: string; primaryKeyword?: string }): string {
  return 'You are an SEO expert. Analyze this article for SEO quality.\n\nTitle: ' + data.title + '\n' + (data.primaryKeyword ? 'Primary Keyword: ' + data.primaryKeyword + '\n' : '') + (data.metaDescription ? 'Meta: ' + data.metaDescription + '\n' : '') + '\nContent:\n' + data.content.slice(0, 4000) + '\n\nScore each 0-10 and return JSON:\n{ "primaryKeyword": "suggested keyword", "secondaryKeywords": ["kw1","kw2"], "searchIntent": "INFORMATIONAL|COMMERCIAL|TRANSACTIONAL|NAVIGATIONAL", "titleScore": 8, "metaScore": 7, "keywordScore": 8, "structureScore": 9, "linkScore": 5, "schemaScore": 4, "readabilityScore": 8, "overallScore": 72, "recommendations": ["improvement 1","improvement 2"] }\n\nBe strict but fair. Respond with ONLY valid JSON.';
}

export function getQualityPrompt(data: { title: string; content: string; primaryKeyword?: string }): string {
  return 'You are a content quality evaluator. Score this article.\n\nTitle: ' + data.title + '\n' + (data.primaryKeyword ? 'Primary Keyword: ' + data.primaryKeyword + '\n' : '') + '\nContent:\n' + data.content.slice(0, 5000) + '\n\nScore each 0-100 and return JSON:\n{ "overallScore": 72, "originalityScore": 75, "readabilityScore": 80, "searchIntentScore": 85, "depthScore": 60, "authorityScore": 55, "factualScore": 70, "internalLinkScore": 40, "monetizationReadinessScore": 50, "recommendations": ["improvement 1","improvement 2"] }\n\nBe strict. Average = 50-70. Exceptional = 85+. Respond with ONLY valid JSON.';
}

export function getImprovePrompt(data: { title: string; content: string; focus: string }): string {
  return 'Improve this article focusing on: ' + data.focus + '\n\nTitle: ' + data.title + '\nContent:\n' + data.content.slice(0, 5000) + '\n\nReturn JSON: { "title": "improved", "content": "improved HTML", "excerpt": "updated" }\n\nPreserve overall structure. Only improve ' + data.focus + '. Respond with ONLY valid JSON.';
}

export function getTaxonomyPrompt(data: { title: string; content: string; existingCategories?: string[]; existingTags?: string[] }): string {
  return 'Suggest a category and tags for this article.\n\nTitle: ' + data.title + '\nContent: ' + data.content.slice(0, 2000) + (data.existingCategories ? '\nExisting categories: ' + data.existingCategories.join(', ') : '') + (data.existingTags ? '\nExisting tags: ' + data.existingTags.join(', ') : '') + '\n\nReturn JSON: { "recommendedCategory": "category name", "recommendedTags": ["tag1","tag2","tag3","tag4","tag5"] }\n\nRespond with ONLY valid JSON.';
}

export function getRefreshPrompt(data: { title: string; content: string }): string {
  return 'Analyze this published article for freshness.\n\nTitle: ' + data.title + '\nContent: ' + data.content.slice(0, 4000) + '\n\nReturn JSON:\n{ "outdatedInfo": ["item 1"], "missingInfo": ["topic 1"], "newSearchIntent": ["query 1"], "refreshNotes": "summary of what to update" }\n\nRespond with ONLY valid JSON.';
}
