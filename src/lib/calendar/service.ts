import { db } from '@/lib/db';
import { callAI, cleanAIResponse } from '@/lib/ai/client';
import type { CreateCalendarEventInput, UpdateCalendarEventInput, CalendarEventFilters } from '@/lib/growth/types';

// ─── CRUD ─────────────────────────────────────────────────────

export async function createEvent(data: CreateCalendarEventInput) {
  return db.contentCalendarEvent.create({
    data: {
      siteId: data.siteId,
      articleId: data.articleId ?? null,
      eventType: data.eventType,
      title: data.title,
      description: data.description ?? null,
      scheduledDate: new Date(data.scheduledDate),
      priority: data.priority ?? 'MEDIUM',
    },
  });
}

export async function listEvents(siteId: string, filters?: CalendarEventFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 50;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { siteId };
  if (filters?.eventType) where.eventType = filters.eventType;
  if (filters?.status) where.status = filters.status;
  if (filters?.startDate) {
    (where as any).scheduledDate = { ...(where as any).scheduledDate, gte: new Date(filters.startDate) };
  }
  if (filters?.endDate) {
    (where as any).scheduledDate = { ...(where as any).scheduledDate, lte: new Date(filters.endDate) };
  }

  const [data, total] = await Promise.all([
    db.contentCalendarEvent.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
      skip,
      take: limit,
      include: { article: { select: { id: true, title: true, slug: true } } },
    }),
    db.contentCalendarEvent.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getEvent(id: string, siteId: string) {
  return db.contentCalendarEvent.findFirst({
    where: { id, siteId },
    include: { article: { select: { id: true, title: true, slug: true } } },
  });
}

export async function updateEvent(id: string, siteId: string, data: UpdateCalendarEventInput) {
  const updateData: Record<string, unknown> = {};
  if (data.eventType !== undefined) updateData.eventType = data.eventType;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.scheduledDate !== undefined) updateData.scheduledDate = new Date(data.scheduledDate);
  if (data.status !== undefined) updateData.status = data.status;
  if (data.priority !== undefined) updateData.priority = data.priority;

  return db.contentCalendarEvent.update({
    where: { id, siteId },
    data: updateData,
  });
}

export async function deleteEvent(id: string, siteId: string) {
  return db.contentCalendarEvent.delete({ where: { id, siteId } });
}

// ─── Calendar Month View ──────────────────────────────────────

export async function getCalendarMonth(siteId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const events = await db.contentCalendarEvent.findMany({
    where: {
      siteId,
      scheduledDate: { gte: startDate, lte: endDate },
    },
    orderBy: { scheduledDate: 'asc' },
    include: { article: { select: { id: true, title: true, slug: true } } },
  });

  // Group by date
  const grouped: Record<string, typeof events> = {};
  for (const event of events) {
    const dateKey = new Date(event.scheduledDate).toISOString().split('T')[0];
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(event);
  }

  return {
    year,
    month,
    events,
    groupedByDate: grouped,
  };
}

// ─── AI Calendar Suggestions ──────────────────────────────────

export async function generateCalendarSuggestions(siteId: string) {
  // Gather context
  const [publishedArticles, openOpportunities, recentEvents] = await Promise.all([
    db.article.findMany({
      where: { siteId, status: 'published' },
      select: { id: true, title: true, publishedAt: true, primaryKeyword: true },
      orderBy: { publishedAt: 'desc' },
      take: 15,
    }),
    db.contentOpportunity.findMany({
      where: { siteId, status: 'OPEN', priority: { in: ['HIGH', 'CRITICAL'] } },
      select: { id: true, title: true, type: true, priority: true },
      take: 10,
    }),
    db.contentCalendarEvent.findMany({
      where: { siteId, scheduledDate: { gte: new Date() } },
      select: { title: true, scheduledDate: true },
      take: 10,
    }),
  ]);

  const response = await callAI({
    siteId,
    jobType: 'CALENDAR_SUGGESTIONS',
    systemPrompt:
      'You are a content calendar strategist. Based on the published articles, open opportunities, and existing calendar, suggest 5 content calendar entries. For each suggestion: title, description (1-2 sentences), eventType (PUBLISH/UPDATE/PROMOTE/MONETIZE/REPURPOSE), priority (LOW/MEDIUM/HIGH), and daysFromNow (number of days from today to schedule). Return ONLY a valid JSON array.',
    userPrompt: `Published Articles (recent):
${publishedArticles.map((a) => `- ${a.title} (${a.primaryKeyword ?? 'no keyword'}, published ${a.publishedAt?.toISOString().split('T')[0] ?? 'unknown'})`).join('\n')}

Open Opportunities:
${openOpportunities.map((o) => `- [${o.type}/${o.priority}] ${o.title}`).join('\n')}

Existing Calendar:
${recentEvents.map((e) => `- ${e.title} (${e.scheduledDate.toISOString().split('T')[0]})`).join('\n')}`,
  });

  let suggestions: Array<{
    title: string;
    description?: string;
    eventType: string;
    priority: string;
    daysFromNow: number;
  }>;

  try {
    const parsed = JSON.parse(cleanAIResponse(response.content));
    suggestions = Array.isArray(parsed) ? parsed : [];
  } catch {
    suggestions = [];
  }

  const validEventTypes = ['PUBLISH', 'UPDATE', 'PROMOTE', 'MONETIZE', 'REPURPOSE'];
  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  const events = await Promise.all(
    suggestions.map((s) => {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + (s.daysFromNow ?? 7));

      return createEvent({
        siteId,
        eventType: (validEventTypes.includes(s.eventType) ? s.eventType : 'PROMOTE') as any,
        title: s.title,
        description: s.description,
        scheduledDate,
        priority: (validPriorities.includes(s.priority) ? s.priority : 'MEDIUM') as any,
      });
    })
  );

  return events;
}
