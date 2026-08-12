export function buildWatermarkPattern(
  fingerprint: string,
  dateISO: string,
): string {
  return `CL · ${fingerprint} · ${dateISO}`;
}

/** Soft synonym substitutions for mild fingerprinting (disclosed, not covert). */
const PAIRS: [RegExp, string, string][] = [
  [/\b因此\b/g, "因此", "所以"],
  [/\b所以\b/g, "所以", "因此"],
  [/\b例如\b/g, "例如", "譬如"],
  [/\b譬如\b/g, "譬如", "例如"],
  [/\bhowever\b/gi, "however", "nevertheless"],
  [/\btherefore\b/gi, "therefore", "thus"],
  [/\bfor example\b/gi, "for example", "for instance"],
];

export function applySoftFingerprint(markdown: string, fingerprint: string): string {
  let bits = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    bits ^= fingerprint.charCodeAt(i) << (i % 8);
  }
  let out = markdown;
  PAIRS.forEach((pair, idx) => {
    const useAlt = ((bits >> idx) & 1) === 1;
    if (!useAlt) return;
    out = out.replace(pair[0], pair[2]);
  });
  return out;
}
