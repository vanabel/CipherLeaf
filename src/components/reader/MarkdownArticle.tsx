"use client";

import { MathMarkdown } from "@/components/markdown/MathMarkdown";
import type { ManuscriptMeta } from "@/lib/markdown/frontmatter";

function MetaBlock({ meta }: { meta: ManuscriptMeta }) {
  const rows: { label: string; value: string }[] = [];
  if (meta.author) rows.push({ label: "作者", value: meta.author });
  if (meta.type) rows.push({ label: "类型", value: meta.type });
  if (meta.sourceType) rows.push({ label: "来源", value: meta.sourceType });
  if (meta.copyright) rows.push({ label: "版权", value: meta.copyright });

  if (rows.length === 0 && meta.tags.length === 0) return null;

  return (
    <aside className="mb-10 space-y-3 border border-line bg-mist/50 px-4 py-4 text-sm text-ink-soft">
      {rows.map((row) => (
        <p key={row.label} className="leading-relaxed">
          <span className="font-mono text-xs tracking-wide text-moss">
            {row.label}
          </span>
          <span className="mx-2 text-line">·</span>
          <span>{row.value}</span>
        </p>
      ))}
      {meta.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {meta.tags.map((tag) => (
            <span
              key={tag}
              className="border border-line bg-paper px-2 py-0.5 font-mono text-xs text-ink-soft"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </aside>
  );
}

export function MarkdownArticle({
  body,
  meta,
  hasFrontmatter,
}: {
  body: string;
  meta: ManuscriptMeta;
  hasFrontmatter: boolean;
}) {
  return (
    <div>
      {hasFrontmatter && <MetaBlock meta={meta} />}
      <MathMarkdown source={body} className="prose-leaf" />
    </div>
  );
}
