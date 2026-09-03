import { db } from '@/lib/db';

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

export interface CourseEnrollment {
  id: string;
  courseId: string;
  subscriberId: string;
  progress: number; // 0-100
  completedLessons: string[];
  enrolledAt: string;
  lastAccessedAt: string;
}

// ─── Course Management ──────────────────────────────────────

export async function createCourse(
  siteId: string,
  data: {
    name: string;
    description: string;
    price: number;
    imageUrl?: string;
  },
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
    },
  });

  return {
    id: product.id,
    siteId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    currency: product.currency,
    imageUrl: product.imageUrl,
    status: product.status,
    purchaseCount: product.purchaseCount,
    revenueGenerated: product.revenueGenerated,
    chapters: [],
    totalLessons: 0,
    totalDuration: 0,
    createdAt: product.createdAt.toISOString(),
  };
}

export async function getCourses(siteId: string): Promise<Course[]> {
  const products = await db.product.findMany({
    where: { siteId, productType: 'COURSE' },
    orderBy: { createdAt: 'desc' },
  });

  return products.map((p) => ({
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
    chapters: [],
    totalLessons: 0,
    totalDuration: 0,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function updateCourse(
  courseId: string,
  siteId: string,
  data: Partial<{ name: string; description: string; price: number; imageUrl: string; status: string }>,
): Promise<Course | null> {
  const product = await db.product.findFirst({
    where: { id: courseId, siteId },
  });
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

  return {
    id: updated.id,
    siteId,
    name: updated.name,
    slug: updated.slug,
    description: updated.description,
    price: updated.price,
    currency: updated.currency,
    imageUrl: updated.imageUrl,
    status: updated.status,
    purchaseCount: updated.purchaseCount,
    revenueGenerated: updated.revenueGenerated,
    chapters: [],
    totalLessons: 0,
    totalDuration: 0,
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteCourse(courseId: string, siteId: string): Promise<boolean> {
  const product = await db.product.findFirst({ where: { id: courseId, siteId } });
  if (!product) return false;
  await db.product.delete({ where: { id: courseId } });
  return true;
}

// ─── Course Content (stored as JSON in product metadata) ────

const courseContent = new Map<string, CourseChapter[]>();

export async function getCourseContent(courseId: string): Promise<CourseChapter[]> {
  return courseContent.get(courseId) || [];
}

export async function updateCourseContent(
  courseId: string,
  chapters: CourseChapter[],
): Promise<CourseChapter[]> {
  courseContent.set(courseId, chapters);
  return chapters;
}

export async function addChapter(
  courseId: string,
  data: { title: string; description: string },
): Promise<CourseChapter> {
  const chapters = courseContent.get(courseId) || [];
  const chapter: CourseChapter = {
    id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: data.title,
    description: data.description,
    order: chapters.length + 1,
    lessons: [],
  };
  chapters.push(chapter);
  courseContent.set(courseId, chapters);
  return chapter;
}

export async function addLesson(
  courseId: string,
  chapterId: string,
  data: { title: string; type: CourseLesson['type']; content: string; duration: number; isPreview?: boolean },
): Promise<CourseLesson> {
  const chapters = courseContent.get(courseId) || [];
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
  courseContent.set(courseId, chapters);
  return lesson;
}

// ─── Enrollment & Progress ──────────────────────────────────

export async function enrollInCourse(
  courseId: string,
  subscriberId: string,
): Promise<CourseEnrollment> {
  const product = await db.product.findUnique({ where: { id: courseId } });
  if (!product) throw new Error('Course not found');

  await db.productPurchase.create({
    data: {
      siteId: product.siteId,
      productId: courseId,
      subscriberId,
      email: `user-${subscriberId}@placeholder.com`,
      amount: product.price,
      currency: product.currency,
      status: 'COMPLETED',
    },
  });

  await db.product.update({
    where: { id: courseId },
    data: { purchaseCount: { increment: 1 }, revenueGenerated: { increment: product.price } },
  });

  return {
    id: `enrollment-${Date.now()}`,
    courseId,
    subscriberId,
    progress: 0,
    completedLessons: [],
    enrolledAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
  };
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
