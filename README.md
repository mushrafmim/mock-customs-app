# Customs Service - Mock External Service

A Next.js-based mock external service for testing NSW workflow `WAIT_FOR_EVENT` tasks.

## Overview

This service simulates an external customs/regulatory service that:
1. Receives task notifications from the NSW backend
2. Stores them in a SQLite database
3. Provides a web UI for users to manually complete tasks
4. Calls back to the NSW backend when tasks are completed

## Features

- **Task Reception**: API endpoint to receive tasks from NSW backend
- **Task Dashboard**: Web UI showing all pending and completed tasks
- **Manual Completion**: Button interface to complete tasks
- **Auto-refresh**: Dashboard automatically refreshes every 5 seconds
- **SQLite Storage**: Persistent task storage with status tracking
- **Callback Integration**: Automatically notifies NSW backend when tasks complete

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- NSW backend running on `http://localhost:8080`

### Installation

```bash
# Navigate to customs folder
cd customs

# Install dependencies
npm install
```

### Configuration

Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` if your NSW backend is running on a different URL:

```env
NSW_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_NSW_BACKEND_URL=http://localhost:8080
```

### Running the Service

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

The service will start on `http://localhost:3001`

## API Endpoints

### POST /api/process-task

Receives task notifications from NSW backend.

**Request:**
```json
{
  "workflowId": "550e8400-e29b-41d4-a716-446655440000",
  "taskId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response:**
```json
{
  "status": "received",
  "message": "Task received and queued for processing",
  "taskId": "660e8400-e29b-41d4-a716-446655440001",
  "workflowId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### GET /api/tasks

Retrieves all tasks or pending tasks.

**Query Parameters:**
- `filter=pending` - Only return pending tasks (optional)

**Response:**
```json
{
  "tasks": [
    {
      "id": 1,
      "task_id": "660e8400-e29b-41d4-a716-446655440001",
      "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "pending",
      "received_at": "2024-01-27T10:30:00.000Z",
      "completed_at": null,
      "callback_url": "http://localhost:8080/api/tasks"
    }
  ]
}
```

### POST /api/complete-task

Completes a task and notifies NSW backend.

**Request:**
```json
{
  "taskId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task completed successfully",
  "taskId": "660e8400-e29b-41d4-a716-446655440001"
}
```

## Integration with NSW Backend

### Workflow Template Configuration

Configure your workflow template step to use this service:

```json
{
  "stepId": "customs_inspection",
  "type": "WAIT_FOR_EVENT",
  "config": {
    "externalServiceUrl": "http://localhost:3001/api/process-task"
  },
  "dependsOn": ["trader_declaration"]
}
```

### Task Flow

1. NSW backend creates a `WAIT_FOR_EVENT` task
2. Task manager sends POST to `http://localhost:3001/api/process-task`
3. Customs service stores the task in SQLite
4. User views task in the dashboard at `http://localhost:3001`
5. User clicks "Complete Task" button
6. Customs service POSTs to `http://localhost:8080/api/tasks` with `action: "complete"`
7. NSW backend marks task as completed
8. Workflow progresses to next step

## Database Schema

The service uses SQLite with the following schema:

```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL UNIQUE,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  callback_url TEXT NOT NULL,
  CONSTRAINT status_check CHECK (status IN ('pending', 'completed', 'failed'))
);
```

## Development

### Project Structure

```
customs/
├── app/
│   ├── api/
│   │   ├── complete-task/
│   │   │   └── route.ts       # Complete task endpoint
│   │   ├── process-task/
│   │   │   └── route.ts       # Receive task endpoint
│   │   └── tasks/
│   │       └── route.ts       # List tasks endpoint
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main dashboard
├── lib/
│   └── db.ts                  # SQLite database utilities
├── .env.example               # Environment variables template
├── .env.local                 # Local environment variables
├── next.config.ts             # Next.js configuration
├── package.json               # Dependencies
├── tailwind.config.ts         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

### Technologies Used

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **better-sqlite3**: Fast, synchronous SQLite library
- **React 19**: Latest React features

## Troubleshooting

### Port Already in Use

If port 3001 is already in use, change the port in `package.json`:

```json
{
  "scripts": {
    "dev": "next dev -p 3002",
    "start": "next start -p 3002"
  }
}
```

### NSW Backend Not Reachable

Make sure the NSW backend is running and accessible at the configured URL. Check the logs for connection errors.

### Database Locked

If you see "database is locked" errors, make sure only one instance of the service is running.

## License

This is a mock service for testing purposes only.