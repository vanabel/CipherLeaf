/**
 * Fix CommonMark emphasis gaps common in Chinese Markdown.
 *
 * Patterns like `**标签：**正文` fail because a closing `**` preceded by
 * punctuation and followed by a letter is not "right-flanking".
 * Insert a word-break hint so `**…**` still renders as <strong>.
 */
export function enhanceEmphasisMarkup(markdown: string): string {
  const parts = markdown.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g);
  return parts
    .map((part) => {
      if (!part) return part;
      if (
        part.startsWith("```") ||
        part.startsWith("$$") ||
        (part.startsWith("$") && part.endsWith("$"))
      ) {
        return part;
      }

      // **bold** or __bold__ stuck to the next word/CJK char.
      // Must use real Unicode whitespace (Zs), not ZWSP — CommonMark flanking rules.
      let out = part.replace(
        /(\*\*[^*\n]+?\*\*|__[^_\n]+?__)(?=[\p{L}\p{N}\p{Script=Han}])/gu,
        "$1\u2009",
      );

      // *italic* or _italic_ (avoid matching **)
      out = out.replace(
        /(?<!\*)\*[^*\n]+?\*(?!\*)(?=[\p{L}\p{N}\p{Script=Han}])|(?<!_)_[^_\n]+?_(?!_)(?=[\p{L}\p{N}\p{Script=Han}])/gu,
        (m) => `${m}\u2009`,
      );

      return out;
    })
    .join("");
}
