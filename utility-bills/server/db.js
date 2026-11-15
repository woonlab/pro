import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

export function openDb(dataDir) {
  const db = new DatabaseSync(path.join(dataDir, 'bills.db'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS bills (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      category      TEXT    NOT NULL,
      provider      TEXT,
      billing_month TEXT    NOT NULL,          -- YYYY-MM
      amount        INTEGER NOT NULL,          -- 원
      usage         REAL,
      usage_unit    TEXT,
      due_date      TEXT,                      -- YYYY-MM-DD
      paid          INTEGER NOT NULL DEFAULT 0,
      memo          TEXT,
      file_name     TEXT,                      -- 사용자가 올린 원래 파일 이름
      file_path     TEXT,                      -- data/files 아래 저장 이름
      raw_text      TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_bills_month ON bills(billing_month);
  `);
  return db;
}

export const EDITABLE_FIELDS = [
  'category', 'provider', 'billing_month', 'amount', 'usage', 'usage_unit', 'due_date', 'paid', 'memo',
];
