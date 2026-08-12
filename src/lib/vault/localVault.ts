/** Local encrypted bookmark vault — no server account. */

export type VaultEntryStatus = "active" | "destroyed";

export type VaultEntry = {
  id: string;
  title: string;
  manageUrl: string;
  gateUrl?: string;
  savedAt: number;
  /** Document destroyed on server (or verified missing). */
  status?: VaultEntryStatus;
  destroyedAt?: number;
};

type VaultPlain = { entries: VaultEntry[] };

type VaultBlob = {
  v: 1;
  salt: string;
  iv: string;
  ciphertext: string;
};

const STORAGE_KEY = "cipherleaf.vault.v1";

function bytesToB64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 120_000,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function vaultExists(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

export function readVaultBlob(): VaultBlob | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VaultBlob;
  } catch {
    return null;
  }
}

export async function createVault(
  passphrase: string,
  initial: VaultEntry[] = [],
): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plain: VaultPlain = { entries: initial };
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(plain)),
  );
  const blob: VaultBlob = {
    v: 1,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ciphertext: bytesToB64(new Uint8Array(cipher)),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
}

export async function unlockVault(passphrase: string): Promise<VaultEntry[]> {
  const blob = readVaultBlob();
  if (!blob) throw new Error("本机还没有书签包。");
  const key = await deriveKey(passphrase, b64ToBytes(blob.salt));
  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(blob.iv) },
      key,
      b64ToBytes(blob.ciphertext),
    );
    const parsed = JSON.parse(new TextDecoder().decode(plainBuf)) as VaultPlain;
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch {
    throw new Error("口令不正确，或书签包已损坏。");
  }
}

export async function saveVaultEntries(
  passphrase: string,
  entries: VaultEntry[],
): Promise<void> {
  const existing = readVaultBlob();
  const salt = existing
    ? b64ToBytes(existing.salt)
    : crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify({ entries } satisfies VaultPlain)),
  );
  const blob: VaultBlob = {
    v: 1,
    salt: bytesToB64(salt),
    iv: bytesToB64(iv),
    ciphertext: bytesToB64(new Uint8Array(cipher)),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
}

export function newEntryId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export async function upsertVaultEntry(
  passphrase: string,
  entry: Omit<VaultEntry, "id" | "savedAt"> & { id?: string },
): Promise<VaultEntry[]> {
  const entries = vaultExists() ? await unlockVault(passphrase) : [];
  const now = Date.now();
  const idx = entries.findIndex(
    (e) =>
      managePathKey(e.manageUrl) === managePathKey(entry.manageUrl) ||
      (entry.id && e.id === entry.id),
  );
  const next: VaultEntry = {
    id: entry.id || (idx >= 0 ? entries[idx].id : newEntryId()),
    title: entry.title,
    manageUrl: entry.manageUrl,
    gateUrl: entry.gateUrl,
    savedAt: now,
    status: entry.status ?? (idx >= 0 ? entries[idx].status : "active") ?? "active",
    destroyedAt: entry.destroyedAt ?? (idx >= 0 ? entries[idx].destroyedAt : undefined),
  };
  if (idx >= 0) entries[idx] = { ...entries[idx], ...next };
  else entries.unshift(next);
  if (!vaultExists()) await createVault(passphrase, entries);
  else await saveVaultEntries(passphrase, entries);
  return entries;
}

/** Path-only key so #fragment differences still match. */
export function managePathKey(url: string): string {
  try {
    const u = new URL(url, "https://cipherleaf.local");
    return u.pathname.replace(/\/$/, "") || "/";
  } catch {
    return url.split("#")[0]?.split("?")[0] || url;
  }
}

