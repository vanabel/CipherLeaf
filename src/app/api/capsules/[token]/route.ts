import { NextResponse } from "next/server";
import {
  canRetryGate,
  getCapsuleByToken,
  getDocumentById,
} from "@/lib/capability/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const capsule = getCapsuleByToken(token);
  if (!capsule) {
    return NextResponse.json(
      { error: "阅读胶囊不存在。", code: "missing", canRetryGate: false },
      { status: 404 },
    );
  }

  const document = getDocumentById(capsule.document_id);
  const retry = document ? canRetryGate(document) : false;

  if (capsule.revoked_at) {
    return NextResponse.json(
      {
        error: "这份阅读胶囊已被撤销。",
        code: "revoked",
        canRetryGate: retry,
        hint: retry
          ? "若仍持有门禁链接，可重新完成挑战以换取新的阅读副本。"
          : "邀请码通常只能兑换一次；请联系作者重新发放邀请。",
      },
      { status: 410 },
    );
  }
  if (capsule.expires_at <= Date.now()) {
    return NextResponse.json(
      {
        error: "这份阅读胶囊已过期。",
        code: "expired",
        canRetryGate: retry,
        hint: retry
          ? "可通过原门禁链接重新解锁，获取新的短期阅读副本。"
          : "邀请码通常只能兑换一次；过期后请联系作者重新发放邀请。",
      },
      { status: 410 },
    );
  }

  if (!document || !document.ciphertext) {
    return NextResponse.json(
      { error: "手稿不可用。", code: "destroyed", canRetryGate: false },
      { status: 410 },
    );
  }

  return NextResponse.json(
    {
      title: document.title,
      ciphertext: document.ciphertext,
      iv: document.iv,
      wrappedKey: document.wrapped_key,
      wrapIv: document.wrap_iv,
      fingerprint: capsule.fingerprint,
      expiresAt: capsule.expires_at,
      watermark: !!document.watermark,
      copyFriction: !!document.copy_friction,
      gateMode: document.gate_mode,
      canRetryGate: canRetryGate(document),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
      },
    },
  );
}
