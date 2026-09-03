import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/guards';
import { getDashboardLayout, updateDashboardLayout, addWidget, removeWidget, getWidgetData, getAvailableWidgetTypes } from '@/lib/dashboard/dashboard-widgets.service';

export async function GET(req: NextRequest) {
  try {
    await requirePermission('articles.view');
    const siteId = req.nextUrl.searchParams.get('siteId');
    const action = req.nextUrl.searchParams.get('action');
    const widgetType = req.nextUrl.searchParams.get('widgetType');

    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    if (action === 'types') {
      return NextResponse.json(getAvailableWidgetTypes());
    }

    const layout = getDashboardLayout(siteId);

    if (widgetType) {
      const widget = layout.widgets.find((w) => w.type === widgetType);
      if (widget) {
        const data = await getWidgetData(siteId, widget);
        return NextResponse.json({ widget, data });
      }
    }

    // Fetch data for all widgets
    const widgetData = await Promise.all(
      layout.widgets.map(async (w) => ({
        widget: w,
        data: await getWidgetData(siteId, w),
      }))
    );

    return NextResponse.json({ layout, widgetData });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission('articles.edit');
    const body = await req.json();
    const { siteId, action, widgets, widget } = body;
    if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

    if (action === 'update-layout' && Array.isArray(widgets)) {
      const layout = updateDashboardLayout(siteId, widgets);
      return NextResponse.json(layout);
    }

    if (action === 'add' && widget) {
      const newWidget = addWidget(siteId, widget);
      return NextResponse.json(newWidget);
    }

    if (action === 'remove' && body.widgetId) {
      const removed = removeWidget(siteId, body.widgetId);
      return NextResponse.json({ removed });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 });
  }
}
