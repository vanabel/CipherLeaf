# CipherLeaf Threat Model

## Goals

CipherLeaf does **not** claim to prevent all copying. Anyone who can read can screenshot, retype, or OCR.

We design for:

1. **Protect source** — server never holds plaintext Markdown.
2. **Raise entry cost** — casual visitors and bulk scrapers face a reader filter.
3. **Make leaks expensive** — short-lived, revocable, per-reader capsules with visible watermarks.

## Assets

| Asset | Location | Protection |
| --- | --- | --- |
| Source Markdown | Author browser only | Never uploaded |
| Content key | URL fragment `#key` | Never sent to server |
| Ciphertext | Server / DB | AES-256-GCM blob only |
| Rendered plaintext | Authorized reader browser memory | Destroyed on leave; `no-store` |
| Gate / capsule tokens | Server stores SHA-256 hashes | Raw tokens shown once |

## Adversaries

- **Curious link-finder** — has Gate URL, no phrase/invite. Blocked by puzzle (+ phrase/invite).
- **Casual redistributor** — solved gate once. Friction + watermark + TTL; not cryptographic prevention.
- **Honest-but-curious server** — sees ciphertext, metadata, hashes. Cannot read Markdown without fragment key.
- **Compromised reader device** — out of scope for v1; capsule still expires and can be revoked.

## Non-goals

- Stop screenshots / OCR / DevTools extraction.
- Hide that watermarks exist (disclosure is intentional).
- Perfect anonymity of authors or readers.

## Product claims (safe language)

Prefer: *Designed to discourage casual redistribution.*

Avoid: *Cannot be copied.*
