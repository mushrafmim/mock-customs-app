# Testing Guide: NSW Backend + Customs Service Integration

This guide walks you through testing the complete workflow with the `WAIT_FOR_EVENT` task type.

## Prerequisites

1. NSW backend running on `http://localhost:8080`
2. Customs service running on `http://localhost:3001`
3. Database setup completed for both services

## Step-by-Step Testing

### 1. Start Both Services

**Terminal 1 - NSW Backend:**
```bash
cd /Users/mushrafmim/GolandProjects/nsw/backend
go run cmd/server/main.go
```

**Terminal 2 - Customs Service:**
```bash
cd /Users/mushrafmim/GolandProjects/nsw/customs
./start.sh
# or: npm run dev
```

### 2. Verify Services Are Running

- NSW Backend: `http://localhost:8080`
- Customs Dashboard: `http://localhost:3001`

### 3. Create a Workflow Template with WAIT_FOR_EVENT

Use the provided example template or create your own in the database:

```sql
INSERT INTO workflow_templates (id, version, steps)
VALUES (
  gen_random_uuid(),
  '1.0',
  '[
    {
      "stepId": "trader_form",
      "type": "SIMPLE_FORM",
      "config": {
        "title": "Trader Information",
        "fields": [
          {"name": "companyName", "label": "Company Name", "type": "text", "required": true}
        ]
      },
      "dependsOn": []
    },
    {
      "stepId": "customs_inspection",
      "type": "WAIT_FOR_EVENT",
      "config": {
        "externalServiceUrl": "http://localhost:3001/api/process-task"
      },
      "dependsOn": ["trader_form"]
    },
    {
      "stepId": "final_step",
      "type": "SIMPLE_FORM",
      "config": {
        "title": "Final Confirmation",
        "fields": [
          {"name": "notes", "label": "Notes", "type": "text", "required": false}
        ]
      },
      "dependsOn": ["customs_inspection"]
    }
  ]'::jsonb
);
```

### 4. Create a Consignment

**Request:**
```bash
curl -X POST http://localhost:8080/api/consignments \
  -H "Content-Type: application/json" \
  -d '{
    "tradeFlow": "IMPORT",
    "items": [
      {
        "hsCodeId": "YOUR_HS_CODE_ID",
        "description": "Test Item",
        "quantity": 10,
        "unit": "kg",
        "value": 1000,
        "currency": "USD"
      }
    ],
    "traderId": "trader-123"
  }'
```

**Expected Response:**
```json
{
  "consignment": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tradeFlow": "IMPORT",
    "state": "IN_PROGRESS",
    "items": [...],
    "traderId": "trader-123"
  },
  "readyTasks": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "consignmentID": "550e8400-e29b-41d4-a716-446655440000",
      "stepID": "trader_form",
      "type": "SIMPLE_FORM",
      "status": "READY"
    }
  ]
}
```

### 5. Complete the First Task (SIMPLE_FORM)

**Request:**
```bash
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
    "task_id": "660e8400-e29b-41d4-a716-446655440001",
    "payload": {
      "action": "submit",
      "content": {
        "companyName": "Test Company Ltd"
      }
    }
  }'
```

**Expected:**
- Task marked as `COMPLETED`
- `customs_inspection` task (WAIT_FOR_EVENT) becomes `READY` and automatically starts
- NSW backend sends POST to `http://localhost:3001/api/process-task`
- Customs service receives and stores the task

### 6. Verify Task in Customs Dashboard

1. Open `http://localhost:3001` in your browser
2. You should see the task in "Pending Tasks"
3. Task details should show:
   - Task ID (first 8 chars)
   - Consignment ID (first 8 chars)
   - Status: PENDING
   - Received timestamp

**Customs Service Logs:**
```
[Customs Service] Received task: 660e8400-e29b-41d4-a716-446655440002 for consignment: 550e8400-e29b-41d4-a716-446655440000
```

### 7. Complete the WAIT_FOR_EVENT Task

In the Customs Dashboard:
1. Find the pending task
2. Click the "Complete Task" button
3. Confirm the completion

**Expected:**
- Customs service POSTs to `http://localhost:8080/api/tasks` with `action: "complete"`
- NSW backend receives callback and marks task as `COMPLETED`
- `final_step` task becomes `READY`
- Task in customs dashboard shows status: COMPLETED

**NSW Backend Logs:**
```
[TaskManager] Task completion received from external service
[WorkflowManager] Task completed, updating consignment state
[WorkflowManager] New tasks ready: [final_step]
```

