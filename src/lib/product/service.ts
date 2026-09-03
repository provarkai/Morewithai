import { db } from '@/lib/db';
import type { CreateProductInput, UpdateProductInput, RecordPurchaseInput, ProductListFilters, PurchaseListFilters } from './types';

// ─── Create Product ───────────────────────────────────────────

export async function createProduct(data: CreateProductInput) {
  const product = await db.product.create({
    data: {
      siteId: data.siteId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: data.price,
      currency: data.currency ?? 'NGN',
      productType: data.productType ?? 'EBOOK',
      checkoutUrl: data.checkoutUrl ?? null,
      imageUrl: data.imageUrl ?? null,
      authorId: data.authorId ?? null,
      status: data.status ?? 'DRAFT',
    },
  });
  return product;
}

// ─── List Products (paginated) ────────────────────────────────

export async function listProducts(siteId: string, filters?: ProductListFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { siteId };
  if (filters?.productType) where.productType = filters.productType;
  if (filters?.status) where.status = filters.status;

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        author: { select: { id: true, name: true } },
      },
    }),
    db.product.count({ where }),
  ]);

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Get Single Product ───────────────────────────────────────

export async function getProduct(id: string, siteId: string) {
  const product = await db.product.findFirst({
    where: { id, siteId },
    include: {
      author: { select: { id: true, name: true } },
    },
  });
  return product;
}

// ─── Update Product ───────────────────────────────────────────

export async function updateProduct(id: string, siteId: string, data: Partial<UpdateProductInput>) {
  const existing = await db.product.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Product not found');

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.productType !== undefined) updateData.productType = data.productType;
  if (data.checkoutUrl !== undefined) updateData.checkoutUrl = data.checkoutUrl;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.authorId !== undefined) updateData.authorId = data.authorId;
  if (data.status !== undefined) updateData.status = data.status;

  const product = await db.product.update({
    where: { id },
    data: updateData,
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  return product;
}

// ─── Delete Product (archive) ─────────────────────────────────

export async function deleteProduct(id: string, siteId: string) {
  const existing = await db.product.findFirst({ where: { id, siteId } });
  if (!existing) throw new Error('Product not found');

  await db.product.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });

  return { success: true };
}

// ─── Record Purchase ──────────────────────────────────────────

export async function recordPurchase(data: RecordPurchaseInput) {
  // Verify product exists
  const product = await db.product.findFirst({
    where: { id: data.productId, siteId: data.siteId },
  });
  if (!product) throw new Error('Product not found');

  const currency = data.currency ?? 'NGN';

  const [purchase] = await Promise.all([
    db.productPurchase.create({
      data: {
        siteId: data.siteId,
        productId: data.productId,
        articleId: data.articleId ?? null,
        subscriberId: data.subscriberId ?? null,
        email: data.email,
        amount: data.amount,
        currency,
        status: 'COMPLETED',
        transactionId: data.transactionId ?? null,
        provider: data.provider ?? null,
      },
    }),
    db.product.update({
      where: { id: data.productId },
      data: {
        purchaseCount: { increment: 1 },
        revenueGenerated: { increment: data.amount },
      },
    }),
    db.revenueEvent.create({
      data: {
        siteId: data.siteId,
        articleId: data.articleId ?? null,
        sourceType: 'PRODUCT',
        sourceId: data.productId,
        amount: data.amount,
        currency,
        status: 'CONFIRMED',
      },
    }),
  ]);

  return purchase;
}

// ─── List Purchases ───────────────────────────────────────────

export async function listPurchases(siteId: string, filters?: PurchaseListFilters) {
  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { siteId };
  if (filters?.productId) where.productId = filters.productId;
  if (filters?.articleId) where.articleId = filters.articleId;
  if (filters?.status) where.status = filters.status;

  const [purchases, total] = await Promise.all([
    db.productPurchase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        product: { select: { id: true, name: true } },
      },
    }),
    db.productPurchase.count({ where }),
  ]);

  return {
    data: purchases,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Product Stats ────────────────────────────────────────────

export async function getProductStats(siteId: string) {
  const [total, active, revenueResult, topProducts] = await Promise.all([
    db.product.count({ where: { siteId } }),
    db.product.count({ where: { siteId, status: 'ACTIVE' } }),
    db.product.aggregate({
      where: { siteId },
      _sum: { revenueGenerated: true },
    }),
    db.product.findMany({
      where: { siteId, status: { not: 'ARCHIVED' } },
      orderBy: { revenueGenerated: 'desc' },
      take: 5,
      select: { id: true, name: true, purchaseCount: true, revenueGenerated: true },
    }),
  ]);

  return {
    totalProducts: total,
    activeProducts: active,
    totalRevenue: revenueResult._sum.revenueGenerated ?? 0,
    topProducts,
  };
}
