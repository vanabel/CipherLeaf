import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "cipherleaf.sqlite");

export type DocumentRow = {
  id: string;
  title: string;
  ciphertext: string;
  iv: string;
  wrapped_key: string | null;
  wrap_iv: string | null;
  gate_token_hash: string;
  manage_token_hash: string;
  security_preset: string;
  gate_mode: string;
  difficulty: string;
  ttl_seconds: number;
  watermark: number;
  copy_friction: number;
  passphrase_salt: string | null;
  passphrase_hash: string | null;
  created_at: number;
  destroyed_at: number | null;
};

export type InviteRow = {
  id: string;
  document_id: string;
  code_hash: string;
  label: string;
  status: "active" | "expired" | "revoked" | "exhausted";
  max_capsules: number;
  used_count: number;
  created_at: number;
};

export type CapsuleRow = {
  id: string;
  document_id: string;
  invite_id: string | null;
  token_hash: string;
  fingerprint: string;
  expires_at: number;
  revoked_at: number | null;
  challenge_started_at: number | null;
  challenge_solved_at: number | null;
  attempt_count: number;
  created_at: number;
};

export type ChallengeRow = {
  id: string;
  document_id: string;
  puzzle_type: string;
  prompt: string;
  answer_hash: string;
  public_params: string;
  started_at: number;
  solved_at: number | null;
  attempt_count: number;
  consumed: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __cipherleafDb: Database.Database | undefined;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      wrapped_key TEXT,
      wrap_iv TEXT,
      gate_token_hash TEXT NOT NULL UNIQUE,
      manage_token_hash TEXT NOT NULL UNIQUE,
      security_preset TEXT NOT NULL,
      gate_mode TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      ttl_seconds INTEGER NOT NULL,
      watermark INTEGER NOT NULL,
      copy_friction INTEGER NOT NULL,
      passphrase_salt TEXT,
      passphrase_hash TEXT,
      created_at INTEGER NOT NULL,
      destroyed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id),
      code_hash TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      status TEXT NOT NULL,
      max_capsules INTEGER NOT NULL,
      used_count INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS capsules (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id),
      invite_id TEXT,
      token_hash TEXT NOT NULL UNIQUE,
      fingerprint TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      revoked_at INTEGER,
      challenge_started_at INTEGER,
      challenge_solved_at INTEGER,
      attempt_count INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL REFERENCES documents(id),
      puzzle_type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      answer_hash TEXT NOT NULL,
      public_params TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      solved_at INTEGER,
      attempt_count INTEGER NOT NULL,
      consumed INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_invites_doc ON invites(document_id);
    CREATE INDEX IF NOT EXISTS idx_capsules_doc ON capsules(document_id);
    CREATE INDEX IF NOT EXISTS idx_challenges_doc ON challenges(document_id);
    CREATE INDEX IF NOT EXISTS idx_capsules_expires ON capsules(expires_at);

    CREATE TABLE IF NOT EXISTS rate_buckets (
      key TEXT PRIMARY KEY,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL
    );
  `);

  // Additive migrations for existing DBs
  const cols = db
    .prepare(`PRAGMA table_info(documents)`)
    .all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("wrapped_key")) {
    db.exec(`ALTER TABLE documents ADD COLUMN wrapped_key TEXT`);
  }
  if (!names.has("wrap_iv")) {
    db.exec(`ALTER TABLE documents ADD COLUMN wrap_iv TEXT`);
  }
}

/** Drop expired/revoked capsules and old challenges; keep recent for author audit. */
export function purgeStaleRecords(
  db: Database.Database,
  retentionMs = 7 * 24 * 60 * 60 * 1000,
) {
  const cutoff = Date.now() - retentionMs;
  const tx = db.transaction(() => {
    db.prepare(
      `DELETE FROM capsules WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)`,
    ).run(cutoff, cutoff);
    db.prepare(
      `DELETE FROM challenges WHERE started_at < ? AND (consumed = 1 OR solved_at IS NOT NULL)`,
    ).run(cutoff);
    db.prepare(`DELETE FROM rate_buckets WHERE window_start < ?`).run(cutoff);
  });
  tx();
}

declare global {
  // eslint-disable-next-line no-var
  var __cipherleafLastPurge: number | undefined;
}

export function getDb(): Database.Database {
  if (!global.__cipherleafDb) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
    global.__cipherleafDb = db;
  }
  maybePurge(global.__cipherleafDb);
  return global.__cipherleafDb;
}

function maybePurge(db: Database.Database) {
  const now = Date.now();
  if (
    global.__cipherleafLastPurge &&
    now - global.__cipherleafLastPurge < 60 * 60 * 1000
  ) {
    return;
  }
  global.__cipherleafLastPurge = now;
  try {
    purgeStaleRecords(db);
  } catch {
    // best-effort housekeeping
  }
}
