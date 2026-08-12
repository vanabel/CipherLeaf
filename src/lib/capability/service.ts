import { getDb, changesOf, type CapsuleRow, type DocumentRow, type InviteRow } from "@/lib/db";
import {
  generateFingerprint,
  generateInviteCode,
  generateManageSecret,
  generateToken,
  hashAnswer,
  hashPassphrase,
  hashToken,
  verifyPassphrase,
} from "@/lib/crypto/tokens";
import { generatePuzzle, normalizeAnswer, type PuzzleDifficulty } from "@/lib/puzzles/generator";
import type { Difficulty, GateMode, SecurityPreset } from "@/lib/capability/policy";
import { customAlphabet } from "nanoid";

const id = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 16);

export type CreateDocumentInput = {
  title: string;
  ciphertext: string;
  iv: string;
  wrappedKey?: string;
  wrapIv?: string;
  securityPreset: SecurityPreset;
  gateMode: GateMode;
  difficulty: Difficulty;
  ttlSeconds: number;
  watermark: boolean;
  copyFriction: boolean;
  passphrase?: string;
  initialInviteCount?: number;
  /** Recipient notes for invite codes (one label per invite). */
  inviteLabels?: string[];
};

export function createDocument(input: CreateDocumentInput) {
  const db = getDb();
  const docId = id();
  const gateToken = generateToken(10);
  const manageSecret = generateManageSecret();
  const now = Date.now();

  let passphrase_salt: string | null = null;
  let passphrase_hash: string | null = null;
  if (input.passphrase) {
    const p = hashPassphrase(input.passphrase);
    passphrase_salt = p.salt;
    passphrase_hash = p.hash;
  }

  db.prepare(
    `INSERT INTO documents (
      id, title, ciphertext, iv, wrapped_key, wrap_iv,
      gate_token_hash, manage_token_hash,
      security_preset, gate_mode, difficulty, ttl_seconds, watermark, copy_friction,
      passphrase_salt, passphrase_hash, created_at, destroyed_at
    ) VALUES (
      @id, @title, @ciphertext, @iv, @wrapped_key, @wrap_iv,
      @gate_token_hash, @manage_token_hash,
      @security_preset, @gate_mode, @difficulty, @ttl_seconds, @watermark, @copy_friction,
      @passphrase_salt, @passphrase_hash, @created_at, NULL
    )`,
  ).run({
    id: docId,
    title: input.title.slice(0, 200) || "未命名手稿",
    ciphertext: input.ciphertext,
    iv: input.iv,
    wrapped_key: input.wrappedKey ?? null,
    wrap_iv: input.wrapIv ?? null,
    gate_token_hash: hashToken(gateToken),
    manage_token_hash: hashToken(manageSecret),
    security_preset: input.securityPreset,
    gate_mode: input.gateMode,
    difficulty: input.difficulty,
    ttl_seconds: input.ttlSeconds,
    watermark: input.watermark ? 1 : 0,
    copy_friction: input.copyFriction ? 1 : 0,
    passphrase_salt,
    passphrase_hash,
    created_at: now,
  });

  const invites: { code: string; label: string; id: string }[] = [];
  if (input.gateMode === "invite") {
    const named = (input.inviteLabels ?? [])
      .map((l) => l.trim().slice(0, 64))
      .filter(Boolean);
    const labels =
      named.length > 0
        ? named
        : Array.from(
            { length: input.initialInviteCount ?? 3 },
            (_, i) => `邀请 ${i + 1}`,
          );
    for (const label of labels) {
      const code = generateInviteCode();
      const inviteId = id();
      db.prepare(
        `INSERT INTO invites (id, document_id, code_hash, label, status, max_capsules, used_count, created_at)
         VALUES (?, ?, ?, ?, 'active', 1, 0, ?)`,
      ).run(inviteId, docId, hashToken(code), label, now);
      invites.push({ code, label, id: inviteId });
    }
  }

  return { gateToken, manageSecret, invites, documentId: docId };
}

