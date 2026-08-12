import type { Metadata } from "next";
import { GateCeremony } from "@/components/gate/GateCeremony";
import {
  buildShareOgDescription,
  buildShareOgTitle,
} from "@/lib/share/letter";

export const runtime = "nodejs";

type Props = PageProps<"/g/[token]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const ogTitle = buildShareOgTitle();
  const description = buildShareOgDescription();
  const path = `/g/${token}`;

  return {
    title: ogTitle,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName: "CipherLeaf",
      url: path,
      title: ogTitle,
      description,
      images: [
        {
          url: "/og-envelope.png",
          width: 1200,
          height: 630,
          alt: "CipherLeaf 封存信封",
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: ["/og-envelope.png"],
    },
    // No search indexing for ephemeral gates; do not block share crawlers.
    robots: {
      index: false,
      follow: true,
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