export function manageSecretFromUrl(url: string): string | null {
  try {
    const path = managePathKey(url);
    const m = path.match(/^\/(?:m|manage)\/([^/]+)$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function markVaultEntryDestroyed(
  passphrase: string,
  manageUrl: string,
): Promise<{ entries: VaultEntry[]; matched: boolean }> {
  const entries = await unlockVault(passphrase);
  const key = managePathKey(manageUrl);
  let matched = false;
  const now = Date.now();
  const next = entries.map((e) => {
    if (managePathKey(e.manageUrl) !== key) return e;
    matched = true;
    return {
      ...e,
      status: "destroyed" as const,
      destroyedAt: now,
    };
  });
  if (matched) await saveVaultEntries(passphrase, next);
  return { entries: next, matched };
}

/** Probe manage APIs and mark missing documents as destroyed. */
export async function syncVaultDestroyedStatus(
  passphrase: string,
): Promise<VaultEntry[]> {
  const entries = await unlockVault(passphrase);
  let changed = false;
  const now = Date.now();
  const next: VaultEntry[] = [];
  for (const e of entries) {
    if (e.status === "destroyed") {
      next.push(e);
      continue;
    }
    const secret = manageSecretFromUrl(e.manageUrl);
    if (!secret) {
      next.push(e);
      continue;
    }
    try {
      const res = await fetch(`/api/manage/${secret}`, { cache: "no-store" });
      if (res.status === 404) {
        changed = true;
        next.push({ ...e, status: "destroyed", destroyedAt: now });
      } else {
        next.push(e);
      }
    } catch {
      next.push(e);
    }
  }
  if (changed) await saveVaultEntries(passphrase, next);
  return next;
}

export async function removeVaultEntry(
  passphrase: string,
  id: string,
): Promise<VaultEntry[]> {
  const entries = (await unlockVault(passphrase)).filter((e) => e.id !== id);
  await saveVaultEntries(passphrase, entries);
  return entries;
}

/** Prompt and mark a manage URL as destroyed in the local vault (best-effort). */
export async function promptMarkDestroyedInVault(
  manageUrl: string,
): Promise<"ok" | "skip" | "cancel" | "error"> {
  if (!vaultExists()) return "skip";
  const pwd = window.prompt(
    "文档已销毁。输入本机书签包口令，将对应书签标为「已销毁」：",
  );
  if (pwd == null) return "cancel";
  try {
    const { matched } = await markVaultEntryDestroyed(pwd, manageUrl);
    if (!matched) {
      window.alert("书签包里没有匹配的条目（可能尚未加入书签包）。");
      return "skip";
    }
    return "ok";
  } catch (e) {
    window.alert(e instanceof Error ? e.message : "更新书签失败");
    return "error";
  }
}

export function clearVault(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function downloadBackupJson(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportVaultFile(blob: VaultBlob = readVaultBlob()!) {
  if (!blob) throw new Error("没有可导出的书签包。");
  downloadBackupJson(blob, `cipherleaf-vault-${Date.now()}.json`);
}

export async function importVaultFile(file: File): Promise<void> {
  const text = await file.text();
  const parsed = JSON.parse(text) as VaultBlob;
  if (parsed.v !== 1 || !parsed.salt || !parsed.iv || !parsed.ciphertext) {
    throw new Error("不是有效的 CipherLeaf 书签包文件。");
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
}

/** Prompt for vault passphrase and save an entry (used by create / manage UI). */
export async function promptSaveToVault(entry: {
  title: string;
  manageUrl: string;
  gateUrl?: string;
}): Promise<"ok" | "cancel" | "error"> {
  const pwd = window.prompt(
    vaultExists()
      ? "输入本机书签包口令以保存："
      : "创建本机书签包：设置一个口令（至少 6 位）：",
  );
  if (pwd == null) return "cancel";
  if (!vaultExists() && pwd.trim().length < 6) {
    window.alert("口令至少 6 个字符。");
    return "error";
  }
  try {
    if (!vaultExists()) await createVault(pwd, []);
    await upsertVaultEntry(pwd, entry);
    return "ok";
  } catch (e) {
    window.alert(e instanceof Error ? e.message : "保存失败");
    return "error";
  }
}