**Customs Service Logs:**
```
[Customs Service] Completing task: 660e8400-e29b-41d4-a716-446655440002
[Customs Service] Successfully completed task: 660e8400-e29b-41d4-a716-446655440002
```

### 8. Complete the Final Task

**Request:**
```bash
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
    "task_id": "<final_task_id>",
    "payload": {
      "action": "submit",
      "content": {
        "notes": "All checks passed"
      }
    }
  }'
```

**Expected:**
- Final task marked as `COMPLETED`
- Consignment state changes to `FINISHED`
- Workflow complete

## Verification Checklist

- [ ] NSW backend starts without errors
- [ ] Customs service starts on port 3001
- [ ] Customs dashboard loads at http://localhost:3001
- [ ] Consignment created successfully
- [ ] First SIMPLE_FORM task completes
- [ ] WAIT_FOR_EVENT task triggers and sends to customs service
- [ ] Task appears in customs dashboard as PENDING
- [ ] "Complete Task" button works
- [ ] Callback to NSW backend succeeds
- [ ] Task marked as COMPLETED in NSW backend
- [ ] Next task becomes READY
- [ ] Final task completes workflow
- [ ] Consignment state becomes FINISHED

## Troubleshooting

### Task Not Appearing in Customs Dashboard

**Check:**
1. Customs service logs for incoming request
2. NSW backend logs for external service call
3. Network connectivity between services
4. Correct URL in workflow template: `http://localhost:3001/api/process-task`

**Solution:**
```bash
# Check customs service is accessible
curl http://localhost:3001/api/tasks

# Check NSW backend can reach customs service
curl -X POST http://localhost:3001/api/process-task \
  -H "Content-Type: application/json" \
  -d '{"taskId": "test", "workflowId": "test"}'
```

### Callback Fails

**Check:**
1. NSW backend is accessible from customs service
2. Callback URL is correct in customs database
3. NSW backend logs for incoming callback

**Solution:**
```bash
# Test callback manually
curl -X POST http://localhost:8080/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "<workflow_id>",
    "task_id": "<task_id>",
    "payload": {"action": "complete"}
  }'
```

### Task Stuck in IN_PROGRESS

**Symptoms:**
- WAIT_FOR_EVENT task shows IN_PROGRESS
- Task not appearing in customs dashboard
- No error logs

**Possible Causes:**
1. External service URL misconfigured
2. Customs service not running
3. Network issues

**Solution:**
1. Check task record in NSW backend database
2. Verify workflow template has correct `externalServiceUrl`
3. Check customs service logs
4. Manually send task to customs service

### Database Locked (Customs Service)

**Error:**
```
SQLITE_BUSY: database is locked
```

**Solution:**
1. Stop all instances of customs service
2. Delete lock files:
   ```bash
   rm customs.db-shm customs.db-wal
   ```
3. Restart customs service

## Advanced Testing Scenarios

### Multiple Concurrent Tasks

Create multiple consignments to test concurrent task handling:

```bash
# Create 5 consignments
for i in {1..5}; do
  curl -X POST http://localhost:8080/api/consignments \
    -H "Content-Type: application/json" \
    -d '{
      "tradeFlow": "IMPORT",
      "items": [...],
      "traderId": "trader-'$i'"
    }'
done
```

Verify all tasks appear in customs dashboard.

### Error Recovery

Test what happens when services are unavailable:

1. Stop customs service
2. Create consignment and complete first task
3. WAIT_FOR_EVENT task should log error but continue
4. Restart customs service
5. Manually trigger task again or implement retry logic

### Task Timeout

Test long-running tasks:

1. Create task in customs service
2. Wait extended period (hours/days)
3. Complete task
4. Verify callback still works

## Performance Testing

### Load Test

```bash
# Send 100 tasks rapidly
for i in {1..100}; do
  curl -X POST http://localhost:3001/api/process-task \
    -H "Content-Type: application/json" \
    -d "{\"taskId\": \"task-$i\", \"workflowId\": \"consignment-$i\"}" &
done
wait
```

Check customs dashboard for all 100 tasks.

### Callback Performance

Time how long callbacks take:

```bash
time curl -X POST http://localhost:3001/api/complete-task \
  -H "Content-Type: application/json" \
  -d '{"taskId": "<task_id>"}'
```

Expected: < 100ms for local testing

## Cleanup

After testing:

```bash
# Reset NSW backend database
psql -U postgres -d nsw_db -c "TRUNCATE consignments, tasks CASCADE;"

# Reset customs service database
rm /Users/mushrafmim/GolandProjects/nsw/customs/customs.db
```

Restart both services to reinitialize databases.