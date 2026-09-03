import { db } from '@/lib/db';

const LEAD_MAGNET_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DRAFT: 'DRAFT',
} as const;

export interface CreateLeadMagnetInput {
  siteId: string;
  name: string;
  title: string;
  description?: string;
  fileType?: string;
  fileUrl?: string;
  ctaText: string;
  ctaDescription?: string;
  thankYouMessage?: string;
  thankYouUrl?: string;
  emailSequenceId?: string;
}

export async function createLeadMagnet(data: CreateLeadMagnetInput) {
  const { siteId, name, title, description, fileType, fileUrl, ctaText, ctaDescription, thankYouMessage, thankYouUrl, emailSequenceId } = data;

  return (db as any).leadMagnet.create({
    data: {
      siteId,
      name,
      title,
      description: description ?? null,
      fileType: fileType ?? null,
      fileUrl: fileUrl ?? null,
      ctaText,
      ctaDescription: ctaDescription ?? null,
      thankYouMessage: thankYouMessage ?? null,
      thankYouUrl: thankYouUrl ?? null,
      emailSequenceId: emailSequenceId ?? null,
      status: LEAD_MAGNET_STATUS.ACTIVE,
    },
  });
}

export async function listLeadMagnets(
  siteId: string,
  filters?: { status?: string },
) {
  const where: Record<string, unknown> = { siteId };
  if (filters?.status) where.status = filters.status;

  return db.leadMagnet.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { leads: true, ctas: true } },
    },
  });
}

export async function getLeadMagnet(id: string, siteId: string) {
  return db.leadMagnet.findFirst({
    where: { id, siteId },
    include: {
      _count: { select: { leads: true, ctas: true } },
    },
  });
}

export async function updateLeadMagnet(
  id: string,
  siteId: string,
  data: Partial<CreateLeadMagnetInput> & { status?: string },
) {
  const existing = await db.leadMagnet.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Lead magnet not found');

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.fileType !== undefined) updateData.fileType = data.fileType;
  if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;
  if (data.ctaText !== undefined) updateData.ctaText = data.ctaText;
  if (data.ctaDescription !== undefined) updateData.ctaDescription = data.ctaDescription;
  if (data.thankYouMessage !== undefined) updateData.thankYouMessage = data.thankYouMessage;
  if (data.thankYouUrl !== undefined) updateData.thankYouUrl = data.thankYouUrl;
  if (data.emailSequenceId !== undefined) updateData.emailSequenceId = data.emailSequenceId;
  if (data.status !== undefined) updateData.status = data.status;

  return db.leadMagnet.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteLeadMagnet(id: string, siteId: string) {
  const existing = await db.leadMagnet.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Lead magnet not found');

  return db.leadMagnet.update({
    where: { id },
    data: { status: LEAD_MAGNET_STATUS.INACTIVE },
  });
}

export async function getLeadMagnetStats(siteId: string) {
  const [total, active, totalDeliveries, magnets] = await Promise.all([
    db.leadMagnet.count({ where: { siteId } }),
    db.leadMagnet.count({ where: { siteId, status: LEAD_MAGNET_STATUS.ACTIVE } }),
    db.leadMagnet.aggregate({
      where: { siteId },
      _sum: { deliveryCount: true },
    }),
    db.leadMagnet.findMany({
      where: { siteId },
      orderBy: { deliveryCount: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        title: true,
        status: true,
        deliveryCount: true,
        _count: { select: { leads: true } },
      },
    }),
  ]);

  return {
    total,
    active,
    totalDeliveries: totalDeliveries._sum.deliveryCount ?? 0,
    topPerformers: magnets,
  };
}
