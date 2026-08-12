import { NextResponse } from "next/server";
import { z } from "zod";
import { solveChallenge } from "@/lib/capability/service";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ token: string }> };

const Body = z.object({
  challengeId: z.string().min(1),
  answer: z.string().min(1).max(64),
  inviteCode: z.string().max(32).optional(),
  passphrase: z.string().max(128).optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const ip = clientIp(req);
  const gateLimit = checkRateLimit(`gate:solve:${token}`, 40, 60 * 60 * 1000);
  if (!gateLimit.ok) {
    return NextResponse.json(
      { error: `尝试过于频繁，请约 ${gateLimit.retryAfterSec} 秒后再试。` },
      { status: 429 },
    );
  }
  const ipLimit = checkRateLimit(`gate:solve:ip:${ip}`, 80, 60 * 60 * 1000);
  if (!ipLimit.ok) {
    return NextResponse.json(
      { error: `尝试过于频繁，请约 ${ipLimit.retryAfterSec} 秒后再试。` },
      { status: 429 },
    );
  }

  const json = await req.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "解题请求无效。" }, { status: 400 });
  }

  const result = solveChallenge({
    gateToken: token,
    ...parsed.data,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      capsuleToken: result.capsuleToken,
      fingerprint: result.fingerprint,
      expiresAt: result.expiresAt,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
