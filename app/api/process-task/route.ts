import { NextRequest, NextResponse } from 'next/server';
import { insertTask } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, taskId } = body;

    if (!workflowId || !taskId) {
      return NextResponse.json(
        { error: 'workflowId and taskId are required' },
        { status: 400 }
      );
    }

    // Get the callback URL from environment or use default
    const callbackUrl = process.env.NSW_BACKEND_URL || 'http://localhost:8080';
    const fullCallbackUrl = `${callbackUrl}/api/v1/tasks`;

    // Store task in database
    insertTask.run(taskId, workflowId, fullCallbackUrl);

    console.log(`[Customs Service] Received task: ${taskId} for workflow: ${workflowId}`);

    return NextResponse.json({
      status: 'received',
      message: 'Task received and queued for processing',
      taskId,
      workflowId,
    });
  } catch (error) {
    console.error('[Customs Service] Error processing task:', error);

    // Check if it's a duplicate task
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'Task already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}