export function buildWatermarkPattern(
  fingerprint: string,
  dateISO: string,
): string {
  return `CL · ${fingerprint} · ${dateISO}`;
}

/** Dense visible CSS watermark: tiled SVG cell (size / angle / opacity tuned for fill). */
export function buildVisibleWatermarkBackground(mark: string): {
  backgroundImage: string;
  backgroundSize: string;
} {
  const safe = mark
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  // Cell ~180×100 → nearly fills viewport; -18° matches prior ::after tilt
  const w = 180;
  const h = 100;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<text x="${w / 2}" y="${h / 2}" fill="#2f5d50" font-family="ui-monospace,monospace" ` +
    `font-size="10" letter-spacing="1.6" text-anchor="middle" dominant-baseline="middle" ` +
    `transform="rotate(-18 ${w / 2} ${h / 2})">${safe}</text></svg>`;
  return {
    backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    backgroundSize: `${w}px ${h}px`,
  };
}

type SynonymGroup = { pattern: RegExp; a: string; b: string };

const GROUPS: SynonymGroup[] = [
  { pattern: /因此|所以/g, a: "因此", b: "所以" },
  { pattern: /例如|譬如/g, a: "例如", b: "譬如" },
  { pattern: /\bhowever\b|\bnevertheless\b/gi, a: "however", b: "nevertheless" },
  { pattern: /\btherefore\b|\bthus\b/gi, a: "therefore", b: "thus" },
  {
    pattern: /\bfor example\b|\bfor instance\b/gi,
    a: "for example",
    b: "for instance",
  },
];

function fingerprintSeed(fingerprint: string): number {
  let h = 2166136261;
  for (let i = 0; i < fingerprint.length; i++) {
    h ^= fingerprint.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Soft fingerprint: per-occurrence flips (not one global find-replace),
 * so bulk 因此→所以 cannot cleanly erase the mark.
 */
export function applySoftFingerprint(
  markdown: string,
  fingerprint: string,
): string {
  const seed = fingerprintSeed(fingerprint);
  const rand = prng(seed);
  let out = markdown;
  GROUPS.forEach((group, groupIdx) => {
    let occ = 0;
    out = out.replace(group.pattern, (match) => {
      occ += 1;
      const flip =
        ((seed >>> (groupIdx % 16)) & 1) ^
        (occ & 1) ^
        (rand() < 0.55 ? 1 : 0);
      const norm = match.toLowerCase();
      const matchIsA = norm === group.a.toLowerCase();
      const wantA = flip ? !matchIsA : matchIsA;
      const word = wantA ? group.a : group.b;
      if (/[A-Za-z]/.test(match) && match[0] === match[0].toUpperCase()) {
        return word[0].toUpperCase() + word.slice(1);
      }
      return word;
    });
  });
  return out;
}

const ZW0 = "\u200b";
const ZW1 = "\u200c";

function toBitString(payload: string): string {
  const bytes = new TextEncoder().encode(payload.slice(0, 64));
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  return bits;
}

function fromBitString(bits: string): string | null {
  if (!bits || bits.length % 8 !== 0) return null;
  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  try {
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function permuteIndices(n: number, fingerprint: string): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  const rand = prng(fingerprintSeed(fingerprint) ^ 0x9e3779b9);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/** Reverse (keyed) + permute positions — defeats searching for sequential "CL:…" bits. */
function scrambleBits(bits: string, fingerprint: string): string {
  const arr = [...bits];
  if (fingerprintSeed(fingerprint) & 1) arr.reverse();
  // Second reverse of each byte (8 bits) for extra disorder.
  for (let i = 0; i + 8 <= arr.length; i += 8) {
    if ((fingerprintSeed(fingerprint) >>> ((i / 8) % 16)) & 1) {
      const slice = arr.slice(i, i + 8).reverse();
      for (let k = 0; k < 8; k++) arr[i + k] = slice[k];
    }
  }
  const order = permuteIndices(arr.length, fingerprint);
  const out = new Array<string>(arr.length);
  for (let i = 0; i < order.length; i++) out[order[i]] = arr[i];
  return out.join("");
}

function unscrambleBits(scrambled: string, fingerprint: string): string {
  const arr = [...scrambled];
  const order = permuteIndices(arr.length, fingerprint);
  const restored = new Array<string>(arr.length);
  for (let i = 0; i < order.length; i++) restored[i] = arr[order[i]];
  for (let i = 0; i + 8 <= restored.length; i += 8) {
    if ((fingerprintSeed(fingerprint) >>> ((i / 8) % 16)) & 1) {
      const slice = restored.slice(i, i + 8).reverse();
      for (let k = 0; k < 8; k++) restored[i + k] = slice[k];
    }
  }
  if (fingerprintSeed(fingerprint) & 1) restored.reverse();
  return restored.join("");
}

/**
 * Spread one bit after each visible character (skip code fences).
 * No single contiguous ZW blob — naive block find/replace fails;
 * deleting *all* zero-width chars still removes the channel (disclosed limit).
 */
function interleaveBits(markdown: string, bits: string): string {
  let bi = 0;
  let inFence = false;
  const lines = markdown.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence || !line.trim()) {
      out.push(line);
      continue;
    }
    let built = "";
    for (const ch of line) {
      built += ch;
      if (bi < bits.length) {
        built += bits[bi] === "1" ? ZW1 : ZW0;
        bi += 1;
      }
    }
    out.push(built);
  }

  // Any remainder goes only at EOF (keeps document-order bit stream contiguous).
  if (bi < bits.length) {
    const rest = [...bits.slice(bi)]
      .map((b) => (b === "1" ? ZW1 : ZW0))
      .join("");
    return `${out.join("\n")}${rest}`;
  }

  return out.join("\n");
}

export function embedInvisibleWatermark(
  markdown: string,
  fingerprint: string,
  dateISO: string,
): string {
  const payload = `CL:${fingerprint}:${dateISO}`;
  const rawBits = toBitString(payload);
  const scrambled = scrambleBits(rawBits, fingerprint);
  const lenBits = rawBits.length.toString(2).padStart(16, "0");
  const framed = scrambleBits(`${lenBits}${scrambled}`, `${fingerprint}:frame`);
  return interleaveBits(markdown, framed);
}

export function decodeInvisiblePayload(
  text: string,
  fingerprint: string,
): string | null {
  const bits = [...text]
    .map((ch) => (ch === ZW1 ? "1" : ch === ZW0 ? "0" : ""))
    .join("");
  if (bits.length < 24) return null;

  const frameKey = `${fingerprint}:frame`;
  for (let cut = bits.length - (bits.length % 8); cut >= 24; cut -= 8) {
    const unframed = unscrambleBits(bits.slice(0, cut), frameKey);
    const payloadBitLen = parseInt(unframed.slice(0, 16), 2);
    if (!payloadBitLen || payloadBitLen > 8 * 64) continue;
    if (unframed.length < 16 + payloadBitLen) continue;
    const raw = unscrambleBits(
      unframed.slice(16, 16 + payloadBitLen),
      fingerprint,
    );
    const decoded = fromBitString(raw);
    if (decoded?.startsWith("CL:")) return decoded;
  }
  return null;
}
