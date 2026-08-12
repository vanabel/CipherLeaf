/** Map common Unicode math glyphs into KaTeX-friendly TeX and wrap with `$`. */

const SUB: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
  "₊": "+",
  "₋": "-",
  "ₙ": "n",
  "ᵢ": "i",
  "ⱼ": "j",
  "ₖ": "k",
  "ₘ": "m",
  "ₓ": "x",
  "ₐ": "a",
  "ₑ": "e",
  "ₒ": "o",
  "ₛ": "s",
  "ₜ": "t",
};

const SUP: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁺": "+",
  "⁻": "-",
  "ⁿ": "n",
};

const UNICODE_MATH_RE = /[₀-₉ₙᵢⱼₖₘₓₐₑₒₛₜ₊₋⁰-⁹ⁿ⁺⁻·×≡]/;

function mapRun(run: string, table: Record<string, string>): string {
  return [...run].map((ch) => table[ch] ?? ch).join("");
}

export function unicodeFragmentToTex(fragment: string): string {
  let s = fragment
    .replace(/[（(]/g, "(")
    .replace(/[）)]/g, ")")
    .replace(/−/g, "-")
    .replace(/·/g, "\\cdot ")
    .replace(/×/g, "\\times ")
    .replace(/≡/g, "\\equiv ")
    .replace(/△/g, "\\triangle ")
    .replace(/∠/g, "\\angle ");

  s = s.replace(
    /([A-Za-z)])([₀₁₂₃₄₅₆₇₈₉₊₋ₙᵢⱼₖₘₓₐₑₒₛₜ]+)/g,
    (_, base, subs) => `${base}_{${mapRun(subs, SUB)}}`,
  );

  s = s.replace(
    /([A-Za-z0-9)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ]+)/g,
    (_, base, sups) => `${base}^{${mapRun(sups, SUP)}}`,
  );

  s = s.replace(
    /\^\{([^}]+)\}/g,
    (_, inner: string) => `^{${inner.replace(/−/g, "-")}}`,
  );

  return s.trim();
}

/**
 * Wrap Unicode-heavy math phrases in $...$ so KaTeX can render them.
 * Leaves existing $ / $$ / fenced code untouched.
 */
export function enhanceMathMarkup(markdown: string): string {
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
      if (!UNICODE_MATH_RE.test(part)) return part;

      return part.replace(
        /[A-Za-z0-9(（\\]*[₀-₉ₙᵢⱼₖₘₓₐₑₒₛₜ₊₋⁰-⁹ⁿ⁺⁻][A-Za-z0-9₀-₉ₙᵢⱼₖₘₓₐₑₒₛₜ₊₋⁰-⁹ⁿ⁺⁻()（）[\]{}_^=+\-−·×≡\\^\s,.]*/g,
        (match) => {
          const trailingSpace = match.match(/\s+$/)?.[0] ?? "";
          const core = match.trimEnd();
          if (!UNICODE_MATH_RE.test(core)) return match;
          const tex = unicodeFragmentToTex(core);
          return `$${tex}$${trailingSpace}`;
        },
      );
    })
    .join("");
}
