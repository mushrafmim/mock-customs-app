import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTaskStatus, resetTaskToPending } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    // Get task from database
    const task = getTaskById.get(taskId);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.status === 'completed') {
      return NextResponse.json(
        { error: 'Task is already completed' },
        { status: 400 }
      );
    }

    if (task.status === 'failed') {
      // Reset to pending to allow retry
      resetTaskToPending.run(taskId);
    }

    // Call back to NSW backend to complete the task
    console.log(`[Customs Service] Completing task: ${taskId}`);
    console.log(task);

    const callbackPayload = {
      workflow_id: task.workflow_id,
      task_id: taskId,
      payload: {
        action: 'COMPLETE',
      },
    };

    try {
      const response = await fetch(task.callback_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(callbackPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Customs Service] NSW backend returned error: ${response.status} - ${errorText}`
        );
        updateTaskStatus.run('failed', taskId);

        return NextResponse.json(
          { error: `Failed to complete task on NSW backend: ${errorText}` },
          { status: 502 }
        );
      }

      // Update task status to completed
      updateTaskStatus.run('completed', taskId);

      console.log(`[Customs Service] Successfully completed task: ${taskId}`);

      return NextResponse.json({
        success: true,
        message: 'Task completed successfully',
        taskId,
      });
    } catch (fetchError) {
      console.error('[Customs Service] Error calling NSW backend:', fetchError);
      updateTaskStatus.run('failed', taskId);

      return NextResponse.json(
        {
          error: 'Failed to connect to NSW backend',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('[Customs Service] Error completing task:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}