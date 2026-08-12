export type ManuscriptMeta = {
  title?: string;
  type?: string;
  tags: string[];
  author?: string;
  copyright?: string;
  sourceType?: string;
  publish?: boolean;
  extras: Record<string, unknown>;
};

export type ParsedManuscript = {
  meta: ManuscriptMeta;
  body: string;
  hasFrontmatter: boolean;
};

function stripQuotes(value: string): string {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function parseTags(raw: string): string[] {
  const inner = raw.trim();
  if (inner.startsWith("[") && inner.endsWith("]")) {
    return inner
      .slice(1, -1)
      .split(",")
      .map((t) => stripQuotes(t))
      .filter(Boolean);
  }
  return inner
    .split(/[,，]/)
    .map((t) => stripQuotes(t))
    .filter(Boolean);
}

function parseYamlBlock(yaml: string): Record<string, string | boolean | string[]> {
  const out: Record<string, string | boolean | string[]> = {};
  for (const line of yaml.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const raw = line.slice(idx + 1).trim();
    if (!key) continue;
    if (raw === "true") out[key] = true;
    else if (raw === "false") out[key] = false;
    else if (key === "tags" || raw.startsWith("[")) out[key] = parseTags(raw);
    else out[key] = stripQuotes(raw);
  }
  return out;
}

/**
 * Parse Obsidian / blog Markdown with optional YAML frontmatter.
 * Supports the common single-line fields used by Chinese note workflows.
 */
export function parseManuscript(source: string): ParsedManuscript {
  const trimmed = source.replace(/^\uFEFF/, "");
  const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) {
    return {
      meta: { tags: [], extras: {} },
      body: trimmed,
      hasFrontmatter: false,
    };
  }

  const data = parseYamlBlock(match[1]);
  const known = new Set([
    "title",
    "type",
    "tags",
    "author",
    "copyright",
    "source_type",
    "sourceType",
    "publish",
  ]);
  const extras: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!known.has(k)) extras[k] = v;
  }

  const tags = Array.isArray(data.tags)
    ? data.tags.map(String)
    : typeof data.tags === "string"
      ? parseTags(data.tags)
      : [];

  return {
    hasFrontmatter: true,
    body: match[2].replace(/^\s+/, ""),
    meta: {
      title: typeof data.title === "string" ? data.title : undefined,
      type: typeof data.type === "string" ? data.type : undefined,
      tags,
      author: typeof data.author === "string" ? data.author : undefined,
      copyright: typeof data.copyright === "string" ? data.copyright : undefined,
      sourceType:
        typeof data.source_type === "string"
          ? data.source_type
          : typeof data.sourceType === "string"
            ? data.sourceType
            : undefined,
      publish: typeof data.publish === "boolean" ? data.publish : undefined,
      extras,
    },
  };
}

export function inferTitleFromMarkdown(
  source: string,
  fallback = "未命名手稿",
): string {
  const { meta, body } = parseManuscript(source);
  if (meta.title) return meta.title;
  const heading = body.match(/^#\s+(.+)$/m);
  if (heading?.[1]) return heading[1].trim();
  return fallback;
}
