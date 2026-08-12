"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatRemaining } from "@/lib/capability/policy";
import {
  readFragmentKey,
  unwrapPassphrase,
  withFragment,
} from "@/lib/crypto/client";
import { downloadBackupJson, promptMarkDestroyedInVault, promptSaveToVault } from "@/lib/vault/localVault";

type Snapshot = {
  document: {
    title: string;
    createdAt: number;
    securityPreset: string;
    gateMode: string;
    difficulty: string;
    ttlSeconds: number;
    watermark: boolean;
    copyFriction: boolean;
    requirePassphrase: boolean;
    wrappedPassphrase: string | null;
    passphraseWrapIv: string | null;
  };
  stats: { activeReaders: number; expiredReaders: number };
  invites: {
    id: string;
    label: string;
    status: string;
    max_capsules: number;
    used_count: number;
    created_at: number;
  }[];
  capsules: {
    fingerprint: string;
    inviteId: string | null;
    inviteLabel: string | null;
    expiresAt: number;
    revokedAt: number | null;
    createdAt: number;
    status: string;
  }[];
};

const STATUS_LABEL: Record<string, string> = {
  active: "有效",
  expired: "已过期",
  revoked: "已撤销",
  exhausted: "已用尽",
};

const PRESET_LABEL: Record<string, string> = {
  standard: "标准",
  private: "私密",
  sensitive: "敏感",
};

const DIFFICULTY_LABEL: Record<string, string> = {
  thoughtful: "沉思",
  mathematical: "数学",
  deep: "深题",
};

