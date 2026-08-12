import type { Metadata } from "next";
import { GateCeremony } from "@/components/gate/GateCeremony";
import { getDocumentByGateToken } from "@/lib/capability/service";
import {
  buildShareOgDescription,
  buildShareOgTitle,
} from "@/lib/share/letter";

export const runtime = "nodejs";

type Props = PageProps<"/g/[token]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const document = getDocumentByGateToken(token);
  const title = document?.title ?? null;
  const ogTitle = buildShareOgTitle(title);
  const description = buildShareOgDescription(title);

  return {
    title: ogTitle,
    description,
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName: "CipherLeaf",
      title: ogTitle,
      description,
      images: [
        {
          url: "/og-envelope.png",
          width: 1200,
          height: 630,
          alt: "CipherLeaf 封存信封",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: ["/og-envelope.png"],
    },
    // Avoid indexing ephemeral gate URLs; still allow share crawlers.
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function GatePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <GateCeremony />
    </main>
  );
}
