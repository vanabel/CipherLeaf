"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { readFragmentKey, withFragment } from "@/lib/crypto/client";
import { formatRemaining } from "@/lib/capability/policy";
import { MathMarkdown } from "@/components/markdown/MathMarkdown";
import { mathHistoryForToken } from "@/lib/passphrase/mathHistory";
import { rememberGateReturn } from "@/lib/reader/gateReturn";

type ChallengePayload = {
  title: string;
  gateMode: string;
  difficulty: string;
  ttlSeconds: number;
  requirePassphrase: boolean;
  requireInvite: boolean;
  challenge: {
    challengeId: string;
    type: string;
    prompt: string;
    hint?: string;
    startedAt: number;
  };
};

type Phase = "loading" | "ceremony" | "granted" | "error";

export function GateCeremony() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<ChallengePayload | null>(null);
  const [answer, setAnswer] = useState("");
  const [invite, setInvite] = useState("");
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [granted, setGranted] = useState<{
    capsuleToken: string;
    fingerprint: string;
    expiresAt: number;
  } | null>(null);
  const [keyMissing, setKeyMissing] = useState(false);

  useEffect(() => {
    const key = readFragmentKey();
    if (!key) setKeyMissing(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/gate/${token}/challenge`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "门禁不可用");
        if (!cancelled) {
          setData(json);
          setPhase("ceremony");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "门禁不可用");
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/gate/${token}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: data.challenge.challengeId,
          answer,
          inviteCode: invite || undefined,
          passphrase: phrase || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "解锁失败");
      setGranted(json);
      setPhase("granted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "解锁失败");
    } finally {
      setBusy(false);
    }
  }

  function enterReader() {
    const key = readFragmentKey();
    if (!granted || !key) return;
    rememberGateReturn(window.location.href);
    window.location.href = withFragment(`/r/${granted.capsuleToken}`, key);
  }

  if (phase === "loading") {
    return (
      <p className="text-center font-mono text-sm tracking-widest text-ink-soft">
        正在准备入场仪式…
      </p>
    );
  }

  if (phase === "error") {
    return (
      <p className="text-center text-warn">{error || "门禁不可用。"}</p>
    );
  }

  if (phase === "granted" && granted) {
    return (
      <section className="animate-seal mx-auto max-w-lg space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-ok text-2xl text-ok">
          ✓
        </div>
        <h1 className="font-display text-3xl text-ink">准入已授予。</h1>
        <p className="text-ink-soft">这份阅读副本：</p>
        <ul className="mx-auto max-w-xs space-y-2 text-left text-ink-soft">
          <li>• 有效期 {formatRemaining(granted.expiresAt)}</li>
          <li>• 仅属于你（{granted.fingerprint}）</li>
          <li>• 请勿随手转载</li>
        </ul>
        {keyMissing ? (
          <p className="text-sm text-warn">
            门禁链接缺少分享密钥片段。请向作者索取完整链接（以{" "}
            <code>#…</code> 结尾）。
          </p>
        ) : (
          <button
            type="button"
            onClick={enterReader}
            className="border border-moss bg-moss px-8 py-3 font-display text-lg text-paper hover:bg-leaf"
          >
            进入 →
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="animate-rise mx-auto w-full max-w-xl space-y-8">
      <header className="space-y-4 text-center">
        <p className="font-mono text-xs tracking-[0.35em] text-moss uppercase">
          CipherLeaf
        </p>
        <h1 className="font-display text-3xl text-ink sm:text-4xl">
          一份受保护的手稿。
        </h1>
        <p className="text-ink-soft">
          作者希望读者先花一点时间思考，再进入阅读。
        </p>
        <div className="manuscript-rule mx-auto max-w-xs" />
        {data && (
          <p className="font-mono text-xs text-ink-soft">
            {data.title} · 窗口 {Math.round(data.ttlSeconds / 3600)} 小时
          </p>
        )}
        <p className="mx-auto max-w-md text-left text-sm leading-relaxed text-ink-soft/90 italic">
          {mathHistoryForToken(token).text}
        </p>
      </header>

      {keyMissing && (
        <p className="border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
          此门禁链接缺少 <code>#</code>{" "}
          分享密钥。你仍可完成挑战，但没有密钥将无法解密正文。
        </p>
      )}

      <form onSubmit={onUnlock} className="space-y-5">
        {data?.requireInvite && (
          <label className="block space-y-2">
            <span className="text-sm text-ink-soft">邀请码</span>
            <input
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              className="w-full border border-line bg-paper/80 px-3 py-2 font-mono tracking-widest outline-none focus:border-moss"
              autoComplete="off"
              required
            />
          </label>
        )}
        {data?.requirePassphrase && (
          <label className="block space-y-2">
            <span className="text-sm text-ink-soft">共享口令</span>
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              className="w-full border border-line bg-paper/80 px-3 py-2 font-mono outline-none focus:border-moss"
              autoComplete="off"
              required
            />
          </label>
        )}

        <div className="border border-line bg-paper/80 p-5 sm:p-6">
          <div className="gate-prompt mb-4 text-[1.05rem] leading-relaxed text-ink">
            {data?.challenge.prompt ? (
              <MathMarkdown source={data.challenge.prompt} />
            ) : null}
          </div>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="答案"
            className="w-full border border-line bg-mist/50 px-3 py-3 font-mono text-center text-lg outline-none focus:border-moss"
            autoComplete="off"
            required
          />
        </div>

        {error && <p className="text-center text-sm text-warn">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full border border-moss bg-moss px-4 py-3 font-display text-lg text-paper hover:bg-leaf disabled:opacity-60"
        >
          {busy ? "核对中…" : "解锁手稿"}
        </button>
      </form>
    </section>
  );
}
