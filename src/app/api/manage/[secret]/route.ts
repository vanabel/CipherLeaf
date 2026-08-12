import { NextResponse } from "next/server";
import { getManageSnapshot } from "@/lib/capability/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ secret: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { secret } = await ctx.params;
  const snap = getManageSnapshot(secret);
  if (!snap) {
    return NextResponse.json({ error: "控制台不存在。" }, { status: 404 });
  }
  return NextResponse.json(snap, {
    headers: { "Cache-Control": "no-store" },
  });
}