export function getDocumentByGateToken(token: string): DocumentRow | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM documents WHERE gate_token_hash = ? AND destroyed_at IS NULL`,
    )
    .get(hashToken(token)) as DocumentRow | undefined;
  return row ?? null;
}

export function getDocumentByManageSecret(secret: string): DocumentRow | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM documents WHERE manage_token_hash = ? AND destroyed_at IS NULL`,
    )
    .get(hashToken(secret)) as DocumentRow | undefined;
  return row ?? null;
}

export function getDocumentById(docId: string): DocumentRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM documents WHERE id = ? AND destroyed_at IS NULL`)
    .get(docId) as DocumentRow | undefined;
  return row ?? null;
}

export function getCapsuleByToken(token: string): CapsuleRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM capsules WHERE token_hash = ?`)
    .get(hashToken(token)) as CapsuleRow | undefined;
  return row ?? null;
}

export function startChallenge(document: DocumentRow) {
  const puzzle = generatePuzzle(document.difficulty as PuzzleDifficulty);
  const challengeId = id();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO challenges (
        id, document_id, puzzle_type, prompt, answer_hash, public_params,
        started_at, solved_at, attempt_count, consumed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, 0)`,
    )
    .run(
      challengeId,
      document.id,
      puzzle.type,
      puzzle.prompt,
      hashAnswer(puzzle.answer),
      JSON.stringify(puzzle.publicParams),
      now,
    );
  return {
    challengeId,
    type: puzzle.type,
    prompt: puzzle.prompt,
    hint: puzzle.hint,
    startedAt: now,
  };
}

export function solveChallenge(opts: {
  gateToken: string;
  challengeId: string;
  answer: string;
  inviteCode?: string;
  passphrase?: string;
}):
  | { ok: true; capsuleToken: string; fingerprint: string; expiresAt: number }
  | { ok: false; error: string; status: number } {
  const db = getDb();
  const document = getDocumentByGateToken(opts.gateToken);
  if (!document) return { ok: false, error: "门禁不存在。", status: 404 };

  const challenge = db
    .prepare(`SELECT * FROM challenges WHERE id = ? AND document_id = ?`)
    .get(opts.challengeId, document.id) as
    | {
        id: string;
        answer_hash: string;
        started_at: number;
        attempt_count: number;
        consumed: number;
        solved_at: number | null;
      }
    | undefined;

  if (!challenge) return { ok: false, error: "挑战不存在。", status: 404 };
  if (challenge.consumed) {
    return { ok: false, error: "该挑战已被兑换。", status: 409 };
  }
  if (challenge.attempt_count >= 8) {
    return {
      ok: false,
      error: "尝试次数过多。请刷新页面领取新题后再试。",
      status: 429,
    };
  }

  // Soft anti-bot: reject absurdly fast solves (< 1.5s)
  const elapsed = Date.now() - challenge.started_at;
  if (elapsed < 1500) {
    db.prepare(
      `UPDATE challenges SET attempt_count = attempt_count + 1 WHERE id = ?`,
    ).run(challenge.id);
    return {
      ok: false,
      error: "请稍作思考——这道门禁要的是注意力，不是速度。",
      status: 429,
    };
  }

  const answerOk =
    hashAnswer(normalizeAnswer(opts.answer)) === challenge.answer_hash;
  db.prepare(
    `UPDATE challenges SET attempt_count = attempt_count + 1 WHERE id = ?`,
  ).run(challenge.id);

  if (!answerOk) {
    return { ok: false, error: "还不对。再读一遍题，然后重试。", status: 400 };
  }

  if (document.passphrase_hash && document.passphrase_salt) {
    if (!opts.passphrase) {
      return { ok: false, error: "需要共享口令。", status: 401 };
    }
    if (
      !verifyPassphrase(
        opts.passphrase,
        document.passphrase_salt,
        document.passphrase_hash,
      )
    ) {
      return { ok: false, error: "共享口令不正确。", status: 401 };
    }
  }

  let invite: InviteRow | null = null;
  if (document.gate_mode === "invite") {
    if (!opts.inviteCode) {
      return { ok: false, error: "需要邀请码。", status: 401 };
    }
    invite =
      (db
        .prepare(
          `SELECT * FROM invites WHERE document_id = ? AND code_hash = ?`,
        )
        .get(document.id, hashToken(opts.inviteCode.trim().toUpperCase())) as
        | InviteRow
        | undefined) ?? null;
    if (!invite || invite.status !== "active") {
      return { ok: false, error: "邀请码无效或已撤销。", status: 401 };
    }
    if (invite.used_count >= invite.max_capsules) {
      return { ok: false, error: "邀请码已使用。", status: 401 };
    }
  }

  const capsuleToken = generateToken();
  const fingerprint = generateFingerprint();
  const now = Date.now();
  const expiresAt = now + document.ttl_seconds * 1000;
  const capsuleId = id();

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE challenges SET solved_at = ?, consumed = 1 WHERE id = ?`,
    ).run(now, challenge.id);

    db.prepare(
      `INSERT INTO capsules (
        id, document_id, invite_id, token_hash, fingerprint, expires_at,
        revoked_at, challenge_started_at, challenge_solved_at, attempt_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
    ).run(
      capsuleId,
      document.id,
      invite?.id ?? null,
      hashToken(capsuleToken),
      fingerprint,
      expiresAt,
      challenge.started_at,
      now,
      challenge.attempt_count + 1,
      now,
    );

    if (invite) {
      const used = invite.used_count + 1;
      const status = used >= invite.max_capsules ? "exhausted" : "active";
      db.prepare(
        `UPDATE invites SET used_count = ?, status = ? WHERE id = ?`,
      ).run(used, status, invite.id);
    }
  });
  tx();

  return { ok: true, capsuleToken, fingerprint, expiresAt };
}

export function getManageSnapshot(secret: string) {
  const document = getDocumentByManageSecret(secret);
  if (!document) return null;
  const db = getDb();
  const invites = db
    .prepare(
      `SELECT id, label, status, max_capsules, used_count, created_at FROM invites WHERE document_id = ? ORDER BY created_at`,
    )
    .all(document.id) as Omit<InviteRow, "document_id" | "code_hash">[];
  const capsules = db
    .prepare(
      `SELECT c.fingerprint, c.expires_at, c.revoked_at, c.created_at,
              c.invite_id, i.label AS invite_label
       FROM capsules c
       LEFT JOIN invites i ON i.id = c.invite_id
       WHERE c.document_id = ?
       ORDER BY c.created_at DESC`,
    )
    .all(document.id) as {
    fingerprint: string;
    expires_at: number;
    revoked_at: number | null;
    created_at: number;
    invite_id: string | null;
    invite_label: string | null;
  }[];

  const now = Date.now();
  const active = capsules.filter(
    (c) => !c.revoked_at && c.expires_at > now,
  ).length;
  const expired = capsules.filter(
    (c) => c.revoked_at || c.expires_at <= now,
  ).length;

  return {
    document: {
      id: document.id,
      title: document.title,
      createdAt: document.created_at,
      securityPreset: document.security_preset,
      gateMode: document.gate_mode,
      difficulty: document.difficulty,
      ttlSeconds: document.ttl_seconds,
      watermark: !!document.watermark,
      copyFriction: !!document.copy_friction,
      requirePassphrase: !!document.passphrase_hash,
    },
    stats: { activeReaders: active, expiredReaders: expired },
    invites,
    capsules: capsules.map((c) => ({
      fingerprint: c.fingerprint,
      inviteId: c.invite_id,
      inviteLabel: c.invite_label,
      expiresAt: c.expires_at,
      revokedAt: c.revoked_at,
      createdAt: c.created_at,
      status: c.revoked_at
        ? "revoked"
        : c.expires_at <= now
          ? "expired"
          : "active",
    })),
  };
}

export function createInvite(secret: string, label?: string) {
  const document = getDocumentByManageSecret(secret);
  if (!document) return null;
  if (document.gate_mode !== "invite") {
    return { error: "该文档未启用邀请门禁。" as const };
  }
  const code = generateInviteCode();
  const inviteId = id();
  const note =
    label?.trim().slice(0, 64) ||
    `邀请 ${code.slice(0, 2)}`;
  getDb()
    .prepare(
      `INSERT INTO invites (id, document_id, code_hash, label, status, max_capsules, used_count, created_at)
       VALUES (?, ?, ?, ?, 'active', 1, 0, ?)`,
    )
    .run(inviteId, document.id, hashToken(code), note, Date.now());
  return { code, id: inviteId, label: note };
}

export function relabelInvite(
  secret: string,
  inviteId: string,
  label: string,
): { ok: true; label: string } | { ok: false; error: string } {
  const document = getDocumentByManageSecret(secret);
  if (!document) return { ok: false, error: "控制台不存在。" };
  const note = label.trim().slice(0, 64);
  if (!note) return { ok: false, error: "备注不能为空。" };
  const invite = getDb()
    .prepare(`SELECT id FROM invites WHERE id = ? AND document_id = ?`)
    .get(inviteId, document.id) as { id: string } | undefined;
  if (!invite) return { ok: false, error: "邀请码不存在。" };
  getDb()
    .prepare(`UPDATE invites SET label = ? WHERE id = ?`)
    .run(note, inviteId);
  return { ok: true, label: note };
}

export function revokeAllCapsules(secret: string) {
  const document = getDocumentByManageSecret(secret);
  if (!document) return false;
  getDb()
    .prepare(
      `UPDATE capsules SET revoked_at = ? WHERE document_id = ? AND revoked_at IS NULL`,
    )
    .run(Date.now(), document.id);
  return true;
}

export function revokeCapsuleByFingerprint(
  secret: string,
  fingerprint: string,
): { ok: true } | { ok: false; error: string } {
  const document = getDocumentByManageSecret(secret);
  if (!document) return { ok: false, error: "控制台不存在。" };
  const fp = fingerprint.trim();
  if (!fp) return { ok: false, error: "缺少 fingerprint。" };
  const result = getDb()
    .prepare(
      `UPDATE capsules SET revoked_at = ?
       WHERE document_id = ? AND fingerprint = ? AND revoked_at IS NULL`,
    )
    .run(Date.now(), document.id, fp);
  if (changesOf(result) === 0) {
    return { ok: false, error: "未找到可撤销的阅读胶囊。" };
  }
  return { ok: true };
}

export function revokeInvite(
  secret: string,
  inviteId: string,
): { ok: true } | { ok: false; error: string } {
  const document = getDocumentByManageSecret(secret);
  if (!document) return { ok: false, error: "控制台不存在。" };
  const invite = getDb()
    .prepare(`SELECT * FROM invites WHERE id = ? AND document_id = ?`)
    .get(inviteId, document.id) as InviteRow | undefined;
  if (!invite) return { ok: false, error: "邀请码不存在。" };
  if (invite.status === "revoked") {
    return { ok: false, error: "该邀请码已撤销。" };
  }
  getDb()
    .prepare(`UPDATE invites SET status = 'revoked' WHERE id = ?`)
    .run(inviteId);
  return { ok: true };
}

/** Open / secret gates can mint another capsule; one-shot invites generally cannot. */
export function canRetryGate(document: DocumentRow): boolean {
  return document.gate_mode === "open" || document.gate_mode === "secret";
}

/** Rotate Gate URL token; old /g/... links stop working. Returns raw token once. */
export function rotateGate(
  secret: string,
  opts?: { revokeCapsules?: boolean },
): { gateToken: string } | null {
  const document = getDocumentByManageSecret(secret);
  if (!document) return null;
  const gateToken = generateToken(10);
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(`UPDATE documents SET gate_token_hash = ? WHERE id = ?`).run(
      hashToken(gateToken),
      document.id,
    );
    if (opts?.revokeCapsules !== false) {
      db.prepare(
        `UPDATE capsules SET revoked_at = ? WHERE document_id = ? AND revoked_at IS NULL`,
      ).run(Date.now(), document.id);
    }
  });
  tx();
  return { gateToken };
}

export function destroyDocument(secret: string) {
  const document = getDocumentByManageSecret(secret);
  if (!document) return false;
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE documents SET destroyed_at = ?, ciphertext = '', iv = '', wrapped_key = NULL, wrap_iv = NULL WHERE id = ?`,
    ).run(Date.now(), document.id);
    db.prepare(
      `UPDATE capsules SET revoked_at = ? WHERE document_id = ? AND revoked_at IS NULL`,
    ).run(Date.now(), document.id);
    db.prepare(
      `UPDATE invites SET status = 'revoked' WHERE document_id = ? AND status = 'active'`,
    ).run(document.id);
  });
  tx();
  return true;
}
