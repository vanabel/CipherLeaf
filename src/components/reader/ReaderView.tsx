"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  decryptMarkdownWithKey,
  readFragmentKey,
  resolveContentKey,
} from "@/lib/crypto/client";
import {
  CAPSULE_WARN_MS,
  formatRemaining,
} from "@/lib/capability/policy";
import {
  applySoftFingerprint,
  buildVisibleWatermarkBackground,
  buildWatermarkPattern,
  embedInvisibleWatermark,
} from "@/lib/watermark";
import { MarkdownArticle } from "@/components/reader/MarkdownArticle";
import {
  parseManuscript,
  prepareReaderBody,
  type ManuscriptMeta,
} from "@/lib/markdown/frontmatter";
import { enhanceMathMarkup } from "@/lib/markdown/mathEnhance";
import { enhanceEmphasisMarkup } from "@/lib/markdown/emphasisEnhance";
import { readGateReturn } from "@/lib/reader/gateReturn";

type CapsulePayload = {
  title: string;
  ciphertext: string;
  iv: string;
  wrappedKey?: string | null;
  wrapIv?: string | null;
  fingerprint: string;
  expiresAt: number;
  watermark: boolean;
  copyFriction: boolean;
  gateMode?: string;
  canRetryGate?: boolean;
};

type ArticleState = {
  title: string;
  body: string;
  meta: ManuscriptMeta;
  hasFrontmatter: boolean;
  capsule: CapsulePayload;
};

type AccessError = {
  message: string;
  code?: string;
  canRetryGate?: boolean;
  hint?: string;
};

