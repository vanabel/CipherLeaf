import { NextResponse } from "next/server";
import { z } from "zod";
import { rotateGate } from "@/lib/capability/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ secret: string }> };

const Body = z.object({
  revokeCapsules: z.boolean().optional().default(true),
});

export async function POST(req: Request, ctx: Ctx) {
  const { secret } = await ctx.params;
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效。" }, { status: 400 });
  }
  const result = rotateGate(secret, {
    revokeCapsules: parsed.data.revokeCapsules,
  });
  if (!result) {
    return NextResponse.json({ error: "控制台不存在。" }, { status: 404 });
  }
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
