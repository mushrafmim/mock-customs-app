import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'customs.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tasks table
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL UNIQUE,
    workflow_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    callback_url TEXT NOT NULL,
    CONSTRAINT status_check CHECK (status IN ('pending', 'completed', 'failed'))
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_received_at ON tasks(received_at DESC);
`);

export interface Task {
  id: number;
  task_id: string;
  workflow_id: string;
  status: 'pending' | 'completed' | 'failed';
  received_at: string;
  completed_at: string | null;
  callback_url: string;
}

export const insertTask = db.prepare(`
  INSERT INTO tasks (task_id, workflow_id, callback_url, status)
  VALUES (?, ?, ?, 'pending')
`);

export const getPendingTasks = db.prepare<[]>(`
  SELECT * FROM tasks
  WHERE status = 'pending'
  ORDER BY received_at DESC
`);

export const getAllTasks = db.prepare<[]>(`
  SELECT * FROM tasks
  ORDER BY received_at DESC
`);

export const getTaskById = db.prepare<[string], Task>(`
  SELECT * FROM tasks
  WHERE task_id = ?
`);

export const updateTaskStatus = db.prepare(`
  UPDATE tasks
  SET status = ?, completed_at = CURRENT_TIMESTAMP
  WHERE task_id = ?
`);

export const resetTaskToPending = db.prepare(`
  UPDATE tasks
  SET status = 'pending', completed_at = NULL
  WHERE task_id = ?
`);

export default db;