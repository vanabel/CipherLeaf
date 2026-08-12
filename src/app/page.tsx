import Link from "next/link";
import { CreateForm } from "@/components/create/CreateForm";

export default function HomePage() {
  return (
    <main className="relative flex-1 px-4 py-10 sm:px-6 sm:py-16">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <Link
          href="/vault"
          className="font-mono text-xs tracking-wide text-moss hover:underline"
        >
          本机书签包
        </Link>
      </div>
      <div className="mx-auto mb-12 max-w-2xl space-y-6 text-center sm:mb-16">
        <div
          className="mx-auto h-10 w-10 rounded-full border border-leaf/40"
          style={{ animation: "breathe 4.5s ease-in-out infinite" }}
          aria-hidden
        />
        <p className="font-mono text-xs tracking-[0.35em] text-moss uppercase">
          CipherLeaf
        </p>
        <h1 className="font-display text-4xl leading-tight tracking-tight text-ink sm:text-5xl">
          为审慎读者准备的加密知识
        </h1>
        <p className="mx-auto max-w-xl text-lg text-ink-soft">
          零明文托管。读者通过数学挑战获得准入。每次授权都是独立、短期、可撤销的阅读胶囊。
        </p>
        <div className="manuscript-rule mx-auto max-w-xs" />
        <p className="font-mono text-xs tracking-[0.2em] text-ink-soft uppercase">
          加密 · 门禁 · 过期 · 留痕
        </p>
      </div>
      <CreateForm />
      <footer className="mx-auto mt-16 max-w-2xl text-center text-sm text-ink-soft">
        旨在提高随手转载的成本——并不声称「无法复制」。
      </footer>
    </main>
  );
}
