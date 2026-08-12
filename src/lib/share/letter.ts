export type ShareLetterParts = {
  gateUrl: string;
  passphrase?: string | null;
  inviteCode?: string | null;
  title?: string | null;
};

const GATE_STORAGE_PREFIX = "cl:gate:";

export function gateStorageKey(manageSecret: string): string {
  return `${GATE_STORAGE_PREFIX}${manageSecret}`;
}

export function rememberGateUrl(manageSecret: string, gateUrl: string): void {
  try {
    sessionStorage.setItem(gateStorageKey(manageSecret), gateUrl);
  } catch {
    /* private mode / quota */
  }
}

export function recallGateUrl(manageSecret: string): string | null {
  try {
    return sessionStorage.getItem(gateStorageKey(manageSecret));
  } catch {
    return null;
  }
}

/**
 * Public OG/link-preview title — envelope exterior only, no secrets.
 *
 * Deliberately omits manuscript titles: WeChat (and similar crawlers) often
 * drop link cards when OG text trips content filters, and CipherLeaf's
 * typical titles are exactly the kind that get filtered. Recipients still
 * see the real title inside the share letter / after opening the gate.
 */
export function buildShareOgTitle(_title?: string | null): string {
  return "CipherLeaf · 一份已封存的手稿";
}

/**
 * Public OG/link-preview description — envelope tone only.
 * Never include passphrase, invite code, manage URL, ciphertext, or titles.
 */
export function buildShareOgDescription(_title?: string | null): string {
  return "一份手稿已为你封存；打开后依门禁提示启封。正文经客户端加密，服务器不存明文。";
}

/** Reader-facing letter; never includes the author manage URL. */
export function buildShareLetter(parts: ShareLetterParts): string {
  const lines: string[] = [];
  const title = parts.title?.trim();
  if (title) {
    lines.push(`一份手稿《${title}》已为你封存。`);
  } else {
    lines.push("一份手稿已为你封存。");
  }
  lines.push("");
  lines.push("门禁网址：");
  lines.push(parts.gateUrl.trim());
  lines.push("");

  const phrase = parts.passphrase?.trim();
  if (phrase) {
    lines.push("共享口令：");
    lines.push(phrase);
    lines.push("");
  }

  const code = parts.inviteCode?.trim();
  if (code) {
    lines.push("邀请码：");
    lines.push(code);
    lines.push("");
  }

  lines.push("打开网址后，依门禁提示完成推演，即可启封阅读。");
  return lines.join("\n");
}
