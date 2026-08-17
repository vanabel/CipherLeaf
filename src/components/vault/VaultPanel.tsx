"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  clearVault,
  exportVaultFile,
  importVaultFile,
  promptVerifyVaultPassphrase,
  removeVaultEntry,
  syncVaultDestroyedStatus,
  unlockVault,
  vaultExists,
  type VaultEntry,
  createVault,
} from "@/lib/vault/localVault";

export function VaultPanel() {
  const [exists, setExists] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"unlock" | "create">("unlock");

  useEffect(() => {
    const has = vaultExists();
    setExists(has);
    setMode(has ? "unlock" : "create");
  }, []);

  async function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "create") {
        if (passphrase.trim().length < 6) {
          throw new Error("书签包口令至少 6 个字符。");
        }
        await createVault(passphrase);
        setEntries([]);
      } else {
        let list = await unlockVault(passphrase);
        try {
          const report = await syncVaultDestroyedStatus(passphrase);
          list = report.entries;
        } catch (syncErr) {
          // Network/probe failures keep the unlocked list; passphrase failures
          // should not happen after unlock, but never clear entries on sync error.
          if (
            syncErr instanceof Error &&
            syncErr.message.includes("口令不正确")
          ) {
            throw syncErr;
          }
        }
        setEntries(list);
      }
      setUnlocked(true);
      setExists(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "解锁失败");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: string) {
    if (!confirm("从本机书签包移除这条记录？")) return;
    // Re-verify passphrase before mutating — session unlock alone is not enough.
    const verified = await promptVerifyVaultPassphrase(
      "输入书签包口令以确认移除：",
    );
    if (verified.status === "cancel" || verified.status === "skip") return;
    if (verified.status === "error") {
      setError(verified.message);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await removeVaultEntry(verified.passphrase, id);
      setEntries(next);
      // Keep session passphrase in sync after successful re-auth.
      setPassphrase(verified.passphrase);
    } catch (err) {
      // Wrong passphrase (or corrupt vault): keep current entries in UI + storage.
      setError(err instanceof Error ? err.message : "移除失败");
    } finally {
      setBusy(false);
    }
  }

  async function onImport(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await importVaultFile(file);
      setExists(true);
      setUnlocked(false);
      setMode("unlock");
      setPassphrase("");
      setEntries([]);
      setError("已导入书签包文件。请用原口令解锁。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setBusy(false);
    }
  }

  if (!unlocked) {
    return (
      <main className="mx-auto w-full max-w-lg space-y-8 px-4 py-12 sm:py-16">
        <header className="space-y-3 text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-moss uppercase">
            Local vault
          </p>
          <h1 className="font-display text-3xl text-ink">本机书签包</h1>
          <p className="text-ink-soft">
            用口令加密保存在本浏览器中的 manage / gate 链接。不上传服务器，无账号。
          </p>
        </header>

        <form onSubmit={onUnlock} className="space-y-4 border border-line bg-paper/80 p-5">
          <div className="flex gap-3 text-sm">
            <button
              type="button"
              className={mode === "unlock" ? "text-moss" : "text-ink-soft"}
              onClick={() => setMode("unlock")}
              disabled={!exists}
            >
              解锁
            </button>
            <button
              type="button"
              className={mode === "create" ? "text-moss" : "text-ink-soft"}
              onClick={() => setMode("create")}
            >
              {exists ? "重建（会覆盖）" : "新建"}
            </button>
          </div>
          <label className="block space-y-2">
            <span className="text-sm text-ink-soft">书签包口令</span>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full border border-line bg-mist/40 px-3 py-2 font-mono outline-none focus:border-moss"
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="text-sm text-warn">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full border border-moss bg-moss px-4 py-3 text-paper hover:bg-leaf disabled:opacity-60"
          >
            {busy ? "处理中…" : mode === "create" ? "创建书签包" : "解锁"}
          </button>
        </form>

        <div className="space-y-3 text-sm text-ink-soft">
          <label className="block cursor-pointer text-moss">
            导入书签包文件
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => onImport(e.target.files?.[0] ?? null)}
            />
          </label>
          <p>
            <Link href="/" className="text-moss underline-offset-2 hover:underline">
              ← 返回创作
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-4 py-12 sm:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-[0.3em] text-moss uppercase">
            Local vault
          </p>
          <h1 className="font-display text-3xl text-ink">本机书签包</h1>
          <p className="text-sm text-ink-soft">{entries.length} 条记录</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            className="border border-line px-3 py-2 hover:border-moss"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError(null);
              setNotice(null);
              try {
                const verified = await promptVerifyVaultPassphrase(
                  "输入书签包口令以检查远端状态：",
                );
                if (verified.status === "cancel" || verified.status === "skip") {
                  return;
                }
                if (verified.status === "error") {
                  setError(verified.message);
                  return;
                }
                const report = await syncVaultDestroyedStatus(
                  verified.passphrase,
                );
                setEntries(report.entries);
                setPassphrase(verified.passphrase);
                if (report.newlyDestroyed > 0) {
                  setNotice(
                    `新标记 ${report.newlyDestroyed} 条为已销毁（控制台已不存在）。`,
                  );
                } else if (report.probed === 0) {
                  setNotice("没有可探问的控制台链接。");
                } else if (report.unreachable > 0) {
                  setNotice(
                    `已探问 ${report.probed} 条；${report.unreachable} 条暂时无法联系远端，未改动。`,
                  );
                } else {
                  setNotice(
                    `已探问 ${report.probed} 条，远端均仍有效。`,
                  );
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : "检查失败");
              } finally {
                setBusy(false);
              }
            }}
          >
            检查远端状态
          </button>
          <button
            type="button"
            className="border border-line px-3 py-2 hover:border-moss"
            onClick={() => {
              try {
                exportVaultFile();
              } catch (err) {
                setError(err instanceof Error ? err.message : "导出失败");
              }
            }}
          >
            导出加密文件
          </button>
          <button
            type="button"
            className="border border-line px-3 py-2 hover:border-moss"
            onClick={() => {
              setUnlocked(false);
              setPassphrase("");
              setEntries([]);
              setNotice(null);
              setError(null);
            }}
          >
            锁定
          </button>
        </div>
      </header>

      <p className="text-xs text-ink-soft">
        「检查远端状态」会向各条书签的控制台地址探问：若手稿已销毁（接口返回 404），本机条目会划掉并标「已销毁」。解锁时也会自动检查一次；远端仍有效时列表看起来不会变。
      </p>
      {error && <p className="text-sm text-warn">{error}</p>}
      {notice && <p className="text-sm text-ok">{notice}</p>}

      <ul className="divide-y divide-line border border-line bg-paper/70">
        {entries.length === 0 && (
          <li className="px-4 py-6 text-ink-soft">
            还没有条目。在作者控制台或创建成功页点击「加入本机书签包」。
          </li>
        )}
        {entries.map((e) => {
          const destroyed = e.status === "destroyed";
          return (
            <li
              key={e.id}
              className={`space-y-2 px-4 py-4 ${destroyed ? "opacity-70" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className={`font-display text-lg ${destroyed ? "text-ink-soft line-through" : "text-ink"}`}
                    >
                      {e.title}
                    </h2>
                    {destroyed && (
                      <span className="border border-warn/40 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-warn uppercase">
                        已销毁
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-ink-soft">
                    {new Date(e.savedAt).toLocaleString("zh-CN")}
                    {destroyed && e.destroyedAt
                      ? ` · 销毁标记 ${new Date(e.destroyedAt).toLocaleString("zh-CN")}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  className="text-sm text-warn"
                  onClick={() => onRemove(e.id)}
                >
                  移除
                </button>
              </div>
              {destroyed ? (
                <p className="text-sm text-ink-soft">
                  远端手稿已销毁或不可用。链接仅作历史记录，打开将无效。
                </p>
              ) : (
                <div className="flex flex-wrap gap-3 text-sm">
                  <a href={e.manageUrl} className="text-moss hover:underline">
                    打开控制台
                  </a>
                  {e.gateUrl && (
                    <a href={e.gateUrl} className="text-moss hover:underline">
                      打开门禁
                    </a>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-3 text-sm text-ink-soft">
        <Link href="/" className="text-moss hover:underline">
          ← 返回创作
        </Link>
        <button
          type="button"
          className="text-warn"
          onClick={() => {
            if (!confirm("删除本机书签包？此操作不可恢复。")) return;
            clearVault();
            setExists(false);
            setUnlocked(false);
            setMode("create");
            setEntries([]);
            setPassphrase("");
          }}
        >
          删除书签包
        </button>
      </div>
    </main>
  );
}
