import { NextResponse } from "next/server";
import { z } from "zod";
import {
  revokeAllCapsules,
  revokeCapsuleByFingerprint,
} from "@/lib/capability/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ secret: string }> };

const Body = z.object({
  fingerprint: z.string().min(1).max(64).optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  const { secret } = await ctx.params;
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效。" }, { status: 400 });
  }

  if (parsed.data.fingerprint) {
    const result = revokeCapsuleByFingerprint(secret, parsed.data.fingerprint);
    if (!result.ok) {
      const status = result.error.includes("不存在") ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(
      { revoked: true, fingerprint: parsed.data.fingerprint },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const ok = revokeAllCapsules(secret);
  if (!ok) {
    return NextResponse.json({ error: "控制台不存在。" }, { status: 404 });
  }
  return NextResponse.json(
    { revoked: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
