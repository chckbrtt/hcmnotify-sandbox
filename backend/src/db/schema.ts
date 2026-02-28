import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/sandbox.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      company_name TEXT NOT NULL,
      company_short TEXT NOT NULL UNIQUE,
      company_id TEXT NOT NULL UNIQUE,
      api_key TEXT NOT NULL UNIQUE,
      client_id TEXT NOT NULL UNIQUE,
      client_secret TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_api_hit TEXT,
      total_api_calls INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tokens (
      token TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      type TEXT NOT NULL CHECK(type IN ('v1','v2')),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      employee_number TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      ssn_masked TEXT,
      status TEXT NOT NULL DEFAULT 'Active',
      hire_date TEXT NOT NULL,
      termination_date TEXT,
      job_title TEXT NOT NULL,
      department TEXT NOT NULL,
      location TEXT NOT NULL,
      pay_rate REAL NOT NULL,
      pay_frequency TEXT NOT NULL DEFAULT 'Bi-Weekly',
      manager_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      employee_id TEXT NOT NULL REFERENCES employees(id),
      date TEXT NOT NULL,
      punch_in TEXT NOT NULL,
      punch_out TEXT,
      hours REAL,
      department TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS benefits (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      employee_id TEXT NOT NULL REFERENCES employees(id),
      plan_name TEXT NOT NULL,
      coverage_level TEXT NOT NULL,
      employee_deduction REAL NOT NULL,
      employer_contribution REAL NOT NULL,
      effective_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      code TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_titles (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      code TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      url TEXT NOT NULL,
      events TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON time_entries(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
    CREATE INDEX IF NOT EXISTS idx_benefits_tenant ON benefits(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_benefits_employee ON benefits(employee_id);
    CREATE INDEX IF NOT EXISTS idx_tokens_tenant ON tokens(tenant_id);
  `);
}
