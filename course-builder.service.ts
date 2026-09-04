import { db } from '@/lib/db';
import { createProductCheckoutSession } from '@/lib/stripe/service';

// ─── Types ──────────────────────────────────────────────────

export interface Course {
  id: string;
  siteId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  status: string;
  purchaseCount: number;
  revenueGenerated: number;
  chapters: CourseChapter[];
  totalLessons: number;
  totalDuration: number; // minutes
  createdAt: string;
}

export interface CourseChapter {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  title: string;
  type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'DOWNLOAD';
  content: string;
  duration: number; // minutes
  isPreview: boolean;
  order: number;
}

// ─── Content helpers (persisted as JSON on Product.content) ─

function parseContent(content: string | null): CourseChapter[] {
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function summarize(chapters: CourseChapter[]) {
  const totalLessons = chapters.reduce((s, c) => s + c.lessons.length, 0);
  const totalDuration = chapters.reduce(
    (s, c) => s + c.lessons.reduce((ls, l) => ls + l.duration, 0),
    0,
  );
  return { totalLessons, totalDuration };
}

function toCourse(p: {
  id: string; name: string; slug: string; description: string; price: number;
  currency: string; imageUrl: string | null; status: string; purchaseCount: number;
  revenueGenerated: number; content: string | null; createdAt: Date;
}, siteId: string): Course {
  const chapters = parseContent(p.content);
  const { totalLessons, totalDuration } = summarize(chapters);
  return {
    id: p.id,
    siteId,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    currency: p.currency,
    imageUrl: p.imageUrl,
    status: p.status,
    purchaseCount: p.purchaseCount,
    revenueGenerated: p.revenueGenerated,
    chapters,
    totalLessons,
    totalDuration,
    createdAt: p.createdAt.toISOString(),
  };
}

// ─── Course Management ──────────────────────────────────────

export async function createCourse(
  siteId: string,
  data: { name: string; description: string; price: number; imageUrl?: string },
): Promise<Course> {
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const product = await db.product.create({
    data: {
      siteId,
      name: data.name,
      slug,
      description: data.description,
      price: data.price,
      currency: 'NGN',
      productType: 'COURSE',
      imageUrl: data.imageUrl || null,
      status: 'DRAFT',
      content: JSON.stringify([]),
    },
  });

  return toCourse(product, siteId);
}

export async function getCourses(siteId: string): Promise<Course[]> {
  const products = await db.product.findMany({
    where: { siteId, productType: 'COURSE' },
    orderBy: { createdAt: 'desc' },
  });
  return products.map((p) => toCourse(p, siteId));
}

export async function updateCourse(
  courseId: string,
  siteId: string,
  data: Partial<{ name: string; description: string; price: number; imageUrl: string; status: string }>,
): Promise<Course | null> {
  const product = await db.product.findFirst({ where: { id: courseId, siteId } });
  if (!product) return null;

  const updated = await db.product.update({
    where: { id: courseId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.price !== undefined ? { price: data.price } : {}),
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });

  return toCourse(updated, siteId);
}

export async function deleteCourse(courseId: string, siteId: string): Promise<boolean> {
  const product = await db.product.findFirst({ where: { id: courseId, siteId } });
  if (!product) return false;
  await db.product.delete({ where: { id: courseId } });
  return true;
}

// ─── Course Content (persisted as JSON on Product.content) ──

export async function getCourseContent(courseId: string): Promise<CourseChapter[]> {
  const product = await db.product.findUnique({ where: { id: courseId }, select: { content: true } });
  return parseContent(product?.content ?? null);
}

export async function updateCourseContent(
  courseId: string,
  chapters: CourseChapter[],
): Promise<CourseChapter[]> {
  await db.product.update({ where: { id: courseId }, data: { content: JSON.stringify(chapters) } });
  return chapters;
}

export async function addChapter(
  courseId: string,
  data: { title: string; description: string },
): Promise<CourseChapter> {
  const chapters = await getCourseContent(courseId);
  const chapter: CourseChapter = {
    id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: data.title,
    description: data.description,
    order: chapters.length + 1,
    lessons: [],
  };
  chapters.push(chapter);
  await updateCourseContent(courseId, chapters);
  return chapter;
}

export async function addLesson(
  courseId: string,
  chapterId: string,
  data: { title: string; type: CourseLesson['type']; content: string; duration: number; isPreview?: boolean },
): Promise<CourseLesson> {
  const chapters = await getCourseContent(courseId);
  const chapter = chapters.find((c) => c.id === chapterId);
  if (!chapter) throw new Error('Chapter not found');

  const lesson: CourseLesson = {
    id: `ls-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: data.title,
    type: data.type,
    content: data.content,
    duration: data.duration,
    isPreview: data.isPreview || false,
    order: chapter.lessons.length + 1,
  };
  chapter.lessons.push(lesson);
  await updateCourseContent(courseId, chapters);
  return lesson;
}

// ─── Checkout & Access ───────────────────────────────────────

/**
 * Starts a real Stripe checkout for a reader buying this course.
 * Does NOT grant access — access is only granted once the webhook
 * confirms payment (see handleProductPurchaseComplete in stripe/service.ts).
 */
export async function createCourseCheckoutSession(
  courseId: string,
  email: string,
  successUrl: string,
  cancelUrl: string,
) {
  return createProductCheckoutSession({ productId: courseId, email, successUrl, cancelUrl });
}

/**
 * Whether this email has a completed purchase for this course.
 * Use this to gate lesson content on a "my courses" / course player page.
 */
export async function getCourseAccess(courseId: string, email: string): Promise<boolean> {
  const purchase = await db.productPurchase.findFirst({
    where: { productId: courseId, email, status: 'COMPLETED' },
  });
  return !!purchase;
}

export async function getCourseAnalytics(siteId: string): Promise<{
  totalCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
  topCourses: { name: string; enrollments: number; revenue: number }[];
}> {
  const courses = await db.product.findMany({
    where: { siteId, productType: 'COURSE' },
    select: { name: true, purchaseCount: true, revenueGenerated: true },
    orderBy: { revenueGenerated: 'desc' },
  });

  return {
    totalCourses: courses.length,
    totalEnrollments: courses.reduce((s, c) => s + c.purchaseCount, 0),
    totalRevenue: courses.reduce((s, c) => s + c.revenueGenerated, 0),
    topCourses: courses.slice(0, 10).map((c) => ({
      name: c.name,
      enrollments: c.purchaseCount,
      revenue: c.revenueGenerated,
    })),
  };
}
