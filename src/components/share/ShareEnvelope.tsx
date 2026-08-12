"use client";

import { useEffect, useMemo, useState } from "react";
import { buildShareLetter } from "@/lib/share/letter";

type RevealStep = "sealed" | "gate" | "phrase" | "invite" | "done";

type ShareEnvelopeProps = {
  gateUrl: string;
  passphrase?: string | null;
  inviteCode?: string | null;
  title?: string | null;
  /** Return false to abort seal + copy (e.g. missing invite note). */
  onBeforeCopy?: () => Promise<boolean | void>;
  /** When true, show sealed card but block opening. */
  disabled?: boolean;
  disabledHint?: string;
  className?: string;
};

export function ShareEnvelope({
  gateUrl,
  passphrase,
  inviteCode,
  title,
  onBeforeCopy,
  disabled = false,
  disabledHint,
  className = "",
}: ShareEnvelopeProps) {
  const hasPhrase = Boolean(passphrase?.trim());
  const hasInvite = Boolean(inviteCode?.trim());
  const [step, setStep] = useState<RevealStep>("sealed");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const letter = useMemo(
    () =>
      buildShareLetter({
        gateUrl,
        passphrase,
        inviteCode,
        title,
      }),
    [gateUrl, passphrase, inviteCode, title],
  );

  useEffect(() => {
    if (step === "sealed" || step === "done") return;
    const order: RevealStep[] = ["gate"];
    if (hasPhrase) order.push("phrase");
    if (hasInvite) order.push("invite");
    order.push("done");
    const idx = order.indexOf(step);
    if (idx < 0 || idx >= order.length - 1) return;
    const t = window.setTimeout(() => setStep(order[idx + 1]), 420);
    return () => window.clearTimeout(t);
  }, [step, hasPhrase, hasInvite]);

  async function sealAndCopy() {
    if (disabled || busy) return;
    setStatus(null);
    setBusy(true);
    try {
      if (onBeforeCopy) {
        const ok = await onBeforeCopy();
        if (ok === false) {
          setBusy(false);
          return;
        }
      }
      await navigator.clipboard.writeText(letter);
      setStep("gate");
      setStatus("已封存并复制到剪贴板");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "复制失败");
    } finally {
      setBusy(false);
    }
  }

  function showGate() {
    return step === "gate" || step === "phrase" || step === "invite" || step === "done";
  }
  function showPhrase() {
    return hasPhrase && (step === "phrase" || step === "invite" || step === "done");
  }
  function showInvite() {
    return hasInvite && (step === "invite" || step === "done");
  }

  return (
    <div
      className={`share-envelope border border-line bg-paper/90 ${
        step !== "sealed" ? "share-envelope--open" : ""
      } ${className}`}
    >
      <div className="share-envelope__flap" aria-hidden />
      <div className="relative space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-mono text-[10px] tracking-[0.28em] text-moss uppercase">
              邀请信封
            </p>
            <h3 className="font-display text-xl text-ink">
              {step === "sealed" ? "尚未启封" : "已递交给读者"}
            </h3>
            <p className="text-sm text-ink-soft">
              先在此展开网址
              {hasPhrase ? "、口令" : ""}
              {hasInvite ? "与邀请码" : ""}
              ，再写入剪贴板。
            </p>
          </div>
          <button
            type="button"
            disabled={disabled || busy || !gateUrl}
            onClick={sealAndCopy}
            className="cursor-pointer border border-moss bg-moss px-4 py-2 font-display text-base text-paper hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy
              ? "封存中…"
              : step === "done"
                ? "再次复制信文"
                : "封一封邀请信"}
          </button>
        </div>

        {disabled && disabledHint && (
          <p className="text-xs text-warn">{disabledHint}</p>
        )}

        {step !== "sealed" && (
          <ol className="space-y-3 border-t border-line pt-3">
            {showGate() && (
              <li className="share-envelope__reveal space-y-1">
                <p className="font-mono text-xs tracking-wide text-moss">门禁网址</p>
                <code className="block break-all font-mono text-xs text-ink">
                  {gateUrl}
                </code>
              </li>
            )}
            {showPhrase() && (
              <li className="share-envelope__reveal space-y-1">
                <p className="font-mono text-xs tracking-wide text-moss">共享口令</p>
                <code className="block break-all font-mono text-sm tracking-wide text-ink">
                  {passphrase}
                </code>
              </li>
            )}
            {showInvite() && (
              <li className="share-envelope__reveal space-y-1">
                <p className="font-mono text-xs tracking-wide text-moss">邀请码</p>
                <code className="block font-mono text-lg tracking-[0.35em] text-ink">
                  {inviteCode}
                </code>
              </li>
            )}
          </ol>
        )}

        {status && (
          <p className="font-mono text-xs text-ok">{status}</p>
        )}
      </div>
    </div>
  );
}
