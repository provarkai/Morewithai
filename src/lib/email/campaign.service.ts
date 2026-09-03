import { db } from '@/lib/db';
import { CAMPAIGN_TYPE, CAMPAIGN_STATUS, EVENT_TYPE, type CreateCampaignInput } from './types';
import { getEmailProvider } from './provider';
import { trackEvent, updateCampaignCounts } from './events.service';

export async function createCampaign(data: CreateCampaignInput) {
  if (!data.name?.trim()) throw new Error('Campaign name is required');
  if (!data.subject?.trim()) throw new Error('Campaign subject is required');
  if (!data.content?.trim()) throw new Error('Campaign content is required');

  const type = data.type && Object.values(CAMPAIGN_TYPE).includes(data.type as never)
    ? data.type
    : CAMPAIGN_TYPE.NEWSLETTER;

  return db.emailCampaign.create({
    data: {
      siteId: data.siteId,
      name: data.name.trim(),
      type,
      subject: data.subject.trim(),
      previewText: data.previewText?.trim() ?? null,
      content: data.content,
      status: CAMPAIGN_STATUS.DRAFT,
    },
  });
}

export async function listCampaigns(
  siteId: string,
  filters?: {
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  },
) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const where: Record<string, unknown> = { siteId };

  if (filters?.type) where.type = filters.type;
  if (filters?.status) where.status = filters.status;

  const [campaigns, total] = await Promise.all([
    db.emailCampaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { events: true },
        },
      },
    }),
    db.emailCampaign.count({ where }),
  ]);

  return { campaigns, total, page, limit };
}

export async function getCampaign(id: string, siteId: string) {
  const campaign = await db.emailCampaign.findFirst({
    where: { id, siteId },
    include: {
      _count: {
        select: { events: true },
      },
    },
  });

  if (!campaign) throw new Error('Campaign not found');

  return campaign;
}

export async function updateCampaign(
  id: string,
  siteId: string,
  data: Partial<Pick<CreateCampaignInput, 'name' | 'type' | 'subject' | 'previewText' | 'content'>>,
) {
  const existing = await db.emailCampaign.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Campaign not found');
  if (existing.status !== CAMPAIGN_STATUS.DRAFT) {
    throw new Error('Only DRAFT campaigns can be edited');
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.type !== undefined) updateData.type = data.type;
  if (data.subject !== undefined) updateData.subject = data.subject.trim();
  if (data.previewText !== undefined) updateData.previewText = data.previewText?.trim() ?? null;
  if (data.content !== undefined) updateData.content = data.content;

  return db.emailCampaign.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteCampaign(id: string, siteId: string) {
  const existing = await db.emailCampaign.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Campaign not found');
  if (existing.status !== CAMPAIGN_STATUS.DRAFT) {
    throw new Error('Only DRAFT campaigns can be deleted');
  }

  // Delete related events first, then the campaign
  await db.emailEvent.deleteMany({ where: { campaignId: id } });
  return db.emailCampaign.delete({ where: { id } });
}

export async function scheduleCampaign(id: string, siteId: string, scheduledAt: Date) {
  const existing = await db.emailCampaign.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Campaign not found');
  if (existing.status !== CAMPAIGN_STATUS.DRAFT) {
    throw new Error('Only DRAFT campaigns can be scheduled');
  }

  return db.emailCampaign.update({
    where: { id },
    data: {
      status: CAMPAIGN_STATUS.SCHEDULED,
      scheduledAt,
    },
  });
}

/**
 * Sends a campaign to all SUBSCRIBED subscribers for the site.
 * Fire-and-forget: processes all subscribers sequentially, creates SENT events,
 * and updates counts when done.
 */
export async function sendCampaign(id: string, siteId: string) {
  const campaign = await db.emailCampaign.findFirst({ where: { id, siteId } });
  if (!campaign) throw new Error('Campaign not found');

  if (campaign.status !== CAMPAIGN_STATUS.DRAFT && campaign.status !== CAMPAIGN_STATUS.SCHEDULED) {
    throw new Error(`Cannot send campaign with status: ${campaign.status}`);
  }

  // Mark as SENDING
  await db.emailCampaign.update({
    where: { id },
    data: { status: CAMPAIGN_STATUS.SENDING },
  });

  try {
    const provider = await getEmailProvider(siteId);

    // Fetch all SUBSCRIBED subscribers for the site
    const subscribers = await db.subscriber.findMany({
      where: { siteId, status: 'SUBSCRIBED' },
      select: { id: true, email: true, firstName: true },
    });

    if (subscribers.length === 0) {
      await db.emailCampaign.update({
        where: { id },
        data: { status: CAMPAIGN_STATUS.SENT, sentAt: new Date(), subscriberCount: 0 },
      });
      return { sent: 0, failed: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const subscriber of subscribers) {
      try {
        const result = await provider.send(subscriber.email, campaign.subject, campaign.content, {
          previewText: campaign.previewText ?? undefined,
        });

        if (result.success) {
          await trackEvent({
            siteId,
            campaignId: id,
            subscriberId: subscriber.id,
            type: EVENT_TYPE.SENT,
            metadata: { messageId: result.messageId, email: subscriber.email },
          });
          sentCount++;
        } else {
          failedCount++;
          console.error(`[email] Failed to send to ${subscriber.email}: ${result.error}`);
        }
      } catch (err) {
        failedCount++;
        console.error(`[email] Error sending to ${subscriber.email}:`, err);
      }
    }

    // Update campaign status and counts
    await db.emailCampaign.update({
      where: { id },
      data: {
        status: CAMPAIGN_STATUS.SENT,
        sentAt: new Date(),
        subscriberCount: sentCount,
      },
    });

    // Recalculate event-based counts
    await updateCampaignCounts(id);

    return { sent: sentCount, failed: failedCount };
  } catch (error) {
    // Mark as FAILED on any unexpected error
    await db.emailCampaign.update({
      where: { id },
      data: { status: CAMPAIGN_STATUS.FAILED },
    });
    throw error;
  }
}

export async function getCampaignStats(siteId: string) {
  const [total, byType, byStatus, totals] = await Promise.all([
    db.emailCampaign.count({ where: { siteId } }),

    // Count by type
    db.emailCampaign.groupBy({
      by: ['type'],
      where: { siteId },
      _count: { id: true },
    }),

    // Count by status
    db.emailCampaign.groupBy({
      by: ['status'],
      where: { siteId },
      _count: { id: true },
    }),

    // Aggregate totals
    db.emailCampaign.aggregate({
      where: { siteId },
      _sum: {
        openCount: true,
        clickCount: true,
        bounceCount: true,
        unsubscribeCount: true,
        subscriberCount: true,
      },
    }),
  ]);

  const byTypeMap: Record<string, number> = {};
  for (const item of byType) {
    byTypeMap[item.type] = item._count.id;
  }

  const byStatusMap: Record<string, number> = {};
  for (const item of byStatus) {
    byStatusMap[item.status] = item._count.id;
  }

  return {
    total,
    byType: byTypeMap,
    byStatus: byStatusMap,
    totals: {
      opens: totals._sum.openCount ?? 0,
      clicks: totals._sum.clickCount ?? 0,
      bounces: totals._sum.bounceCount ?? 0,
      unsubscribes: totals._sum.unsubscribeCount ?? 0,
      emailsSent: totals._sum.subscriberCount ?? 0,
    },
  };
}
