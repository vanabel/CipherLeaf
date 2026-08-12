import { getDb } from "@/lib/db";

/** Sliding fixed-window counter stored in SQLite (single-node friendly). */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const db = getDb();
  const now = Date.now();
  const row = db
    .prepare(`SELECT window_start, count FROM rate_buckets WHERE key = ?`)
    .get(key) as { window_start: number; count: number } | undefined;

  if (!row || now - row.window_start >= windowMs) {
    db.prepare(
      `INSERT INTO rate_buckets (key, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(key) DO UPDATE SET window_start = excluded.window_start, count = 1`,
    ).run(key, now);
    return { ok: true };
  }

  if (row.count >= limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((row.window_start + windowMs - now) / 1000),
    );
    return { ok: false, retryAfterSec };
  }

  db.prepare(`UPDATE rate_buckets SET count = count + 1 WHERE key = ?`).run(key);
  return { ok: true };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}
