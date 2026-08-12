import { NextResponse } from "next/server";
import { z } from "zod";
import { createDocument } from "@/lib/capability/service";

export const runtime = "nodejs";

const Body = z.object({
  title: z.string().max(200).default(""),
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  wrappedKey: z.string().min(1).optional(),
  wrapIv: z.string().min(1).optional(),
  securityPreset: z.enum(["standard", "private", "sensitive"]),
  gateMode: z.enum(["open", "secret", "invite"]),
  difficulty: z.enum(["thoughtful", "mathematical", "deep"]),
  ttlSeconds: z.number().int().min(60).max(60 * 60 * 24 * 14),
  watermark: z.boolean(),
  copyFriction: z.boolean(),
  passphrase: z.string().min(4).max(128).optional(),
  wrappedPassphrase: z.string().min(1).optional(),
  passphraseWrapIv: z.string().min(1).optional(),
  initialInviteCount: z.number().int().min(1).max(20).optional(),
  inviteLabels: z.array(z.string().max(64)).max(20).optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = Body.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "文档参数无效。" },
        { status: 400 },
      );
    }
    const data = parsed.data;
    if (data.gateMode === "secret" || data.securityPreset === "sensitive") {
      if (!data.passphrase) {
        return NextResponse.json(
          { error: "此安全策略需要共享口令。" },
          { status: 400 },
        );
      }
    }
    const result = createDocument({
      ...data,
      passphrase: data.passphrase,
      wrappedPassphrase: data.wrappedPassphrase,
      passphraseWrapIv: data.passphraseWrapIv,
    });
    return NextResponse.json(
      {
        gateToken: result.gateToken,
        manageSecret: result.manageSecret,
        invites: result.invites,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "创建文档失败。" }, { status: 500 });
  }
}
