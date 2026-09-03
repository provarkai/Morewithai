// ─── Product Type ──────────────────────────────────────────────

export const PRODUCT_TYPE = {
  EBOOK: 'EBOOK',
  TEMPLATE: 'TEMPLATE',
  CHECKLIST: 'CHECKLIST',
  COURSE: 'COURSE',
  REPORT: 'REPORT',
  TOOL: 'TOOL',
  MEMBERSHIP: 'MEMBERSHIP',
  SERVICE: 'SERVICE',
} as const;

export type ProductType = (typeof PRODUCT_TYPE)[keyof typeof PRODUCT_TYPE];

// ─── Product Status ────────────────────────────────────────────

export const PRODUCT_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];

// ─── Purchase Status ───────────────────────────────────────────

export const PURCHASE_STATUS = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export type PurchaseStatus = (typeof PURCHASE_STATUS)[keyof typeof PURCHASE_STATUS];

// ─── Input Types ───────────────────────────────────────────────

export interface CreateProductInput {
  siteId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency?: string;
  productType?: ProductType;
  checkoutUrl?: string;
  imageUrl?: string;
  authorId?: string;
  status?: ProductStatus;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string;
  price?: number;
  currency?: string;
  productType?: ProductType;
  checkoutUrl?: string;
  imageUrl?: string;
  authorId?: string;
  status?: ProductStatus;
}

export interface RecordPurchaseInput {
  siteId: string;
  productId: string;
  articleId?: string;
  subscriberId?: string;
  email: string;
  amount: number;
  currency?: string;
  transactionId?: string;
  provider?: string;
}

export interface ProductListFilters {
  productType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface PurchaseListFilters {
  productId?: string;
  articleId?: string;
  status?: string;
  page?: number;
  limit?: number;
}
