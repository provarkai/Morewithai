const API_BASE = "";

async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...((options?.headers as Record<string, string>) || {}) };
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers, credentials: 'include' });
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.reload();
    }
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function checkSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    return res.ok;
  } catch { return false; }
}

function withSiteId(url: string, siteId: string, extraParams?: Record<string, string>): string {
  const params = new URLSearchParams(extraParams);
  params.set('siteId', siteId);
  const qs = params.toString();
  return `${url}${qs ? `?${qs}` : ''}`;
}

// Sites
export function getSites() { return fetchAPI<Site[]>('/api/sites'); }
export function createSite(data: { name: string; slug: string; description?: string }) { return fetchAPI<Site>('/api/sites', { method: 'POST', body: JSON.stringify(data) }); }
export function updateSite(data: { id: string; name?: string; slug?: string; description?: string; isActive?: boolean }) { return fetchAPI<Site>('/api/sites', { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteSite(id: string) { return fetchAPI<{ success: boolean }>(`/api/sites?id=${id}`, { method: 'DELETE' }); }

// Dashboard
export function getDashboard(siteId: string) { return fetchAPI<DashboardData>(withSiteId('/api/dashboard', siteId)); }

// Feeds
export function getFeeds(siteId: string) { return fetchAPI<FeedWithCount[]>(withSiteId('/api/feeds', siteId)); }
export function createFeed(siteId: string, data: { name?: string; url: string; category?: string }) { return fetchAPI<Feed>('/api/feeds', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function updateFeed(data: Partial<Feed> & { id: string; siteId: string }) { return fetchAPI<Feed>('/api/feeds', { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteFeed(id: string, siteId: string) { return fetchAPI<{ success: boolean }>(withSiteId(`/api/feeds?id=${id}`, siteId), { method: 'DELETE' }); }

// Articles
export function getArticles(siteId: string, params?: { status?: string; category?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.status) qp.status = params.status;
  if (params?.category) qp.category = params.category;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<ArticlesResponse>(withSiteId('/api/articles', siteId, qp));
}
export function updateArticle(data: { id: string; siteId: string; status?: string; title?: string; category?: string; seoTitle?: string; seoDescription?: string; seoKeywords?: string; adsenseEnabled?: boolean; scheduledAt?: string }) {
  return fetchAPI<Article>('/api/articles', { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteArticle(id: string, siteId: string) { return fetchAPI<{ success: boolean }>(withSiteId(`/api/articles?id=${id}`, siteId), { method: 'DELETE' }); }
export function fetchArticles(siteId: string, data: { feedId?: string; fetchAll?: boolean }) { return fetchAPI<{ message: string; count?: number }>('/api/articles', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }

// Rewrite
export function rewriteArticle(siteId: string, data: { articleId?: string; rewriteAll?: boolean }) { return fetchAPI<{ message: string }>('/api/rewrite', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }

// Publish
export function getPublishStatus(siteId: string) { return fetchAPI<{ connected: boolean; message: string }>(withSiteId('/api/publish', siteId)); }
export function publishArticle(siteId: string, data: { articleId?: string; publishAllApproved?: boolean; publishScheduled?: boolean }) { return fetchAPI<{ message: string }>('/api/publish', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }

// Schedule
export function getScheduledArticles(siteId: string) { return fetchAPI<Article[]>(withSiteId('/api/schedule', siteId)); }
export function scheduleArticle(siteId: string, data: { articleId?: string; scheduledDate?: string; scheduleAll?: boolean; batchSize?: number; intervalMinutes?: number }) { return fetchAPI<{ message: string }>('/api/schedule', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }

// Automation
export function getAutomationLogs(siteId: string) { return fetchAPI<AutomationLog[]>(withSiteId('/api/automation', siteId)); }
export function runAutomation(siteId: string, data: { step: 'all' | 'fetch' | 'rewrite' | 'publish' }) { return fetchAPI<{ message: string }>('/api/automation', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }

// Settings
export function getSettings(siteId: string) { return fetchAPI<Record<string, string>>(withSiteId('/api/settings', siteId)); }
export function saveSettings(siteId: string, settings: Record<string, string>) { return fetchAPI<{ message: string }>('/api/settings', { method: 'POST', body: JSON.stringify({ settings, siteId }) }); }

// Public
export function getPublicArticles(siteId: string, params?: { page?: number; limit?: number; category?: string; tag?: string }) {
  const qp: Record<string, string> = { action: 'published' };
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  if (params?.category) qp.category = params.category;
  if (params?.tag) qp.tag = params.tag;
  return fetchAPI<PublicArticlesResponse>(withSiteId('/api/public', siteId, qp));
}
export function getPublicArticle(siteId: string, slug: string) { return fetchAPI<Article>(withSiteId('/api/public', siteId, { action: 'article', slug })); }

// Auth
export async function login(email: string, password: string) {
  const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.toLowerCase(), password }), credentials: 'include' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}
export async function logout() { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); }

// AI Endpoints
export function aiResearch(siteId: string, data: { articleId: string; title: string; content: string; sourceUrl?: string }) {
  return fetchAPI<any>('/api/ai/research', { method: 'POST', body: JSON.stringify({ ...data, siteId }) });
}
export function aiOutline(siteId: string, data: { articleId: string; title: string; content: string; sections?: any }) {
  return fetchAPI<any>('/api/ai/outline', { method: 'POST', body: JSON.stringify({ ...data, siteId }) });
}
export function aiGenerate(siteId: string, data: { articleId: string; title: string; content: string; mode?: string; tone?: string; length?: string; customPrompt?: string; outline?: any }) {
  return fetchAPI<any>('/api/ai/generate', { method: 'POST', body: JSON.stringify({ ...data, siteId }) });
}
export function aiSeo(siteId: string, data: { articleId: string; title: string; content: string; slug?: string }) {
  return fetchAPI<any>('/api/ai/seo', { method: 'POST', body: JSON.stringify({ ...data, siteId }) });
}
export function aiQuality(siteId: string, data: { articleId: string; title: string; content: string }) {
  return fetchAPI<any>('/api/ai/quality', { method: 'POST', body: JSON.stringify({ ...data, siteId }) });
}
export function aiInternalLinks(siteId: string, data: { articleId: string; title: string; content: string }) {
  return fetchAPI<any>('/api/ai/internal-links', { method: 'POST', body: JSON.stringify({ ...data, siteId }) });
}
export function aiTaxonomy(siteId: string, data: { articleId: string; title: string; content: string }) {
  return fetchAPI<any>('/api/ai/taxonomy', { method: 'POST', body: JSON.stringify({ ...data, siteId }) });
}

// Authors
export function getAuthors(siteId: string) { return fetchAPI<any[]>(withSiteId('/api/authors', siteId)); }
export function createAuthor(siteId: string, data: { name: string; bio?: string; avatarUrl?: string; website?: string; socialLinks?: Record<string, string> }) {
  return fetchAPI<any>('/api/authors', { method: 'POST', body: JSON.stringify({ ...data, siteId }) });
}
export function updateAuthor(id: string, data: { name?: string; bio?: string; avatarUrl?: string; website?: string; socialLinks?: Record<string, string>; isActive?: boolean }) {
  return fetchAPI<any>(`/api/authors/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteAuthor(id: string) {
  return fetchAPI<{ success: boolean }>(`/api/authors/${id}`, { method: 'DELETE' });
}

// Categories
export function getCategories(siteId: string) { return fetchAPI<any[]>(withSiteId('/api/categories', siteId)); }

// Tags
export function getTags(siteId: string) { return fetchAPI<any[]>(withSiteId('/api/tags', siteId)); }

// Article Versions
export function getArticleVersions(articleId: string) { return fetchAPI<any[]>(`/api/articles/${articleId}/versions`); }
export function createArticleVersion(articleId: string, data: { title?: string; content?: string; excerpt?: string; changeReason?: string }) {
  return fetchAPI<any>(`/api/articles/${articleId}/versions`, { method: 'POST', body: JSON.stringify(data) });
}
export function restoreArticleVersion(articleId: string, versionId: string) {
  return fetchAPI<{ success: boolean }>(`/api/articles/${articleId}/versions/${versionId}`, { method: 'POST' });
}

// Content Refresh
export function refreshArticle(articleId: string, siteId: string, reason?: string) {
  return fetchAPI<any>(`/api/articles/${articleId}/refresh`, { method: 'POST', body: JSON.stringify({ siteId, reason }) });
}

// AI Jobs
export function getAiJobs(siteId: string, params?: { type?: string; status?: string; articleId?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.type) qp.type = params.type;
  if (params?.status) qp.status = params.status;
  if (params?.articleId) qp.articleId = params.articleId;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/ai/jobs', siteId, qp));
}
export function getAiJobStats(siteId: string) {
  return fetchAPI<any>(withSiteId('/api/ai/jobs', siteId, { action: 'stats' }));
}
export function retryAiJob(jobId: string) {
  return fetchAPI<any>(`/api/ai/jobs/${jobId}`, { method: 'POST', body: JSON.stringify({ action: 'retry' }) });
}
export function cancelAiJob(jobId: string) {
  return fetchAPI<any>(`/api/ai/jobs/${jobId}`, { method: 'POST', body: JSON.stringify({ action: 'cancel' }) });
}

// Subscribers
export function getSubscribers(siteId: string, params?: { status?: string; source?: string; search?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.status) qp.status = params.status;
  if (params?.source) qp.source = params.source;
  if (params?.search) qp.search = params.search;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/subscribers', siteId, qp));
}
export function getSubscriberStats(siteId: string) { return fetchAPI<any>(withSiteId('/api/subscribers', siteId, { action: 'stats' })); }
export function exportSubscribers(siteId: string) { return fetchAPI<any>(withSiteId('/api/subscribers', siteId, { action: 'export' })); }
export function unsubscribeSubscriber(id: string) { return fetchAPI<any>(`/api/subscribers/${id}`, { method: 'POST', body: JSON.stringify({ action: 'unsubscribe' }) }); }
export function deleteSubscriber(id: string) { return fetchAPI<any>(`/api/subscribers/${id}`, { method: 'DELETE' }); }

// Leads
export function getLeads(siteId: string, params?: { articleId?: string; leadMagnetId?: string; status?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.articleId) qp.articleId = params.articleId;
  if (params?.leadMagnetId) qp.leadMagnetId = params.leadMagnetId;
  if (params?.status) qp.status = params.status;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/leads', siteId, qp));
}
export function getLeadStats(siteId: string) { return fetchAPI<any>(withSiteId('/api/leads', siteId, { action: 'stats' })); }

// Lead Magnets
export function getLeadMagnets(siteId: string, params?: { status?: string }) {
  const qp: Record<string, string> = {};
  if (params?.status) qp.status = params.status;
  return fetchAPI<any>(withSiteId('/api/lead-magnets', siteId, qp));
}
export function getLeadMagnetStats(siteId: string) { return fetchAPI<any>(withSiteId('/api/lead-magnets', siteId, { action: 'stats' })); }
export function createLeadMagnet(siteId: string, data: any) { return fetchAPI<any>('/api/lead-magnets', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function updateLeadMagnet(id: string, data: any) { return fetchAPI<any>(`/api/lead-magnets/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteLeadMagnet(id: string) { return fetchAPI<any>(`/api/lead-magnets/${id}`, { method: 'DELETE' }); }

// Email Campaigns
export function getEmailCampaigns(siteId: string, params?: { type?: string; status?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.type) qp.type = params.type;
  if (params?.status) qp.status = params.status;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/email/campaigns', siteId, qp));
}
export function getCampaignStats(siteId: string) { return fetchAPI<any>(withSiteId('/api/email/campaigns', siteId, { action: 'stats' })); }
export function createEmailCampaign(siteId: string, data: any) { return fetchAPI<any>('/api/email/campaigns', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function updateEmailCampaign(id: string, data: any) { return fetchAPI<any>(`/api/email/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteEmailCampaign(id: string) { return fetchAPI<any>(`/api/email/campaigns/${id}`, { method: 'DELETE' }); }
export function sendEmailCampaign(id: string) { return fetchAPI<any>(`/api/email/campaigns/${id}`, { method: 'POST', body: JSON.stringify({ action: 'send' }) }); }
export function scheduleEmailCampaign(id: string, scheduledAt: string) { return fetchAPI<any>(`/api/email/campaigns/${id}`, { method: 'POST', body: JSON.stringify({ action: 'schedule', scheduledAt }) }); }

// Email Automations
export function getEmailAutomations(siteId: string, params?: { triggerType?: string; status?: string }) {
  const qp: Record<string, string> = {};
  if (params?.triggerType) qp.triggerType = params.triggerType;
  if (params?.status) qp.status = params.status;
  return fetchAPI<any>(withSiteId('/api/email/automations', siteId, qp));
}
export function getEmailStats(siteId: string, params?: { campaignId?: string; startDate?: string; endDate?: string }) {
  const qp: Record<string, string> = {};
  if (params?.campaignId) qp.campaignId = params.campaignId;
  if (params?.startDate) qp.startDate = params.startDate;
  if (params?.endDate) qp.endDate = params.endDate;
  return fetchAPI<any>(withSiteId('/api/email/stats', siteId, qp));
}
export function createEmailAutomation(siteId: string, data: any) { return fetchAPI<any>('/api/email/automations', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function updateEmailAutomation(id: string, data: any) { return fetchAPI<any>(`/api/email/automations/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteEmailAutomation(id: string) { return fetchAPI<any>(`/api/email/automations/${id}`, { method: 'DELETE' }); }

// CTAs
export function getCtas(siteId: string, params?: { type?: string; placement?: string; isActive?: boolean; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.type) qp.type = params.type;
  if (params?.placement) qp.placement = params.placement;
  if (params?.isActive !== undefined) qp.isActive = String(params.isActive);
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/ctas', siteId, qp));
}
export function getCtaStats(siteId: string) { return fetchAPI<any>(withSiteId('/api/ctas', siteId, { action: 'stats' })); }
export function createCta(siteId: string, data: any) { return fetchAPI<any>('/api/ctas', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function updateCta(id: string, data: any) { return fetchAPI<any>(`/api/ctas/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteCta(id: string) { return fetchAPI<any>(`/api/ctas/${id}`, { method: 'DELETE' }); }
export function getCtaExperiments(siteId: string, params?: { status?: string }) {
  const qp: Record<string, string> = {};
  if (params?.status) qp.status = params.status;
  return fetchAPI<any>(withSiteId('/api/ctas/experiments', siteId, qp));
}
export function createCtaExperiment(siteId: string, data: any) { return fetchAPI<any>('/api/ctas/experiments', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function completeCtaExperiment(id: string) { return fetchAPI<any>(`/api/ctas/experiments/${id}`, { method: 'POST', body: JSON.stringify({ action: 'complete' }) }); }

// Affiliates
export function getAffiliatePrograms(siteId: string, params?: { status?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.status) qp.status = params.status;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/affiliates/programs', siteId, qp));
}
export function getAffiliateOffers(siteId: string, params?: { programId?: string; category?: string; status?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.programId) qp.programId = params.programId;
  if (params?.category) qp.category = params.category;
  if (params?.status) qp.status = params.status;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/affiliates/offers', siteId, qp));
}
export function getAffiliateStats(siteId: string) { return fetchAPI<any>(withSiteId('/api/affiliates/offers', siteId, { action: 'stats' })); }
export function createAffiliateProgram(siteId: string, data: any) { return fetchAPI<any>('/api/affiliates/programs', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function updateAffiliateProgram(id: string, data: any) { return fetchAPI<any>(`/api/affiliates/programs/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteAffiliateProgram(id: string) { return fetchAPI<any>(`/api/affiliates/programs/${id}`, { method: 'DELETE' }); }
export function createAffiliateOffer(siteId: string, data: any) { return fetchAPI<any>('/api/affiliates/offers', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function updateAffiliateOffer(id: string, data: any) { return fetchAPI<any>(`/api/affiliates/offers/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteAffiliateOffer(id: string) { return fetchAPI<any>(`/api/affiliates/offers/${id}`, { method: 'DELETE' }); }

// Products
export function getProducts(siteId: string, params?: { productType?: string; status?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.productType) qp.productType = params.productType;
  if (params?.status) qp.status = params.status;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/products', siteId, qp));
}
export function getProductStats(siteId: string) { return fetchAPI<any>(withSiteId('/api/products', siteId, { action: 'stats' })); }
export function createProduct(siteId: string, data: any) { return fetchAPI<any>('/api/products', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function updateProduct(id: string, data: any) { return fetchAPI<any>(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteProduct(id: string) { return fetchAPI<any>(`/api/products/${id}`, { method: 'DELETE' }); }
export function getProductPurchases(siteId: string, params?: { productId?: string; status?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.productId) qp.productId = params.productId;
  if (params?.status) qp.status = params.status;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/products/purchases', siteId, qp));
}

// Ads
export function getAdPlacements(siteId: string) { return fetchAPI<any>(withSiteId('/api/ads/placements', siteId)); }
export function getAdStats(siteId: string) { return fetchAPI<any>(withSiteId('/api/ads/stats', siteId)); }
export function createAdPlacement(siteId: string, data: any) { return fetchAPI<any>('/api/ads/placements', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function updateAdPlacement(id: string, data: any) { return fetchAPI<any>(`/api/ads/placements/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteAdPlacement(id: string) { return fetchAPI<any>(`/api/ads/placements/${id}`, { method: 'DELETE' }); }

// Revenue
export function getRevenueDashboard(siteId: string) { return fetchAPI<any>(withSiteId('/api/revenue', siteId, { action: 'dashboard' })); }
export function getRevenueSources(siteId: string) { return fetchAPI<any>(withSiteId('/api/revenue', siteId, { action: 'sources' })); }
export function getTopMoneyArticles(siteId: string, params?: { limit?: number; startDate?: string; endDate?: string }) {
  const qp: Record<string, string> = {};
  if (params?.limit) qp.limit = String(params.limit);
  if (params?.startDate) qp.startDate = params.startDate;
  if (params?.endDate) qp.endDate = params.endDate;
  return fetchAPI<any>(withSiteId('/api/revenue/articles', siteId, qp));
}

// Analytics
export function getAnalyticsOverview(siteId: string) { return fetchAPI<any>(withSiteId('/api/analytics', siteId, { action: 'overview' })); }
export function getTrafficStats(siteId: string, params?: { articleId?: string; startDate?: string; endDate?: string }) {
  const qp: Record<string, string> = { action: 'stats' };
  if (params?.articleId) qp.articleId = params.articleId;
  if (params?.startDate) qp.startDate = params.startDate;
  if (params?.endDate) qp.endDate = params.endDate;
  return fetchAPI<any>(withSiteId('/api/analytics/traffic', siteId, qp));
}
export function getSearchStats(siteId: string, params?: { articleId?: string; startDate?: string; endDate?: string }) {
  const qp: Record<string, string> = { action: 'stats' };
  if (params?.articleId) qp.articleId = params.articleId;
  if (params?.startDate) qp.startDate = params.startDate;
  if (params?.endDate) qp.endDate = params.endDate;
  return fetchAPI<any>(withSiteId('/api/analytics/search', siteId, qp));
}
export function getConversionStats(siteId: string, params?: { articleId?: string; startDate?: string; endDate?: string }) {
  const qp: Record<string, string> = { action: 'stats' };
  if (params?.articleId) qp.articleId = params.articleId;
  if (params?.startDate) qp.startDate = params.startDate;
  if (params?.endDate) qp.endDate = params.endDate;
  return fetchAPI<any>(withSiteId('/api/analytics/conversions', siteId, qp));
}
export function getTrafficFunnel(siteId: string) { return fetchAPI<any>(withSiteId('/api/analytics/funnel', siteId, { type: 'traffic' })); }
export function getEmailFunnel(siteId: string) { return fetchAPI<any>(withSiteId('/api/analytics/funnel', siteId, { type: 'email' })); }

// Growth
export function getContentOpportunities(siteId: string, params?: { type?: string; priority?: string; status?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.type) qp.type = params.type;
  if (params?.priority) qp.priority = params.priority;
  if (params?.status) qp.status = params.status;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/growth/opportunities', siteId, qp));
}
export function analyzeOpportunities(siteId: string) { return fetchAPI<any>(`/api/growth/opportunities?action=analyze&siteId=${siteId}`, { method: 'POST' }); }
export function getGrowthRecommendations(siteId: string, params?: { priority?: string; status?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.priority) qp.priority = params.priority;
  if (params?.status) qp.status = params.status;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/growth/recommendations', siteId, qp));
}
export function generateRecommendations(siteId: string) { return fetchAPI<any>(`/api/growth/recommendations?action=generate&siteId=${siteId}`, { method: 'POST' }); }
export function getTopMoneyOpportunities(siteId: string, limit?: number) {
  const qp: Record<string, string> = {};
  if (limit) qp.limit = String(limit);
  return fetchAPI<any>(withSiteId('/api/growth/money-score', siteId, qp));
}
export function runGrowthAnalysis(siteId: string) { return fetchAPI<any>('/api/growth/analyze', { method: 'POST', body: JSON.stringify({ siteId }) }); }

// Topic Clusters
export function getTopicClusters(siteId: string) { return fetchAPI<any>(withSiteId('/api/growth/clusters', siteId)); }
export function createTopicCluster(siteId: string, data: any) { return fetchAPI<any>('/api/growth/clusters', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function updateTopicCluster(id: string, data: any) { return fetchAPI<any>(`/api/growth/clusters/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteTopicCluster(id: string) { return fetchAPI<any>(`/api/growth/clusters/${id}`, { method: 'DELETE' }); }

// Social
export function getSocialPosts(siteId: string, params?: { platform?: string; status?: string; articleId?: string }) {
  const qp: Record<string, string> = {};
  if (params?.platform) qp.platform = params.platform;
  if (params?.status) qp.status = params.status;
  if (params?.articleId) qp.articleId = params.articleId;
  return fetchAPI<any>(withSiteId('/api/social/posts', siteId, qp));
}
export function getSocialStats(siteId: string) { return fetchAPI<any>(withSiteId('/api/social/posts', siteId, { action: 'stats' })); }
export function generateSocialPosts(siteId: string, articleId: string) { return fetchAPI<any>(`/api/social/posts?action=generate&siteId=${siteId}`, { method: 'POST', body: JSON.stringify({ articleId }) }); }
export function socialRepurposeArticle(siteId: string, articleId: string) { return fetchAPI<any>(`/api/social/posts?action=repurpose&siteId=${siteId}`, { method: 'POST', body: JSON.stringify({ articleId }) }); }
export function getSocialTemplates(siteId: string, params?: { platform?: string }) {
  const qp: Record<string, string> = {};
  if (params?.platform) qp.platform = params.platform;
  return fetchAPI<any>(withSiteId('/api/social/templates', siteId, qp));
}
export function createSocialTemplate(siteId: string, data: any) { return fetchAPI<any>('/api/social/templates', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }

// Calendar
export function getCalendarEvents(siteId: string, params?: { eventType?: string; status?: string; startDate?: string; endDate?: string }) {
  const qp: Record<string, string> = {};
  if (params?.eventType) qp.eventType = params.eventType;
  if (params?.status) qp.status = params.status;
  if (params?.startDate) qp.startDate = params.startDate;
  if (params?.endDate) qp.endDate = params.endDate;
  return fetchAPI<any>(withSiteId('/api/calendar', siteId, qp));
}
export function createCalendarEvent(siteId: string, data: any) { return fetchAPI<any>('/api/calendar', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function updateCalendarEvent(id: string, data: any) { return fetchAPI<any>(`/api/calendar/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteCalendarEvent(id: string) { return fetchAPI<any>(`/api/calendar/${id}`, { method: 'DELETE' }); }
export function generateCalendarSuggestions(siteId: string) { return fetchAPI<any>(`/api/calendar?action=suggestions&siteId=${siteId}`, { method: 'POST' }); }

// Automation Rules
export function getAutomationRules(siteId: string) { return fetchAPI<any>(withSiteId('/api/automation/rules', siteId)); }
export function createAutomationRule(siteId: string, data: any) { return fetchAPI<any>('/api/automation/rules', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function updateAutomationRule(id: string, data: any) { return fetchAPI<any>(`/api/automation/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteAutomationRule(id: string) { return fetchAPI<any>(`/api/automation/rules/${id}`, { method: 'DELETE' }); }

// Media
export function getMedia(siteId: string, params?: { folder?: string; mimeType?: string; search?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.folder) qp.folder = params.folder;
  if (params?.mimeType) qp.mimeType = params.mimeType;
  if (params?.search) qp.search = params.search;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/media', siteId, qp));
}
export function getMediaStats(siteId: string) { return fetchAPI<any>(withSiteId('/api/media', siteId, { action: 'stats' })); }
export function getMediaFolders(siteId: string) { return fetchAPI<any>(withSiteId('/api/media', siteId, { action: 'folders' })); }
export function deleteMediaItem(id: string, siteId: string) { return fetchAPI<{ success: boolean }>(withSiteId(`/api/media/${id}`, siteId), { method: 'DELETE' }); }
export function updateMediaItem(id: string, siteId: string, data: { alt?: string; folder?: string }) { return fetchAPI<any>(`/api/media/${id}?siteId=${siteId}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function uploadMediaFile(siteId: string, file: File, folder?: string, alt?: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('siteId', siteId);
  if (folder) formData.append('folder', folder);
  if (alt) formData.append('alt', alt);
  const res = await fetch('/api/media', { method: 'POST', body: formData, credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// Landing Pages
export function getLandingPages(siteId: string, params?: { status?: string; search?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.status) qp.status = params.status;
  if (params?.search) qp.search = params.search;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/landing-pages', siteId, qp));
}
export function getLandingPageStats(siteId: string) { return fetchAPI<any>(withSiteId('/api/landing-pages', siteId, { action: 'stats' })); }
export function createLandingPage(siteId: string, data: any) { return fetchAPI<any>('/api/landing-pages', { method: 'POST', body: JSON.stringify({ ...data, siteId }) }); }
export function updateLandingPage(id: string, data: any) { return fetchAPI<any>(`/api/landing-pages/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteLandingPage(id: string) { return fetchAPI<any>(`/api/landing-pages/${id}`, { method: 'DELETE' }); }

// Monetization
export function getMonetizationSummary(siteId: string) { return fetchAPI<any>(withSiteId('/api/monetization', siteId, { action: 'summary' })); }

// Portfolio
export function getPortfolioMetrics(organizationId?: string) {
  const qp: Record<string, string> = {};
  if (organizationId) qp.organizationId = organizationId;
  return fetchAPI<any>(`/api/portfolio${qp.organizationId ? `?organizationId=${organizationId}` : ''}`);
}

// Site Health
export function getSiteHealth(siteId: string, forceRefresh?: boolean) {
  return fetchAPI<any>(`/api/sites/health?siteId=${siteId}${forceRefresh ? '&action=calculate' : ''}`);
}

// Organizations
export function getOrganizations() {
  return fetchAPI<any>('/api/organizations');
}
export function getOrganization(id: string) {
  return fetchAPI<any>(`/api/organizations/${id}`);
}
export function createOrganization(name: string) {
  return fetchAPI<any>('/api/organizations', { method: 'POST', body: JSON.stringify({ name }) });
}
export function getOrganizationMembers(orgId: string) {
  return fetchAPI<any>(`/api/organizations/${orgId}/members`);
}
export function addOrganizationMember(orgId: string, userId: string, role: string) {
  return fetchAPI<any>(`/api/organizations/${orgId}/members`, { method: 'POST', body: JSON.stringify({ userId, role }) });
}

// Plans
export function getPlans() {
  return fetchAPI<any>('/api/plans');
}

// Backup
export function getBackupStats() { return fetchAPI<{ models: { name: string; count: number }[]; totalRecords: number }>('/api/backup?action=stats'); }
export function createBackupExport() { return fetchAPI<any>('/api/backup'); }
export function restoreBackupData(backup: any) { return fetchAPI<any>('/api/backup', { method: 'POST', body: JSON.stringify({ backup }) }); }

// Content Decay
export function getContentDecayScores(siteId: string, limit?: number) { return fetchAPI<any>(withSiteId('/api/content-decay', siteId, limit ? { limit: String(limit) } : {})); }
export function getContentDecaySummary(siteId: string) { return fetchAPI<any>(withSiteId('/api/content-decay', siteId, { action: 'summary' })); }
export function repurposeArticleForDecay(articleId: string, siteId: string) { return fetchAPI<any>('/api/content-decay/repurpose', { method: 'POST', body: JSON.stringify({ articleId, siteId }) }); }
export function getDistributionScores(siteId: string) { return fetchAPI<any>(withSiteId('/api/content-decay/repurpose', siteId)); }

// Content Intelligence
export function getContentIntelligence(siteId: string, action: 'classify' | 'gaps') { return fetchAPI<any>(withSiteId('/api/growth/content-intelligence', siteId, { action })); }
export function saveContentGaps(siteId: string, gaps: any[]) { return fetchAPI<any>('/api/growth/content-intelligence', { method: 'POST', body: JSON.stringify({ siteId, action: 'save-gaps', gaps }) }); }

// Business Goals & Strategy
export function getBusinessGoals(siteId: string) { return fetchAPI<any>(withSiteId('/api/growth/business-goals', siteId)); }
export function getBusinessStrategy(siteId: string) { return fetchAPI<any>(withSiteId('/api/growth/business-goals', siteId, { action: 'strategy' })); }

// Revenue Forecast
export function getRevenueForecast(siteId: string, months?: number) { return fetchAPI<any>(withSiteId('/api/growth/forecast', siteId, months ? { months: String(months) } : {})); }

// Quality Memory
export function getQualityMemoryPerformance(siteId: string, jobType?: string) { return fetchAPI<any>(withSiteId('/api/ai/quality-memory', siteId, jobType ? { action: 'performance', jobType } : {})); }
export function getQualityTrend(siteId: string, jobType?: string, days?: number) { const qp: Record<string, string> = { action: 'trend' }; if (jobType) qp.jobType = jobType; if (days) qp.days = String(days); return fetchAPI<any>(withSiteId('/api/ai/quality-memory', siteId, qp)); }

// Content Jobs / Orchestrator
export function getContentJobs(siteId: string, params?: { status?: string; type?: string; page?: number; limit?: number }) {
  const qp: Record<string, string> = {};
  if (params?.status) qp.status = params.status;
  if (params?.type) qp.type = params.type;
  if (params?.page) qp.page = String(params.page);
  if (params?.limit) qp.limit = String(params.limit);
  return fetchAPI<any>(withSiteId('/api/content-jobs', siteId, qp));
}
export function getContentJobStats(siteId: string) { return fetchAPI<any>(withSiteId('/api/content-jobs', siteId, { action: 'stats' })); }
export function getOrchestratorStatus(siteId: string) { return fetchAPI<any>(withSiteId('/api/content-jobs', siteId, { action: 'status' })); }
export function runOrchestrator(siteId: string) { return fetchAPI<any>(withSiteId('/api/content-jobs', siteId, { action: 'orchestrate' }), { method: 'POST', body: JSON.stringify({ siteId, action: 'orchestrate' }) }); }
export function prioritizeOpportunities(siteId: string) { return fetchAPI<any>(withSiteId('/api/content-jobs', siteId, { action: 'prioritize' }), { method: 'POST', body: JSON.stringify({ siteId, action: 'prioritize' }) }); }

// Types
export interface Site { id: string; name: string; slug: string; description: string | null; domain: string | null; isActive: boolean; theme: string; _count?: { feeds: number; articles: number }; createdAt: string; updatedAt: string; }
export interface UserSession { user: { id: string; email: string; name: string; role: string }; expiresAt: string; }
export interface DashboardData { site?: Site; totalFeeds: number; activeFeeds: number; totalArticles: number; scheduledArticles: number; draftArticles: number; publishedArticles: number; needsReview: number; needsRefresh: number; avgSeoScore: number | null; avgQualityScore: number | null; statusBreakdown: { status: string; count: number }[]; recentArticles: (Article & { feed?: { name: string } })[]; recentLogs: AutomationLog[]; refreshCandidates: Array<{ id: string; title: string; freshnessStatus: string; daysSinceUpdate: number; suggestedReason: string }>; aiJobStats: { totalJobs: number; completedJobs: number; failedJobs: number; runningJobs: number; totalCost: number; totalInputTokens: number; totalOutputTokens: number; costByType: Record<string, number> } | null; }
export interface Feed { id: string; name: string; url: string; category: string; isActive: boolean; lastFetched: string | null; fetchCount: number; createdAt: string; updatedAt: string; }
export interface FeedWithCount extends Feed { _count: { articles: number }; }
export interface Article { id: string; title: string; originalTitle: string; originalContent: string; rewrittenTitle: string | null; rewrittenContent: string | null; sourceUrl: string; sourceFeedId: string | null; thumbnailUrl: string | null; status: string; category: string; errorMessage: string | null; wordpressPostId: number | null; wordpressUrl: string | null; seoTitle: string | null; seoDescription: string | null; seoKeywords: string | null; seoSchema: string | null; scheduledAt: string | null; adsenseEnabled: boolean; fetchedAt: string; rewrittenAt: string | null; publishedAt: string | null; createdAt: string; updatedAt: string; siteId: string; feed?: { name: string }; slug?: string | null; excerpt?: string | null; authorId?: string | null; categoryId?: string | null; primaryKeyword?: string | null; secondaryKeywords?: string | null; searchIntent?: string | null; readingTime?: number | null; wordCount?: number | null; seoScore?: number | null; qualityScore?: number | null; author?: { id: string; name: string; avatarUrl?: string | null } | null; seoAnalysis?: { overallScore: number } | null; contentScore?: { overallScore: number } | null; }
export interface ArticlesResponse { articles: Article[]; total: number; page: number; limit: number; }
export interface PublicArticlesResponse { articles: Article[]; total: number; page: number; limit: number; }
export interface AutomationLog { id: string; action: string; status: string; message: string; details: string | null; createdAt: string; }

// ─── Command Centre APIs ─────────────────────────────────────

// Events
export function getEventStats(organizationId: string, siteId?: string, days?: number) { return fetchAPI<any>('/api/command-center/events?' + new URLSearchParams({ organizationId, ...(siteId ? { siteId } : {}), ...(days ? { days: String(days) } : {}) }).toString()); }
export function queryEvents(params: { organizationId: string; siteId?: string; eventType?: string; entityType?: string; page?: number; limit?: number }) { return fetchAPI<any>('/api/command-center/events?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]).toString()); }
export function trackEvent(data: Record<string, unknown>) { return fetchAPI<any>('/api/command-center/events', { method: 'POST', body: JSON.stringify(data) }); }

// Revenue Attribution
export function getAttributions(params: { organizationId: string; siteId?: string; articleId?: string; page?: number; limit?: number }) { return fetchAPI<any>('/api/command-center/attribution?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]).toString()); }
export function getAttributionByArticle(organizationId: string, siteId?: string, days?: number) { return fetchAPI<any>('/api/command-center/attribution?' + new URLSearchParams({ organizationId, action: 'by-article', ...(siteId ? { siteId } : {}), ...(days ? { days: String(days) } : {}) }).toString()); }
export function recordAttribution(data: Record<string, unknown>) { return fetchAPI<any>('/api/command-center/attribution', { method: 'POST', body: JSON.stringify(data) }); }

// Dashboard Snapshots
export function getDashboardSnapshot(organizationId: string, siteId?: string) { return fetchAPI<any>('/api/command-center/dashboard?' + new URLSearchParams({ organizationId, action: 'latest', ...(siteId ? { siteId } : {}) }).toString()); }
export function getDashboardSnapshots(organizationId: string, siteId?: string, limit?: number) { return fetchAPI<any>('/api/command-center/dashboard?' + new URLSearchParams({ organizationId, ...(siteId ? { siteId } : {}), ...(limit ? { limit: String(limit) } : {}) }).toString()); }
export function generateDashboardSnapshot(data: Record<string, unknown>) { return fetchAPI<any>('/api/command-center/dashboard', { method: 'POST', body: JSON.stringify(data) }); }

// Health Scores
export function getHealthScores(organizationId: string, siteId?: string) { return fetchAPI<any>('/api/command-center/health?' + new URLSearchParams({ organizationId, ...(siteId ? { siteId } : {}) }).toString()); }
export function recordHealthScores(data: Record<string, unknown>) { return fetchAPI<any>('/api/command-center/health', { method: 'POST', body: JSON.stringify(data) }); }

// Competitors
export function getCompetitors(organizationId: string, siteId?: string) { return fetchAPI<any>('/api/command-center/competitors?' + new URLSearchParams({ organizationId, ...(siteId ? { siteId } : {}) }).toString()); }
export function getCompetitorStats(organizationId: string) { return fetchAPI<any>('/api/command-center/competitors?' + new URLSearchParams({ organizationId, action: 'stats' }).toString()); }
export function getCompetitorChanges(organizationId: string, limit?: number) { return fetchAPI<any>('/api/command-center/competitors?' + new URLSearchParams({ organizationId, action: 'changes', ...(limit ? { limit: String(limit) } : {}) }).toString()); }
export function createCompetitor(data: Record<string, unknown>) { return fetchAPI<any>('/api/command-center/competitors', { method: 'POST', body: JSON.stringify(data) }); }
export function deleteCompetitor(id: string) { return fetchAPI<any>('/api/command-center/competitors?id=' + id, { method: 'DELETE' }); }

// Workflows
export function getWorkflows(organizationId: string, siteId?: string) { return fetchAPI<any>('/api/command-center/workflows?' + new URLSearchParams({ organizationId, ...(siteId ? { siteId } : {}) }).toString()); }
export function getWorkflowDetail(id: string) { return fetchAPI<any>('/api/command-center/workflows?action=detail&id=' + id); }
export function createWorkflow(data: Record<string, unknown>) { return fetchAPI<any>('/api/command-center/workflows', { method: 'POST', body: JSON.stringify(data) }); }
export function updateWorkflow(data: { id: string; [key: string]: unknown }) { return fetchAPI<any>('/api/command-center/workflows', { method: 'PUT', body: JSON.stringify(data) }); }

// Agents
export function getAgents(organizationId?: string) { return fetchAPI<any>('/api/command-center/agents' + (organizationId ? '?' + new URLSearchParams({ organizationId }).toString() : '')); }
export function getAgentDetail(id: string) { return fetchAPI<any>('/api/command-center/agents?action=detail&id=' + id); }
export function createAgent(data: Record<string, unknown>) { return fetchAPI<any>('/api/command-center/agents', { method: 'POST', body: JSON.stringify(data) }); }

// Economics
export function getEconomicsSummary(siteId: string, periodStart?: string, periodEnd?: string) { return fetchAPI<any>('/api/command-center/economics?' + new URLSearchParams({ siteId, ...(periodStart ? { periodStart } : {}), ...(periodEnd ? { periodEnd } : {}) }).toString()); }
export function getTopEarningArticles(siteId: string, limit?: number) { return fetchAPI<any>('/api/command-center/economics?' + new URLSearchParams({ siteId, action: 'top-earning', ...(limit ? { limit: String(limit) } : {}) }).toString()); }
export function batchCalculateEconomics(data: Record<string, unknown>) { return fetchAPI<any>('/api/command-center/economics', { method: 'POST', body: JSON.stringify(data) }); }

// ─── AI Repurposing ──────────────────────────────────────────
export function getRepurposeFormats() { return fetchAPI<any[]>('/api/ai/repurpose'); }
export function repurposeArticle(data: { articleId: string; siteId: string; format: string }) { return fetchAPI<any>('/api/ai/repurpose', { method: 'POST', body: JSON.stringify(data) }); }
export function batchRepurposeArticle(data: { articleId: string; siteId: string; formats: string[] }) { return fetchAPI<any>('/api/ai/repurpose', { method: 'POST', body: JSON.stringify(data) }); }

// ─── Smart Scheduler ───────────────────────────────────────
export function getSmartSchedule(siteId: string, articleId?: string) { return fetchAPI<any>('/api/ai/smart-schedule?' + new URLSearchParams({ siteId, ...(articleId ? { articleId } : {}) }).toString()); }
export function suggestSmartSchedule(data: { siteId: string; articleId: string }) { return fetchAPI<any>('/api/ai/smart-schedule', { method: 'POST', body: JSON.stringify(data) }); }

// ─── Headline A/B Testing ───────────────────────────────────
export function getHeadlineABTest(siteId: string, articleId: string) { return fetchAPI<any>('/api/ai/headline-ab?' + new URLSearchParams({ siteId, articleId }).toString()); }
export function generateHeadlines(data: { siteId: string; articleId: string }) { return fetchAPI<any>('/api/ai/headline-ab', { method: 'POST', body: JSON.stringify({ action: 'generate', ...data }) }); }
export function createHeadlineTest(data: { siteId: string; articleId: string; variants: string[] }) { return fetchAPI<any>('/api/ai/headline-ab', { method: 'POST', body: JSON.stringify({ action: 'create', ...data }) }); }

// ─── Engagement Scoring ─────────────────────────────────────
export function getArticleEngagement(siteId: string, articleId: string, days?: number) { return fetchAPI<any>('/api/engagement?' + new URLSearchParams({ siteId, articleId, ...(days ? { days: String(days) } : {}) }).toString()); }
export function getSiteEngagement(siteId: string, days?: number) { return fetchAPI<any>('/api/engagement?' + new URLSearchParams({ siteId, ...(days ? { days: String(days) } : {}) }).toString()); }
export function recordEngagementEvent(data: { articleId: string; siteId: string; visitorId: string; scrollDepth: number; timeOnPage: number }) { return fetchAPI<any>('/api/engagement', { method: 'POST', body: JSON.stringify(data) }); }

// ─── Collaboration ───────────────────────────────────────────
export function getCollaborationSession(articleId: string) { return fetchAPI<any>('/api/collaboration?articleId=' + articleId); }
export function getCollabConfig(articleId: string) { return fetchAPI<any>('/api/collaboration?articleId=' + articleId + '&action=config'); }
export function joinCollabSession(data: { articleId: string; userId: string; userName: string }) { return fetchAPI<any>('/api/collaboration', { method: 'POST', body: JSON.stringify({ action: 'join', ...data }) }); }
export function leaveCollabSession(data: { articleId: string; userId: string }) { return fetchAPI<any>('/api/collaboration', { method: 'POST', body: JSON.stringify({ action: 'leave', ...data }) }); }

// ─── Tier 2: Internal Linking ───────────────────────────────
export function getInternalLinkAnalysis(siteId: string, articleId: string) { return fetchAPI<any>('/api/ai/internal-links?' + new URLSearchParams({ siteId, articleId }).toString()); }
export function applyInternalLink(data: { articleId: string; targetArticleId: string; siteId: string }) { return fetchAPI<any>('/api/ai/internal-links', { method: 'POST', body: JSON.stringify(data) }); }

// ─── Tier 2: Content Brief ──────────────────────────────────
export function generateContentBrief(data: { topic: string; siteId: string; targetAudience?: string; brandVoice?: string; niche?: string }) { return fetchAPI<any>('/api/ai/content-brief', { method: 'POST', body: JSON.stringify(data) }); }
export function generateBriefForArticle(siteId: string, articleId: string) { return fetchAPI<any>('/api/ai/content-brief?siteId=' + siteId + '&articleId=' + articleId); }

// ─── Tier 2: Translation ────────────────────────────────────
export function getSupportedLanguages() { return fetchAPI<any[]>('/api/ai/translate?action=languages'); }
export function translateArticle(data: { articleId: string; siteId: string; targetLanguage: string }) { return fetchAPI<any>('/api/ai/translate', { method: 'POST', body: JSON.stringify(data) }); }
export function batchTranslateArticle(data: { articleId: string; siteId: string; targetLanguages: string[] }) { return fetchAPI<any>('/api/ai/translate', { method: 'POST', body: JSON.stringify({ action: 'batch', ...data }) }); }

// ─── Tier 2: Voice to Content ───────────────────────────────
export function voiceTranscribe(data: { audioData?: string; audioUrl?: string; siteId: string }) { return fetchAPI<any>('/api/ai/voice-to-content', { method: 'POST', body: JSON.stringify({ action: 'transcribe', ...data }) }); }
export function voiceToArticle(data: { transcriptionText: string; siteId: string; targetWordCount?: number; tone?: string }) { return fetchAPI<any>('/api/ai/voice-to-content', { method: 'POST', body: JSON.stringify({ action: 'generate', ...data }) }); }

// ─── Tier 2: Visual Content ─────────────────────────────────
export function generateVisualContent(data: { siteId: string; type?: string; title: string; description?: string; style?: string; articleId?: string }) { return fetchAPI<any>('/api/ai/visual-content', { method: 'POST', body: JSON.stringify(data) }); }
export function getVisualTemplates(type?: string) { return fetchAPI<any[]>('/api/ai/visual-content' + (type ? `?type=${type}` : '')); }
