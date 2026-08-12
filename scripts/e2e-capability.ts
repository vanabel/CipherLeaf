import { webcrypto } from "crypto";
import { createDocument, startChallenge, solveChallenge, getCapsuleByToken, getDocumentById } from "../src/lib/capability/service";

function b64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

async function encrypt(plaintext: string) {
  const keyBytes = webcrypto.getRandomValues(new Uint8Array(32));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await webcrypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const cipher = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    key: b64(keyBytes),
    ciphertext: b64(new Uint8Array(cipher)),
    iv: b64(iv),
  };
}

async function main() {
  const enc = await encrypt("# Hello\n\nSecret note about topology.");
  const created = createDocument({
    title: "E2E Note",
    ciphertext: enc.ciphertext,
    iv: enc.iv,
    securityPreset: "standard",
    gateMode: "open",
    difficulty: "thoughtful",
    ttlSeconds: 7200,
    watermark: true,
    copyFriction: true,
  });
  console.log("created gate", created.gateToken.slice(0, 8));

  // Access document via hash path used by service
  const { getDocumentByGateToken } = await import("../src/lib/capability/service");
  const doc = getDocumentByGateToken(created.gateToken);
  if (!doc) throw new Error("doc missing");
  const challenge = startChallenge(doc);

  // Recover answer by regenerating is impossible; peek DB
  const { getDb } = await import("../src/lib/db");
  const row = getDb()
    .prepare(`SELECT answer_hash, public_params, puzzle_type FROM challenges WHERE id = ?`)
    .get(challenge.challengeId) as { answer_hash: string; public_params: string; puzzle_type: string };

  // We need the real answer - store answers only as hash. For test, generate until we control:
  // Instead: wait and try common - better patch: read from a debug. Simpler approach:
  // Temporarily use generatePuzzle in a loop matching type - can't.
  // Fix test: export answer only in test by querying... we don't store plaintext answer.
  // Update startChallenge to return nothing; for e2e, add TEST_STORE or compute from public_params.

  const params = JSON.parse(row.public_params);
  const { hashAnswer } = await import("../src/lib/crypto/tokens");
  const { normalizeAnswer } = await import("../src/lib/puzzles/generator");

  function matches(candidate: string): boolean {
    return hashAnswer(normalizeAnswer(candidate)) === row.answer_hash;
  }

  const candidates: string[] = [];
  // Common numeric fields stored in publicParams
  for (const key of [
    "next", "r", "v", "d", "term", "ways", "p", "edges", "child", "chickens",
    "count", "need", "det", "x", "s", "c", "inscribed", "a", "b",
  ]) {
    if (params[key] !== undefined && params[key] !== null) {
      candidates.push(String(params[key]));
    }
  }
  candidates.push("YES", "NO", "是", "否");

  // Type-specific fallbacks
  if (row.puzzle_type === "insight.coins") {
    const { n, k, target } = params;
    candidates.push(
      k % 2 === 0 ? (target % 2 === 0 ? "YES" : "NO") : n >= k ? "YES" : "NO",
    );
  } else if (row.puzzle_type === "insight.chessboard") {
    candidates.push("NO");
  } else if (row.puzzle_type === "insight.handshake") {
    candidates.push(params.n % 2 === 1 ? "NO" : "YES");
  } else if (row.puzzle_type === "modular.crt") {
    const { mods, residues } = params;
    const M = mods.reduce((a: number, b: number) => a * b, 1);
    for (let x = 1; x <= M; x++) {
      if (mods.every((m: number, i: number) => x % m === residues[i])) {
        candidates.push(String(x));
        break;
      }
    }
  } else if (row.puzzle_type === "combinatorics.lattice") {
    const { w, h } = params;
    const binom = (n: number, k: number) => {
      let r = 1;
      for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
      return Math.round(r);
    };
    candidates.push(String(binom(w + h, w)));
  } else if (row.puzzle_type === "logic.constraints") {
    candidates.push(String(params.a));
  } else if (row.puzzle_type === "geometry.triangle") {
    candidates.push(String(params.c));
  } else if (row.puzzle_type === "number.gcd") {
    const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
    candidates.push(String(g(params.a, params.b)));
  } else if (row.puzzle_type === "number.lcm") {
    const g = (a: number, b: number): number => (b ? g(b, a % b) : a);
    candidates.push(String(Math.abs(params.a * params.b) / g(params.a, params.b)));
  }

  const answer = candidates.find(matches);
  if (!answer) throw new Error("unknown type / answer " + row.puzzle_type);

  await new Promise((r) => setTimeout(r, 2000));
  const solved = solveChallenge({
    gateToken: created.gateToken,
    challengeId: challenge.challengeId,
    answer,
  });
  if (!solved.ok) throw new Error(solved.error);
  console.log("capsule", solved.capsuleToken.slice(0, 8), solved.fingerprint);

  const cap = getCapsuleByToken(solved.capsuleToken);
  const d2 = getDocumentById(cap!.document_id);
  if (!d2?.ciphertext) throw new Error("missing ciphertext");
  console.log("e2e ok", { title: d2.title, ttl: solved.expiresAt - Date.now() });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
