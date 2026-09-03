import { db } from "@/lib/db";
import { callAI, cleanAIResponse } from "@/lib/ai/client";


function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rewriteArticleWithSEO(
  articleId: string,
  title: string,
  content: string,
): Promise<boolean> {
  try {
    const article = await db.article.findUnique({ where: { id: articleId }, select: { siteId: true } });
    await db.article.update({ where: { id: articleId }, data: { status: 'rewriting' } });

    const prompt = `You are an expert blog writer and SEO specialist for "MoreWithAI". Rewrite the following article and generate SEO metadata.

RULES FOR CONTENT:
- Create a compelling, click-worthy title (60 chars max for SEO)
- Write in an informative yet conversational tone
- Add your own insights and commentary
- Structure with clear paragraphs and subheadings using <h2> and <h3> HTML tags
- Make it at least 500 words if the original is substantial
- Do NOT copy phrases verbatim - rephrase everything
- Add a hook intro that engages the reader
- End with a forward-looking conclusion
- Include a \"Key Takeaways\" section at the end as a <ul> list

Original Title: ${title}

Original Content:
${content}

Respond with ONLY valid JSON in this exact format (no markdown wrapping):
{
  \"title\": \"your rewritten title (max 60 chars)\",
  \"content\": \"your full rewritten article HTML content\",
  \"seoTitle\": \"SEO meta title (50-60 chars, include primary keyword)\",
  \"seoDescription\": \"SEO meta description (150-160 chars, compelling summary with keywords)\",
  \"seoKeywords\": \"keyword1, keyword2, keyword3, keyword4, keyword5 (5-8 relevant keywords)\",
  \"schemaMarkup\": \"JSON-LD schema markup as a string for Article type\"
}`;

    const result = await callAI({
      siteId: article?.siteId || '',
      articleId,
      jobType: 'REWRITE',
      systemPrompt: 'You are a professional blog content rewriter and SEO expert. Always respond with valid JSON only, no markdown code blocks.',
      userPrompt: prompt,
      responseFormat: 'json',
    });

    let rewritten = cleanAIResponse(result.content);
    const parsed = JSON.parse(rewritten);

    if (!parsed.title || !parsed.content) {
      throw new Error('LLM returned missing title or content');
    }

    let schemaMarkup = parsed.schemaMarkup;
    // URL and domain will be set by publish service at publish time

    await db.article.update({
      where: { id: articleId },
      data: {
        title: parsed.title,
        rewrittenTitle: parsed.title,
        rewrittenContent: parsed.content,
        seoTitle: parsed.seoTitle || null,
        seoDescription: parsed.seoDescription || null,
        seoKeywords: parsed.seoKeywords || null,
        seoSchema: schemaMarkup || null,
        status: 'rewritten',
        rewrittenAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error(`Error rewriting article ${articleId}:`, error);
    await db.article.update({
      where: { id: articleId },
      data: { status: 'fetched', errorMessage: String(error) },
    });
    return false;
  }
}

export async function batchRewriteWithSEO(
  articles: { id: string; originalTitle: string; originalContent: string }[],
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  const BATCH_DELAY_MS = 5000; // 5 seconds between articles to respect AI rate limits

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const result = await rewriteArticleWithSEO(article.id, article.originalTitle, article.originalContent);
    if (result) success++;
    else failed++;
    if (i < articles.length - 1) await delay(BATCH_DELAY_MS);
  }

  return { success, failed };
}
