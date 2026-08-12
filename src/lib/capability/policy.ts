export type SecurityPreset = "standard" | "private" | "sensitive";
export type GateMode = "open" | "secret" | "invite";
export type Difficulty = "thoughtful" | "mathematical" | "deep";

export type DocumentPolicy = {
  securityPreset: SecurityPreset;
  gateMode: GateMode;
  difficulty: Difficulty;
  ttlSeconds: number;
  watermark: boolean;
  copyFriction: boolean;
  requirePassphrase: boolean;
};

export const PRESETS: Record<
  SecurityPreset,
  Omit<DocumentPolicy, "securityPreset"> & { label: string; blurb: string }
> = {
  standard: {
    label: "标准",
    blurb: "数学挑战 + 短期阅读胶囊",
    gateMode: "open",
    difficulty: "thoughtful",
    ttlSeconds: 2 * 60 * 60,
    watermark: true,
    copyFriction: true,
    requirePassphrase: false,
  },
  private: {
    label: "私密",
    blurb: "邀请码 + 挑战 + 短期胶囊",
    gateMode: "invite",
    difficulty: "mathematical",
    ttlSeconds: 2 * 60 * 60,
    watermark: true,
    copyFriction: true,
    requirePassphrase: false,
  },
  sensitive: {
    label: "敏感",
    blurb: "邀请码 + 口令 + 挑战 + 水印",
    gateMode: "invite",
    difficulty: "mathematical",
    ttlSeconds: 2 * 60 * 60,
    watermark: true,
    copyFriction: true,
    requirePassphrase: true,
  },
};

export const TTL_OPTIONS = [
  { label: "2 小时", seconds: 2 * 60 * 60 },
  { label: "1 天", seconds: 24 * 60 * 60 },
  { label: "2 天", seconds: 48 * 60 * 60 },
] as const;

/** Display names — internal keys stay thoughtful / mathematical / deep. */
export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; hint: string }
> = {
  thoughtful: { label: "启封", hint: "约 30–90 秒" },
  mathematical: { label: "推演", hint: "约 2–5 分钟" },
  deep: { label: "穷理", hint: "约 5–15 分钟" },
};

export function formatRemaining(expiresAt: number, now = Date.now()): string {
  const ms = Math.max(0, expiresAt - now);
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec} 秒`;
  const m = Math.floor(totalSec / 60);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h <= 0) return `${rem} 分钟`;
  return `${h} 小时 ${rem} 分钟`;
}

/** Warn when less than this many ms remain. */
export const CAPSULE_WARN_MS = 15 * 60 * 1000;
