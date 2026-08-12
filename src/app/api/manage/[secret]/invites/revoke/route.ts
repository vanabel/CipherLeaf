import { NextResponse } from "next/server";
import { z } from "zod";
import { revokeInvite } from "@/lib/capability/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ secret: string }> };

const Body = z.object({
  inviteId: z.string().min(1),
});

export async function POST(req: Request, ctx: Ctx) {
  const { secret } = await ctx.params;
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效。" }, { status: 400 });
  }
  const result = revokeInvite(secret, parsed.data.inviteId);
  if (!result.ok) {
    const status = result.error.includes("不存在") ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json(
    { revoked: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
