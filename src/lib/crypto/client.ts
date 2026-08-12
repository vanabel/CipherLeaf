/** Browser crypto: short share secrets + wrapped AES-256 content keys. */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const padded = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Legacy standard base64 (old links). */
function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function looksLikeBase64Url(s: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(s);
}

async function importAesKey(raw: BufferSource): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** Derive a 256-bit wrap key from the short share secret. */
async function deriveWrapKey(shareSecretB64url: string): Promise<CryptoKey> {
  const secretBytes = base64UrlToBytes(shareSecretB64url);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", secretBytes));
  return importAesKey(hash);
}

export type SealedPayload = {
  /** Short fragment secret (~12 chars). Put in URL hash only. */
  shareSecret: string;
  ciphertext: string;
  iv: string;
  wrappedKey: string;
  wrapIv: string;
};

/**
 * Encrypt Markdown with a full AES-256 content key, then wrap that key
 * under a short share secret so the URL fragment stays short.
 */
export async function sealMarkdown(plaintext: string): Promise<SealedPayload> {
  const contentRaw = crypto.getRandomValues(new Uint8Array(32));
  const shareRaw = crypto.getRandomValues(new Uint8Array(9)); // 72-bit → ~12 chars
  const shareSecret = bytesToBase64Url(shareRaw);

  const contentKey = await importAesKey(contentRaw);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    contentKey,
    new TextEncoder().encode(plaintext),
  );

  const wrapKey = await deriveWrapKey(shareSecret);
  const wrapIv = crypto.getRandomValues(new Uint8Array(12));
  const wrappedBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: wrapIv },
    wrapKey,
    contentRaw,
  );

  return {
    shareSecret,
    ciphertext: bytesToBase64Url(new Uint8Array(cipherBuf)),
    iv: bytesToBase64Url(iv),
    wrappedKey: bytesToBase64Url(new Uint8Array(wrappedBuf)),
    wrapIv: bytesToBase64Url(wrapIv),
  };
}

export async function unwrapContentKey(
  shareSecret: string,
  wrappedKeyB64: string,
  wrapIvB64: string,
): Promise<CryptoKey> {
  const wrapKey = await deriveWrapKey(shareSecret);
  const raw = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBytes(wrapIvB64) },
    wrapKey,
    decodeBytes(wrappedKeyB64),
  );
  return importAesKey(new Uint8Array(raw));
}

/**
 * Wrap the shared gate passphrase under shareSecret so the author console
 * can recover it later. Server stores ciphertext only (same model as wrapped_key).
 */
export async function wrapPassphrase(
  shareSecret: string,
  passphrase: string,
): Promise<{ wrappedPassphrase: string; passphraseWrapIv: string }> {
  const wrapKey = await deriveWrapKey(shareSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrapKey,
    new TextEncoder().encode(passphrase.normalize("NFKC")),
  );
  return {
    wrappedPassphrase: bytesToBase64Url(new Uint8Array(cipher)),
    passphraseWrapIv: bytesToBase64Url(iv),
  };
}

export async function unwrapPassphrase(
  shareSecret: string,
  wrappedPassphraseB64: string,
  wrapIvB64: string,
): Promise<string> {
  const wrapKey = await deriveWrapKey(shareSecret);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBytes(wrapIvB64) },
    wrapKey,
    decodeBytes(wrappedPassphraseB64),
  );
  return new TextDecoder().decode(plain);
}

function decodeBytes(encoded: string): Uint8Array<ArrayBuffer> {
  if (encoded.includes("+") || encoded.includes("/") || encoded.includes("=")) {
    return base64ToBytes(encoded);
  }
  return base64UrlToBytes(encoded);
}

/**
 * Resolve fragment material into a CryptoKey.
 * - New short links: fragment is shareSecret; needs wrappedKey from server.
 * - Legacy long links: fragment is raw AES key (base64).
 */
export async function resolveContentKey(
  fragment: string,
  wrapped?: { wrappedKey: string; wrapIv: string } | null,
): Promise<CryptoKey> {
  // Legacy: full 32-byte key in fragment (~43–44 chars base64)
  if (!wrapped?.wrappedKey || fragment.length >= 40) {
    const raw = looksLikeBase64Url(fragment) && !fragment.includes("+")
      ? base64UrlToBytes(fragment)
      : base64ToBytes(fragment);
    if (raw.length === 32) return importAesKey(raw);
  }
  if (!wrapped?.wrappedKey || !wrapped.wrapIv) {
    throw new Error("缺少包装密钥，无法解密。");
  }
  return unwrapContentKey(fragment, wrapped.wrappedKey, wrapped.wrapIv);
}

export async function decryptMarkdownWithKey(
  ciphertextB64: string,
  ivB64: string,
  key: CryptoKey,
): Promise<string> {
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodeBytes(ivB64) },
    key,
    decodeBytes(ciphertextB64),
  );
  return new TextDecoder().decode(plainBuf);
}

export function readFragmentKey(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Fragment is short — prefer raw append without heavy encoding. */
export function withFragment(path: string, secret: string): string {
  // share secrets are base64url already; avoid % encoding length blow-up
  if (/^[A-Za-z0-9_-]+$/.test(secret)) return `${path}#${secret}`;
  return `${path}#${encodeURIComponent(secret)}`;
}

/** @deprecated kept for scripts; prefer sealMarkdown */
export async function generateContentKey(): Promise<string> {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64Url(raw);
}

export async function encryptMarkdown(
  plaintext: string,
  keyB64: string,
): Promise<{ ciphertext: string; iv: string }> {
  const key = await importAesKey(decodeBytes(keyB64));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    ciphertext: bytesToBase64Url(new Uint8Array(cipherBuf)),
    iv: bytesToBase64Url(iv),
  };
}

export async function decryptMarkdown(
  ciphertextB64: string,
  ivB64: string,
  keyB64: string,
): Promise<string> {
  const key = await importAesKey(decodeBytes(keyB64));
  return decryptMarkdownWithKey(ciphertextB64, ivB64, key);
}
