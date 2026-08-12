import { NextResponse } from "next/server";
import {
  getDocumentByGateToken,
  startChallenge,
} from "@/lib/capability/service";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const ip = clientIp(req);
  const gateLimit = checkRateLimit(`gate:challenge:${token}`, 30, 60 * 60 * 1000);
  if (!gateLimit.ok) {
    return NextResponse.json(
      { error: `请求过于频繁，请约 ${gateLimit.retryAfterSec} 秒后再试。` },
      { status: 429 },
    );
  }
  const ipLimit = checkRateLimit(`gate:challenge:ip:${ip}`, 60, 60 * 60 * 1000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: `请求过于频繁，请约 ${ipLimit.retryAfterSec} 秒后再试。` },
      { status: 429 },
    );
  }

  const document = getDocumentByGateToken(token);
  if (!document) {
    return NextResponse.json({ error: "门禁不存在。" }, { status: 404 });
  }

  const challenge = startChallenge(document);
  return NextResponse.json(
    {
      title: document.title,
      gateMode: document.gate_mode,
      difficulty: document.difficulty,
      ttlSeconds: document.ttl_seconds,
      requirePassphrase: !!document.passphrase_hash,
      requireInvite: document.gate_mode === "invite",
      challenge,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
