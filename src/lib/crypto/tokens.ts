import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { customAlphabet } from "nanoid";

/** URL-safe alphabet without ambiguous chars (no 0/O/1/l/I). */
const URL_ALPHABET =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const tokenAlphabet = customAlphabet(URL_ALPHABET, 10);
const manageAlphabet = customAlphabet(URL_ALPHABET, 14);
const shortId = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 4);
const inviteAlphabet = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

export function generateToken(size = 10): string {
  if (size === 10) return tokenAlphabet();
  return customAlphabet(URL_ALPHABET, size)();
}

export function generateManageSecret(): string {
  return manageAlphabet();
}

export function generateInviteCode(): string {
  return inviteAlphabet();
}

export function generateFingerprint(): string {
  return shortId();
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function hashPassphrase(passphrase: string, saltHex?: string): {
  salt: string;
  hash: string;
} {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : randomBytes(16);
  const hash = scryptSync(passphrase.normalize("NFKC"), salt, 32);
  return { salt: salt.toString("hex"), hash: hash.toString("hex") };
}

export function verifyPassphrase(
  passphrase: string,
  saltHex: string,
  hashHex: string,
): boolean {
  const { hash } = hashPassphrase(passphrase, saltHex);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(hashHex, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function hashAnswer(answer: string): string {
  return createHash("sha256")
    .update(answer.trim().toUpperCase(), "utf8")
    .digest("hex");
}
