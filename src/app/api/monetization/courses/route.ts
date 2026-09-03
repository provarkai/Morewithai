import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { createCourse, getCourses, updateCourse, deleteCourse, getCourseContent, addChapter, addLesson, getCourseAnalytics } from '@/lib/monetization/course-builder.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('articles.view');
    const siteId = req.nextUrl.searchParams.get('siteId');
    const action = req.nextUrl.searchParams.get('action');
    const courseId = req.nextUrl.searchParams.get('courseId');
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    if (action === 'analytics') return NextResponse.json(await getCourseAnalytics(siteId));
    if (courseId && action === 'content') return NextResponse.json(await getCourseContent(courseId));
    return NextResponse.json(await getCourses(siteId));
  } catch (error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { action, siteId, courseId, chapterId, ...data } = body;
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
    switch (action) {
      case 'create': return NextResponse.json(await createCourse(siteId, data));
      case 'update': return NextResponse.json(await updateCourse(courseId, siteId, data));
      case 'delete': return NextResponse.json({ deleted: await deleteCourse(courseId, siteId) });
      case 'add-chapter': return NextResponse.json(await addChapter(courseId, data));
      case 'add-lesson': return NextResponse.json(await addLesson(courseId, chapterId, data));
      default: return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 }); }
}
