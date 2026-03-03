import { NextRequest, NextResponse } from 'next/server';
import { getPendingTasks, getAllTasks } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter');

    let tasks;
    if (filter === 'pending') {
      tasks = getPendingTasks.all();
    } else {
      tasks = getAllTasks.all();
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('[Customs Service] Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}