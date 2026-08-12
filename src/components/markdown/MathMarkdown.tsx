"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Components } from "react-markdown";

const baseComponents: Components = {
  img: () => (
    <span className="text-sm text-ink-soft">[远程图片已禁用]</span>
  ),
  a: ({ href, children }) => <span title={href || ""}>{children}</span>,
};

type Props = {
  source: string;
  className?: string;
  components?: Components;
};

/**
 * Markdown + GFM + KaTeX.
 * Inline: $x_n = 2$ or \(x_n = 2\)
 * Display: $$...$$ or \[...\]
 */
export function MathMarkdown({ source, className, components }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ ...baseComponents, ...components }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