export function ReaderView() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [accessError, setAccessError] = useState<AccessError | null>(null);
  const [article, setArticle] = useState<ArticleState | null>(null);
  const [now, setNow] = useState(Date.now());
  const [gateReturn, setGateReturn] = useState<string | null>(null);

  useEffect(() => {
    setGateReturn(readGateReturn());
  }, []);

  useEffect(() => {
    const remaining = article ? article.capsule.expiresAt - Date.now() : Infinity;
    const intervalMs = remaining <= CAPSULE_WARN_MS ? 1000 : 30000;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [article?.capsule.expiresAt, article]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const fragment = readFragmentKey();
        if (!fragment) throw new Error("URL 片段中缺少分享密钥。");

        const res = await fetch(`/api/capsules/${token}`, { cache: "no-store" });
        const json = (await res.json()) as CapsulePayload & {
          error?: string;
          code?: string;
          canRetryGate?: boolean;
          hint?: string;
        };
        if (!res.ok) {
          if (!cancelled) {
            setAccessError({
              message: json.error || "阅读胶囊不可用",
              code: json.code,
              canRetryGate: json.canRetryGate,
              hint: json.hint,
            });
          }
          return;
        }

        const contentKey = await resolveContentKey(fragment, {
          wrappedKey: json.wrappedKey ?? "",
          wrapIv: json.wrapIv ?? "",
        });
        const plaintext = await decryptMarkdownWithKey(
          json.ciphertext,
          json.iv,
          contentKey,
        );
        const parsed = parseManuscript(plaintext);
        const displayTitle = parsed.meta.title || json.title;
        const day = new Date(json.expiresAt).toISOString().slice(0, 10);
        let body = prepareReaderBody(
          parsed.body,
          parsed.meta,
          parsed.hasFrontmatter,
          displayTitle,
        );
        body = applySoftFingerprint(
          enhanceEmphasisMarkup(enhanceMathMarkup(body)),
          json.fingerprint,
        );
        if (json.watermark) {
          body = embedInvisibleWatermark(body, json.fingerprint, day);
        }
        if (!cancelled) {
          setArticle({
            title: displayTitle,
            body,
            meta: parsed.meta,
            hasFrontmatter: parsed.hasFrontmatter,
            capsule: json,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setAccessError({
            message: e instanceof Error ? e.message : "无法打开阅读胶囊",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      setArticle(null);
    };
  }, [token]);

  useEffect(() => {
    if (!article?.capsule.copyFriction) return;
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("copy", block);
    document.addEventListener("contextmenu", block);
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("contextmenu", block);
    };
  }, [article?.capsule.copyFriction]);

  const watermarkBg = useMemo(() => {
    if (!article) return null;
    const day = new Date(article.capsule.expiresAt).toISOString().slice(0, 10);
    const mark = buildWatermarkPattern(article.capsule.fingerprint, day);
    return buildVisibleWatermarkBackground(mark);
  }, [article]);

  function RetryGateHint({
    canRetry,
    hint,
  }: {
    canRetry?: boolean;
    hint?: string;
  }) {
    return (
      <div className="mx-auto mt-6 max-w-md space-y-3 text-sm text-ink-soft">
        {hint && <p>{hint}</p>}
        {canRetry && gateReturn ? (
          <a
            href={gateReturn}
            className="inline-block border border-moss px-4 py-2 text-moss hover:bg-moss/5"
          >
            返回门禁，换取新副本 →
          </a>
        ) : canRetry ? (
          <p>请打开作者发给你的原门禁链接（/g/…），重新完成挑战即可。</p>
        ) : null}
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-warn">{accessError.message}</p>
        <RetryGateHint
          canRetry={accessError.canRetryGate}
          hint={accessError.hint}
        />
      </div>
    );
  }

  if (!article) {
    return (
      <p className="py-24 text-center font-mono text-sm tracking-widest text-ink-soft">
        正在打开胶囊…
      </p>
    );
  }

  const { capsule } = article;
  const remainingMs = capsule.expiresAt - now;
  const expired = remainingMs <= 0;
  const warn = !expired && remainingMs <= CAPSULE_WARN_MS;

  return (
    <div
      className={capsule.copyFriction ? "reader-friction relative" : "relative"}
    >
      {capsule.watermark && watermarkBg && (
        <div className="watermark-layer" style={watermarkBg} aria-hidden />
      )}
      <main className="relative z-10 mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <header className="mb-10 space-y-3">
          <p className="font-mono text-xs tracking-[0.3em] text-moss uppercase">
            阅读胶囊
          </p>
          <h1 className="font-display text-3xl text-ink sm:text-4xl">
            {article.title}
          </h1>
          <p className="font-mono text-xs text-ink-soft">
            阅读副本：{capsule.fingerprint} ·{" "}
            {expired
              ? "已过期"
              : `剩余 ${formatRemaining(capsule.expiresAt, now)}`}
          </p>
          <div className="manuscript-rule" />
        </header>

        {warn && (
          <p className="mb-6 border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
            阅读窗口即将结束（剩余{" "}
            {formatRemaining(capsule.expiresAt, now)}
            ）。请抓紧读完；过期后需重新走门禁（若策略允许）。
          </p>
        )}

        {expired ? (
          <div className="space-y-2">
            <p className="text-warn">这份阅读胶囊已过期。</p>
            <RetryGateHint
              canRetry={capsule.canRetryGate}
              hint={
                capsule.canRetryGate
                  ? "可通过原门禁链接重新解锁，获取新的短期阅读副本。"
                  : "邀请码通常只能兑换一次；过期后请联系作者重新发放邀请。"
              }
            />
          </div>
        ) : (
          <MarkdownArticle
            body={article.body}
            meta={article.meta}
            hasFrontmatter={article.hasFrontmatter}
          />
        )}

        <footer className="mt-16 space-y-2 border-t border-line pt-6 text-sm text-ink-soft">
          <p>
            阅读副本：{capsule.fingerprint} · 失效于{" "}
            {new Date(capsule.expiresAt).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p>
            水印已公开披露（可见层 + 乱序散布的零宽标记 + 非全局同义替换）。旨在提高随手转载的成本。
          </p>
        </footer>
      </main>
    </div>
  );
}
