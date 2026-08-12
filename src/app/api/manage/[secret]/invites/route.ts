import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvite } from "@/lib/capability/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ secret: string }> };

const Body = z.object({
  /** Optional; can be filled in later when copying/sharing. */
  label: z.string().max(64).optional(),
});

export async function POST(req: Request, ctx: Ctx) {
  const { secret } = await ctx.params;
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效。" }, { status: 400 });
  }
  const result = createInvite(secret, parsed.data.label);
  if (!result) {
    return NextResponse.json({ error: "控制台不存在。" }, { status: 404 });
  }
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
