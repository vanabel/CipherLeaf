import { NextResponse } from "next/server";
import { destroyDocument } from "@/lib/capability/service";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ secret: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { secret } = await ctx.params;
  const ok = destroyDocument(secret);
  if (!ok) {
    return NextResponse.json({ error: "控制台不存在。" }, { status: 404 });
  }
  return NextResponse.json(
    { destroyed: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