export function AuthorConsole() {
  const params = useParams<{ secret: string }>();
  const secret = params.secret;
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newInvite, setNewInvite] = useState<{
    code: string;
    id: string;
    label: string;
  } | null>(null);
  const [newInviteNote, setNewInviteNote] = useState("");
  const [rotatedGateUrl, setRotatedGateUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [sharePassphrase, setSharePassphrase] = useState<string | null>(null);
  const [passphraseHint, setPassphraseHint] = useState<string | null>(null);

  const manageUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, [snap]);

  const shareSecret = useMemo(() => readFragmentKey(), [snap]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/manage/${secret}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "控制台不可用");
    setSnap(json);
  }, [secret]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "出错了"));
  }, [load]);

  useEffect(() => {
    if (!snap) return;
    const d = snap.document;
    if (!d.requirePassphrase) {
      setSharePassphrase(null);
      setPassphraseHint(null);
      return;
    }
    const frag = readFragmentKey();
    if (!frag) {
      setSharePassphrase(null);
      setPassphraseHint("控制台链接缺少 #分享密钥，无法解密口令。");
      return;
    }
    if (!d.wrappedPassphrase || !d.passphraseWrapIv) {
      setSharePassphrase(null);
      setPassphraseHint(
        "此文档创建时未保存可恢复口令（服务器仅有哈希）。请使用创建时记下的口令。",
      );
      return;
    }
    let cancelled = false;
    unwrapPassphrase(frag, d.wrappedPassphrase, d.passphraseWrapIv)
      .then((phrase) => {
        if (!cancelled) {
          setSharePassphrase(phrase);
          setPassphraseHint(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSharePassphrase(null);
          setPassphraseHint("口令解密失败，请核对链接中的 #分享密钥。");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [snap]);

  async function copyText(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  async function createInvite() {
    setBusy(true);
    setNewInvite(null);
    setNewInviteNote("");
    setError(null);
    try {
      const res = await fetch(`/api/manage/${secret}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "创建邀请失败");
      setNewInvite({ code: json.code, id: json.id, label: json.label });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建邀请失败");
    } finally {
      setBusy(false);
    }
  }

  async function copyNewInvite() {
    if (!newInvite) return;
    let note = newInviteNote.trim();
    if (!note) {
      const typed = window.prompt(
        "这份邀请码发给谁？（备注后便于水印倒查）",
        "",
      );
      if (typed === null) return;
      note = typed.trim();
      if (!note) {
        setError("未填写备注，已取消复制。");
        return;
      }
      setNewInviteNote(note);
    }
    try {
      const res = await fetch(`/api/manage/${secret}/invites/label`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId: newInvite.id, label: note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "保存备注失败");
      await navigator.clipboard.writeText(newInvite.code);
      setCopied("invite");
      setTimeout(() => setCopied(null), 1500);
      setNewInvite((prev) => (prev ? { ...prev, label: note } : prev));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "复制失败");
    }
  }

  async function rotateGate() {
    if (
      !confirm(
        "轮换门禁链接？旧的 /g/… 将立即失效，且默认撤销全部阅读胶囊。",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/manage/${secret}/rotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revokeCapsules: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "轮换失败");
      const frag = shareSecret || readFragmentKey();
      if (!frag) {
        setRotatedGateUrl(`${window.location.origin}/g/${json.gateToken}`);
        setError("缺少分享密钥片段，请手动补上 #密钥。");
      } else {
        setRotatedGateUrl(
          withFragment(`${window.location.origin}/g/${json.gateToken}`, frag),
        );
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "轮换失败");
    } finally {
      setBusy(false);
    }
  }

  async function revokeAll() {
    if (!confirm("撤销全部有效阅读胶囊？")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/manage/${secret}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "撤销失败");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "撤销失败");
    } finally {
      setBusy(false);
    }
  }

  async function revokeOne(fingerprint: string) {
    if (!confirm(`撤销阅读副本 ${fingerprint}？`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/manage/${secret}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "撤销失败");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "撤销失败");
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(inviteId: string, label: string) {
    if (!confirm(`撤销邀请「${label}」？未使用的码将立即失效。`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/manage/${secret}/invites/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "撤销邀请失败");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "撤销邀请失败");
    } finally {
      setBusy(false);
    }
  }

  async function destroy() {
    if (!confirm("销毁加密文档？密文将被清空，所有访问权限一并撤销。")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/manage/${secret}/destroy`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "销毁失败");
      setSnap(null);
      const vaultResult = await promptMarkDestroyedInVault(window.location.href);
      if (vaultResult === "ok") {
        setError("加密文档已销毁；本机书签已标为「已销毁」。");
      } else {
        setError("加密文档已销毁。");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "销毁失败");
    } finally {
      setBusy(false);
    }
  }

  function exportBackup() {
    if (!snap) return;
    downloadBackupJson(
      {
        kind: "cipherleaf.manage-backup",
        v: 1,
        exportedAt: new Date().toISOString(),
        title: snap.document.title,
        manageUrl: window.location.href,
        gateUrl: rotatedGateUrl || undefined,
        sharePassphrase: sharePassphrase || undefined,
        note: "妥善离线保存。丢失 manage 链接与 #分享密钥 将无法再管理或解密。",
      },
      `cipherleaf-backup-${snap.document.title.slice(0, 24) || "note"}.json`,
    );
  }

  async function saveToVault() {
    if (!snap) return;
    const result = await promptSaveToVault({
      title: snap.document.title,
      manageUrl: window.location.href,
      gateUrl: rotatedGateUrl || undefined,
    });
    if (result === "ok") setCopied("vault");
  }

  if (error && !snap) {
    return <p className="py-24 text-center text-warn">{error}</p>;
  }

  if (!snap) {
    return (
      <p className="py-24 text-center font-mono text-sm tracking-widest text-ink-soft">
        正在打开控制台…
      </p>
    );
  }

  const d = snap.document;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-10 px-4 py-12 sm:py-16">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs tracking-[0.3em] text-moss uppercase">
            作者控制台
          </p>
          <Link href="/vault" className="font-mono text-xs text-moss">
            本机书签包 →
          </Link>
        </div>
        <h1 className="font-display text-3xl text-ink sm:text-4xl">{d.title}</h1>
        <div className="grid gap-2 text-sm text-ink-soft sm:grid-cols-2">
          <p>创建于 {new Date(d.createdAt).toLocaleDateString("zh-CN")}</p>
          <p>已加密 ✓</p>
          <p>服务器明文 · 永不存在</p>
          <p>
            有效读者 {snap.stats.activeReaders} · 已过期{" "}
            {snap.stats.expiredReaders}
          </p>
        </div>
      </header>

      <section className="space-y-4 border border-line bg-paper/70 p-5">
        <h2 className="font-display text-xl">链接备份</h2>
        <p className="text-sm text-ink-soft">
          请离线保存控制台链接（含 <code className="font-mono">#</code>{" "}
          分享密钥）。服务器无法帮你找回。
        </p>
        <code className="block break-all border border-line bg-mist/60 p-3 font-mono text-xs">
          {manageUrl || "…"}
        </code>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border border-line px-3 py-2 text-sm hover:border-moss"
            onClick={() => copyText("manage", window.location.href)}
          >
            {copied === "manage" ? "已复制" : "复制控制台链接"}
          </button>
          <button
            type="button"
            className="border border-line px-3 py-2 text-sm hover:border-moss"
            onClick={exportBackup}
          >
            下载备份 JSON
          </button>
          <button
            type="button"
            className="border border-line px-3 py-2 text-sm hover:border-moss"
            onClick={saveToVault}
          >
            {copied === "vault" ? "已加入书签包" : "加入本机书签包"}
          </button>
        </div>
      </section>

      <section className="space-y-4 border border-line bg-paper/70 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">门禁轮换</h2>
          <button
            type="button"
            disabled={busy}
            onClick={rotateGate}
            className="font-mono text-xs tracking-wide text-moss"
          >
            轮换 Gate
          </button>
        </div>
        <p className="text-sm text-ink-soft">
          生成新的短门禁链接，并使旧 <code className="font-mono">/g/…</code>{" "}
          失效；默认同时撤销现有阅读胶囊。
        </p>
        {rotatedGateUrl && (
          <div className="space-y-2">
            <p className="text-sm text-ok">新门禁链接（仅此一次完整展示）：</p>
            <code className="block break-all border border-ok/30 bg-ok/5 p-3 font-mono text-xs">
              {rotatedGateUrl}
            </code>
            <button
              type="button"
              className="font-mono text-xs text-moss"
              onClick={() => copyText("gate", rotatedGateUrl)}
            >
              {copied === "gate" ? "已复制" : "复制新门禁"}
            </button>
          </div>
        )}
      </section>

      {d.requirePassphrase && (
        <section className="space-y-4 border border-line bg-paper/70 p-5">
          <h2 className="font-display text-xl">共享口令</h2>
          {sharePassphrase ? (
            <div className="space-y-2">
              <p className="text-sm text-ink-soft">
                读者进入门禁时需填写。密文由控制台链接中的 #分享密钥 在本地解密，服务器只存哈希。
              </p>
              <code className="block break-all border border-line bg-mist/60 p-3 font-mono text-sm tracking-wide">
                {sharePassphrase}
              </code>
              <button
                type="button"
                className="font-mono text-xs text-moss"
                onClick={() => copyText("phrase", sharePassphrase)}
              >
                {copied === "phrase" ? "已复制" : "复制口令"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              {passphraseHint ?? "正在解密口令…"}
            </p>
          )}
        </section>
      )}

      <section className="space-y-4 border border-line bg-paper/70 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">邀请码</h2>
          {d.gateMode === "invite" && (
            <button
              type="button"
              disabled={busy}
              onClick={createInvite}
              className="font-mono text-xs tracking-wide text-moss"
            >
              新建邀请
            </button>
          )}
        </div>
        {newInvite && (
          <div className="space-y-2 border border-ok/30 bg-ok/5 px-3 py-3">
            <p className="font-mono text-sm">
              新邀请码（仅显示一次）：
              <span className="ml-2 tracking-widest">{newInvite.code}</span>
            </p>
            <input
              value={newInviteNote}
              onChange={(e) => setNewInviteNote(e.target.value)}
              placeholder="发给谁（复制前请备注）"
              maxLength={64}
              className="w-full border border-line bg-paper/80 px-2 py-1.5 font-mono text-sm outline-none focus:border-moss"
            />
            <button
              type="button"
              className="font-mono text-xs text-moss"
              onClick={copyNewInvite}
            >
              {copied === "invite" ? "已复制" : "备注并复制"}
            </button>
          </div>
        )}
        <p className="text-xs text-ink-soft">
          分享时备注收件人；泄露截图上的 fingerprint 可倒查到备注。
        </p>
        <ul className="divide-y divide-line font-mono text-sm">
          {snap.invites.length === 0 && (
            <li className="py-2 text-ink-soft">当前门禁模式没有邀请码。</li>
          )}
          {snap.invites.map((inv) => (
            <li
              key={inv.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span>{inv.label}</span>
              <span className="flex items-center gap-3 text-ink-soft">
                {STATUS_LABEL[inv.status] ?? inv.status}
                {inv.status === "active"
                  ? ` · ${inv.used_count}/${inv.max_capsules}`
                  : ""}
                {inv.status === "active" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => revokeInvite(inv.id, inv.label)}
                    className="text-warn hover:underline disabled:opacity-60"
                  >
                    撤销
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 border border-line bg-paper/70 p-5">
        <h2 className="font-display text-xl">阅读胶囊</h2>
        <p className="text-xs text-ink-soft">
          水印形如 CL · fingerprint · 日期；对照下方列表即可追溯邀请备注。
        </p>
        <ul className="divide-y divide-line font-mono text-sm">
          {snap.capsules.length === 0 && (
            <li className="py-2 text-ink-soft">尚无。</li>
          )}
          {snap.capsules.map((c) => (
            <li
              key={`${c.fingerprint}-${c.createdAt}`}
              className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span>
                {c.fingerprint}
                {c.inviteLabel ? (
                  <span className="text-ink-soft"> · {c.inviteLabel}</span>
                ) : null}
              </span>
              <span className="flex items-center gap-3 text-ink-soft">
                {STATUS_LABEL[c.status] ?? c.status}
                {c.status === "active"
                  ? ` · ${formatRemaining(c.expiresAt)}`
                  : ""}
                {c.status === "active" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => revokeOne(c.fingerprint)}
                    className="text-warn hover:underline disabled:opacity-60"
                  >
                    撤销
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 text-sm text-ink-soft">
        <h2 className="font-display text-xl text-ink">安全设置</h2>
        <p>档位：{PRESET_LABEL[d.securityPreset] ?? d.securityPreset}</p>
        <p>挑战：{DIFFICULTY_LABEL[d.difficulty] ?? d.difficulty}</p>
        <p>窗口：{Math.round(d.ttlSeconds / 3600)} 小时</p>
        <p>水印：{d.watermark ? "已启用" : "关闭"}</p>
        <p>
          口令：
          {d.requirePassphrase
            ? sharePassphrase
              ? "需要（见上方）"
              : "需要"
            : "不需要"}
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={busy}
          onClick={revokeAll}
          className="border border-line px-4 py-3 hover:border-moss"
        >
          全部撤销
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={destroy}
          className="border border-warn/40 px-4 py-3 text-warn hover:bg-warn/5"
        >
          销毁加密文档
        </button>
      </div>

      {error && <p className="text-sm text-warn">{error}</p>}
    </main>
  );
}
