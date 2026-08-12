"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DIFFICULTY_META,
  PRESETS,
  TTL_OPTIONS,
  type Difficulty,
  type SecurityPreset,
} from "@/lib/capability/policy";
import {
  sealMarkdown,
  withFragment,
} from "@/lib/crypto/client";
import {
  inferTitleFromMarkdown,
  parseManuscript,
} from "@/lib/markdown/frontmatter";
import { randomMathPassphrase } from "@/lib/passphrase/mathPhrases";
import {
  createVault,
  upsertVaultEntry,
  vaultExists,
} from "@/lib/vault/localVault";

type Created = {
  gateUrl: string;
  manageUrl: string;
  manageSecret: string;
  invites: { id: string; code: string; label: string }[];
};

export function CreateForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(
    "# 一份受保护的手稿\n\n在此写下敏感笔记。服务器只会收到密文。\n",
  );
  const [preset, setPreset] = useState<SecurityPreset>("sensitive");
  const [difficulty, setDifficulty] = useState<Difficulty>(
    PRESETS.sensitive.difficulty,
  );
  const [ttlSeconds, setTtlSeconds] = useState(PRESETS.sensitive.ttlSeconds);
  const [passphrase, setPassphrase] = useState(() => randomMathPassphrase());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [vaultSaved, setVaultSaved] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [vaultPwd, setVaultPwd] = useState("");
  const [vaultBusy, setVaultBusy] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);

  const policy = useMemo(() => PRESETS[preset], [preset]);
  const detected = useMemo(() => parseManuscript(content), [content]);

  function onContentChange(next: string) {
    setContent(next);
    if (!title.trim()) {
      const inferred = inferTitleFromMarkdown(next, "");
      if (inferred) setTitle(inferred);
    }
  }

  function applyPreset(next: SecurityPreset) {
    setPreset(next);
    setDifficulty(PRESETS[next].difficulty);
    setTtlSeconds(PRESETS[next].ttlSeconds);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!content.trim()) {
      setError("请先写下内容，再密封这片叶子。");
      return;
    }
    if (policy.requirePassphrase && passphrase.trim().length < 4) {
      setError("共享口令至少需要 4 个字符。");
      return;
    }
    setBusy(true);
    try {
      const sealed = await sealMarkdown(content);
      let gateMode = policy.gateMode;
      if (gateMode === "open" && passphrase.trim()) gateMode = "secret";
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || inferTitleFromMarkdown(content),
          ciphertext: sealed.ciphertext,
          iv: sealed.iv,
          wrappedKey: sealed.wrappedKey,
          wrapIv: sealed.wrapIv,
          securityPreset: preset,
          gateMode,
          difficulty,
          ttlSeconds,
          watermark: policy.watermark,
          copyFriction: policy.copyFriction,
          passphrase: passphrase.trim() || undefined,
          initialInviteCount: gateMode === "invite" ? 3 : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "创建失败");
      const origin = window.location.origin;
      setCreated({
        gateUrl: withFragment(`${origin}/g/${data.gateToken}`, sealed.shareSecret),
        manageUrl: withFragment(
          `${origin}/m/${data.manageSecret}`,
          sealed.shareSecret,
        ),
        manageSecret: data.manageSecret,
        invites: data.invites ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setBusy(false);
    }
  }

  if (created) {
    return (
      <section className="animate-rise mx-auto w-full max-w-2xl space-y-8 rounded-sm border border-line bg-paper/80 p-6 shadow-[0_24px_60px_rgba(21,32,28,0.08)] backdrop-blur sm:p-10">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-[0.25em] text-moss uppercase">
            已密封
          </p>
          <h2 className="font-display text-3xl text-ink">手稿已创建</h2>
          <p className="text-ink-soft">
            请妥善保存以下链接。片段里是短分享密钥（不是完整内容密钥）——丢失后密文无法恢复。
          </p>
        </div>

        <CopyBlock label="门禁链接（可分享）" value={created.gateUrl} />
        <CopyBlock label="作者控制台（请保密）" value={created.manageUrl} />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="cursor-pointer border border-line px-3 py-2 text-sm hover:border-moss disabled:opacity-60"
              disabled={vaultSaved || vaultBusy}
              onClick={() => {
                setVaultError(null);
                setVaultOpen((o) => !o);
              }}
            >
              {vaultSaved ? "已加入本机书签包" : "加入本机书签包"}
            </button>
            <Link
              href="/vault"
              className="px-3 py-2 text-sm text-moss hover:underline"
            >
              打开书签包 →
            </Link>
          </div>
          {vaultOpen && !vaultSaved && (
            <div className="space-y-2 border border-line bg-mist/50 p-3">
              <p className="text-xs text-ink-soft">
                {vaultExists()
                  ? "输入已有书签包口令以保存本条。"
                  : "首次使用：设置书签包口令（至少 6 位）。仅存本机，服务器不可见。"}
              </p>
              <input
                type="password"
                value={vaultPwd}
                onChange={(e) => setVaultPwd(e.target.value)}
                placeholder="书签包口令"
                autoComplete="new-password"
                className="w-full border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-moss"
              />
              {vaultError && (
                <p className="text-xs text-warn">{vaultError}</p>
              )}
              <button
                type="button"
                disabled={vaultBusy}
                className="cursor-pointer border border-moss bg-moss px-3 py-2 text-sm text-paper hover:bg-leaf disabled:opacity-60"
                onClick={async () => {
                  setVaultError(null);
                  const pwd = vaultPwd;
                  if (!vaultExists() && pwd.trim().length < 6) {
                    setVaultError("口令至少 6 个字符。");
                    return;
                  }
                  if (!pwd) {
                    setVaultError("请输入口令。");
                    return;
                  }
                  setVaultBusy(true);
                  try {
                    if (!vaultExists()) await createVault(pwd, []);
                    await upsertVaultEntry(pwd, {
                      title: title.trim() || inferTitleFromMarkdown(content),
                      manageUrl: created.manageUrl,
                      gateUrl: created.gateUrl,
                    });
                    setVaultSaved(true);
                    setVaultOpen(false);
                    setVaultPwd("");
                  } catch (e) {
                    setVaultError(
                      e instanceof Error ? e.message : "保存失败",
                    );
                  } finally {
                    setVaultBusy(false);
                  }
                }}
              >
                {vaultBusy ? "保存中…" : "确认加入"}
              </button>
            </div>
          )}
        </div>

        {created.invites.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-display text-xl">邀请码</h3>
            <p className="text-sm text-ink-soft">
              复制分享时请备注发给谁；备注会写入控制台，泄露截图上的水印可倒查到人。
            </p>
            <ul className="space-y-3">
              {created.invites.map((inv) => (
                <InviteShareRow
                  key={inv.id}
                  invite={inv}
                  manageSecret={created.manageSecret}
                  onLabeled={(id, label) =>
                    setCreated((prev) =>
                      prev
                        ? {
                            ...prev,
                            invites: prev.invites.map((i) =>
                              i.id === id ? { ...i, label } : i,
                            ),
                          }
                        : prev,
                    )
                  }
                />
              ))}
            </ul>
            <p className="text-sm text-ink-soft">
              每个邀请码只能兑换一次阅读胶囊。
            </p>
          </div>
        )}
      </section>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="animate-rise mx-auto w-full max-w-2xl space-y-8 rounded-sm border border-line bg-paper/80 p-6 shadow-[0_24px_60px_rgba(21,32,28,0.08)] backdrop-blur sm:p-10"
    >
      <div className="space-y-2">
        <p className="font-mono text-xs tracking-[0.25em] text-moss uppercase">
          创建受保护笔记
        </p>
        <h2 className="font-display text-3xl text-ink">密封一份手稿</h2>
      </div>

      <label className="block space-y-2">
        <span className="text-sm text-ink-soft">标题</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="拓扑与规范场论笔记"
          className="w-full border border-line bg-mist/40 px-3 py-2 outline-none focus:border-moss"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-ink-soft">正文</span>
        <textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          rows={14}
          className="w-full resize-y border border-line bg-mist/40 px-3 py-3 font-mono text-sm leading-relaxed outline-none focus:border-moss"
          placeholder={`---\ntitle: 标题\nauthor: 作者\ntags: [标签1, 标签2]\n---\n\n# 正文…`}
        />
        <p className="text-xs text-ink-soft">
          支持 YAML frontmatter（Obsidian / 博客风格）。阅读时会解析标题、作者、标签与版权，并单独展示元数据。
          数学公式请用 KaTeX：行内{" "}
          <code className="font-mono">$x_n = 2$</code>，独立成行{" "}
          <code className="font-mono">{"$$x_n = 2\\cdot x_{n-1}$$"}</code>
          。也兼容部分 Unicode 下标写法（如 xₙ）。
          {detected.hasFrontmatter && detected.meta.tags.length > 0
            ? ` 已识别 ${detected.meta.tags.length} 个标签。`
            : detected.hasFrontmatter
              ? " 已识别 frontmatter。"
              : ""}
        </p>
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm text-ink-soft">安全模型</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(PRESETS) as SecurityPreset[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`border px-3 py-3 text-left transition ${
                preset === key
                  ? "border-moss bg-moss text-paper"
                  : "border-line bg-mist/50 hover:border-leaf"
              }`}
            >
              <div className="font-display text-lg">{PRESETS[key].label}</div>
              <div
                className={`mt-1 text-xs leading-snug ${
                  preset === key ? "text-paper/85" : "text-ink-soft"
                }`}
              >
                {PRESETS[key].blurb}
              </div>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="text-sm text-ink-soft">难度</legend>
          {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((d) => (
            <label key={d} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="difficulty"
                checked={difficulty === d}
                onChange={() => setDifficulty(d)}
              />
              <span>
                {DIFFICULTY_META[d].label}{" "}
                <span className="text-ink-soft">
                  {DIFFICULTY_META[d].hint}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm text-ink-soft">阅读窗口</legend>
          {TTL_OPTIONS.map((opt) => (
            <label
              key={opt.seconds}
              className="flex cursor-pointer items-center gap-2"
            >
              <input
                type="radio"
                name="ttl"
                checked={ttlSeconds === opt.seconds}
                onChange={() => setTtlSeconds(opt.seconds)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </fieldset>
      </div>

      {(policy.requirePassphrase || preset !== "standard") && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-soft">
              共享口令{" "}
              {policy.requirePassphrase ? "（必填）" : "（可选）"}
            </span>
            <button
              type="button"
              className="font-mono text-xs tracking-wide text-moss"
              onClick={() =>
                setPassphrase((prev) => randomMathPassphrase(prev))
              }
            >
              换一句
            </button>
          </div>
          <input
            type="text"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Gauss-1827"
            className="w-full border border-line bg-mist/40 px-3 py-2 font-mono outline-none focus:border-moss"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-ink-soft">
            数学史短句（人名-年份），便于口头传达；可改写或点「换一句」。
          </p>
        </div>
      )}

      <ul className="space-y-1 text-sm text-ink-soft">
        <li>● 个体化水印</li>
        <li>● 复制摩擦</li>
        <li>● 客户端 AES-256-GCM — 明文永不上传</li>
      </ul>

      {error && <p className="text-sm text-warn">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full border border-moss bg-moss px-4 py-3 font-display text-lg text-paper transition hover:bg-leaf disabled:opacity-60"
      >
        {busy ? "加密中…" : "密封并创建门禁"}
      </button>
    </form>
  );
}

function isPlaceholderLabel(label: string) {
  return /^邀请(\s+\d+)?$/u.test(label.trim()) || /^邀请\s+[A-Z0-9]{2}$/u.test(label.trim());
}

function InviteShareRow({
  invite,
  manageSecret,
  onLabeled,
}: {
  invite: { id: string; code: string; label: string };
  manageSecret: string;
  onLabeled: (id: string, label: string) => void;
}) {
  const [note, setNote] = useState(
    isPlaceholderLabel(invite.label) ? "" : invite.label,
  );
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function saveLabel(label: string) {
    const res = await fetch(`/api/manage/${manageSecret}/invites/label`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId: invite.id, label }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "保存备注失败");
    onLabeled(invite.id, label);
  }

  async function copyShare() {
    setStatus(null);
    let label = note.trim();
    if (!label) {
      const typed = window.prompt(
        "这份邀请码发给谁？（备注后便于水印倒查）",
        "",
      );
      if (typed === null) return;
      label = typed.trim();
      if (!label) {
        setStatus("未填写备注，已取消复制。");
        return;
      }
      setNote(label);
    }
    try {
      await saveLabel(label);
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "复制失败");
    }
  }

  return (
    <li className="space-y-2 border border-line bg-mist/60 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-sm">
        <span className="tracking-widest text-lg">{invite.code}</span>
        <button
          type="button"
          className="font-mono text-xs tracking-wide text-moss"
          onClick={copyShare}
        >
          {copied ? "已复制" : "备注并复制"}
        </button>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="发给谁（例如：张三）"
        maxLength={64}
        className="w-full border border-line bg-paper/80 px-2 py-1.5 font-mono text-sm outline-none focus:border-moss"
      />
      {status && <p className="text-xs text-warn">{status}</p>}
    </li>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink-soft">{label}</span>
        <button
          type="button"
          className="font-mono text-xs tracking-wide text-moss"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <code className="block break-all border border-line bg-mist/70 p-3 font-mono text-xs leading-relaxed">
        {value}
      </code>
    </div>
  );
}
