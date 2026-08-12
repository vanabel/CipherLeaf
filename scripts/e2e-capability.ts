import {
  createDocument,
  getDocumentByGateToken,
  startChallenge,
  solveChallenge,
} from "../src/lib/capability/service";
import { hashAnswer } from "../src/lib/crypto/tokens";
import { getDb } from "../src/lib/db";
import { generatePuzzle, normalizeAnswer } from "../src/lib/puzzles/generator";

function recoverAnswer(
  answerHash: string,
  params: Record<string, unknown>,
): string | null {
  for (const key of Object.keys(params)) {
    const v = params[key];
    if (typeof v === "number" || typeof v === "string") {
      const cand = normalizeAnswer(String(v));
      if (hashAnswer(cand) === answerHash) return cand;
    }
  }
  for (let i = -20; i <= 800; i++) {
    const cand = normalizeAnswer(String(i));
    if (hashAnswer(cand) === answerHash) return cand;
  }
  for (const r of [
    "1/2",
    "1/3",
    "2/3",
    "1/6",
    "5/16",
    "5/18",
    "9/10",
    "4/7",
    "3/5",
    "-1",
    "1+2i",
  ]) {
    const cand = normalizeAnswer(r);
    if (hashAnswer(cand) === answerHash) return cand;
  }
  return null;
}

async function main() {
  for (const d of ["thoughtful", "mathematical", "deep"] as const) {
    for (let i = 0; i < 20; i++) {
      const p = generatePuzzle(d);
      if (/^(YES|NO|TRUE|FALSE)$/i.test(p.answer)) {
        throw new Error(`boolean answer forbidden: ${p.type}`);
      }
    }
    console.log("ok pool", d);
  }

  const created = createDocument({
    title: "e2e",
    ciphertext: "dGVzdA==",
    iv: "dGVzdA==",
    wrappedKey: "dGVzdA==",
    wrapIv: "dGVzdA==",
    securityPreset: "standard",
    gateMode: "open",
    difficulty: "thoughtful",
    ttlSeconds: 7200,
    watermark: true,
    copyFriction: true,
    initialInviteCount: 0,
  });

  const doc = getDocumentByGateToken(created.gateToken);
  if (!doc) throw new Error("no doc");

  for (let attempt = 0; attempt < 50; attempt++) {
    const challenge = startChallenge(doc);
    const row = getDb()
      .prepare(
        `SELECT answer_hash, public_params, puzzle_type FROM challenges WHERE id = ?`,
      )
      .get(challenge.challengeId) as {
      answer_hash: string;
      public_params: string;
      puzzle_type: string;
    };
    const params = JSON.parse(row.public_params) as Record<string, unknown>;
    const answer = recoverAnswer(row.answer_hash, params);
    if (!answer) continue;

    await new Promise((r) => setTimeout(r, 2000));
    const solved = solveChallenge({
      gateToken: created.gateToken,
      challengeId: challenge.challengeId,
      answer,
    });
    if (!solved.ok) throw new Error(solved.error);
    console.log("capsule", solved.capsuleToken.slice(0, 8), solved.fingerprint);
    console.log("e2e ok", row.puzzle_type, answer);
    return;
  }
  throw new Error("e2e could not recover any challenge answer");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
