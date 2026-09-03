import { db } from '@/lib/db';
import { buildArticleSchema } from '@/lib/ai/seo.service';
import { sanitizeHtml } from '@/lib/security/sanitize-html';

interface WpSettings {
  wpUrl: string;
  wpUser: string;
  wpAppPwd: string;
  adsenseClientId?: string;
  adsenseSlot?: string;
}

export async function getWpSettings(siteId: string): Promise<WpSettings | null> {
  const settings = await db.setting.findMany({ where: { siteId } });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  if (!map.wp_site_url || !map.wp_username || !map.wp_app_password) return null;
  return {
    wpUrl: map.wp_site_url,
    wpUser: map.wp_username,
    wpAppPwd: map.wp_app_password,
    adsenseClientId: map.adsense_client_id,
    adsenseSlot: map.adsense_ad_slot,
  };
}

function insertAdSenseBlocks(content: string, clientId: string, slot: string): string {
  const adBlock = `\n<div style="text-align:center;margin:20px 0;">\n<ins class="adsbygoogle"\n  style="display:block"\n  data-ad-client="${clientId}"\n  data-ad-slot="${slot}"\n  data-ad-format="auto"\n  data-full-width-responsive="true"></ins>\n</div>\n`;
  // Split on </p> — rejoin properly (no double tags)
  const parts = content.split('</p>');
  if (parts.length > 2) {
    parts.splice(2, 0, adBlock);
  }
  return parts.join('</p>');
}

export async function publishArticle(articleId: string): Promise<boolean> {
  const article = await db.article.findUnique({
    where: { id: articleId },
    include: { author: true, category: true, site: true },
  });
  if (!article) return false;
  const previousStatus = article.status;

  try {
    let contentToPublish = article.rewrittenContent || article.originalContent;
    const titleToPublish = article.rewrittenTitle || article.title;

    await db.article.update({ where: { id: articleId }, data: { status: 'publishing' } });
    contentToPublish = sanitizeHtml(contentToPublish);

    const wp = await getWpSettings(article.siteId);
    if (!wp) throw new Error('WordPress credentials not configured');

    if (article.adsenseEnabled && wp.adsenseClientId && wp.adsenseSlot) {
      contentToPublish = insertAdSenseBlocks(contentToPublish, wp.adsenseClientId, wp.adsenseSlot);
    }

    // Article-specific schema URLs (Bug #3 fix)
    const domain = article.site?.domain || 'morewithai.online';
    const slug = article.slug || titleToPublish.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
    const articleUrl = `https://${domain}/blog/${slug}`;

    let schemaMarkup = article.seoSchema;
    if (!schemaMarkup) {
      schemaMarkup = buildArticleSchema({
        title: titleToPublish,
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
        slug, domain,
        authorName: article.author?.name,
        publishedAt: article.publishedAt?.toISOString(),
      });
    } else {
      try {
        const parsed = JSON.parse(schemaMarkup);
        if (parsed.url) parsed.url = articleUrl;
        if (parsed.mainEntityOfPage) parsed.mainEntityOfPage['@id'] = articleUrl;
        schemaMarkup = JSON.stringify(parsed);
      } catch {}
    }

    const postData: Record<string, unknown> = {
      title: titleToPublish,
      content: contentToPublish,
      status: 'publish',
    };

    if (article.seoTitle || article.seoDescription || article.seoKeywords) {
      const meta: Record<string, string> = {};
      if (article.seoTitle) meta['_yoast_wpseo_title'] = article.seoTitle;
      if (article.seoDescription) meta['_yoast_wpseo_metadesc'] = article.seoDescription;
      if (article.seoKeywords) meta['_yoast_wpseo_focuskw'] = article.seoKeywords;
      postData['meta'] = meta;
    }

    const response = await fetch(`${wp.wpUrl}/wp-json/wp/v2/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + Buffer.from(`${wp.wpUser}:${wp.wpAppPwd}`).toString('base64'),
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`WordPress API error: ${response.status} - ${errorData}`);
    }

    const wpPost = await response.json();

    // Create version record
    const existingVersions = await db.articleVersion.count({ where: { articleId } });
    const version = await db.articleVersion.create({
      data: {
        articleId,
        versionNumber: existingVersions + 1,
        title: titleToPublish,
        excerpt: article.excerpt || null,
        content: contentToPublish,
        changeReason: 'Published to WordPress',
      },
    });

    await db.article.update({
      where: { id: articleId },
      data: {
        status: 'published',
        wordpressPostId: wpPost.id,
        wordpressUrl: wpPost.link,
        publishedAt: new Date(),
        publishedVersionId: version.id,
      },
    });

    return true;
  } catch (error) {
    // Error logged to automation system, not console
    await db.article.update({
      where: { id: articleId },
      data: { status: previousStatus, errorMessage: String(error) },
    });
    return false;
  }
}

export async function batchPublishArticles(articleIds: string[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  for (const id of articleIds) {
    const result = await publishArticle(id);
    if (result) success++;
    else failed++;
  }
  return { success, failed };
}
