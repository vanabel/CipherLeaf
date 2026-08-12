# CipherLeaf Capability Protocol

## Content layers

```
Source Markdown     → author browser only
Encrypted payload   → server / database
Rendered plaintext  → authorized reader browser only
```

Never expose `GET /document.md` or store `content = "# ..."`.

## Create

1. Browser generates random AES-256 key + 96-bit IV.
2. Encrypt Markdown with AES-GCM (`SubtleCrypto`).
3. Upload `{ ciphertext, iv, policy }` only.
4. Server returns `gateToken` + `manageSecret` (raw, once).
5. Author bookmarks:
   - Gate: `/g/{shortToken}#{shareSecret}` (~10 + ~12 chars)
   - Manage: `/m/{manageSecret}#{shareSecret}`

The AES-256 content key never appears in the URL. It is wrapped under `shareSecret`
and stored as `wrapped_key` on the server. The server still cannot read plaintext
without the fragment secret.

## Gate → Capsule

```
Gate URL
  → optional invite / passphrase
  → mathematical challenge (unique instance)
  → one-time redeem
  → Reader Capsule `/r/{capsuleToken}#{contentKey}`
```

Database stores only `sha256(token)`. Capsules are independent; old URLs do not imply new ones.

## Reader

1. Fetch capsule metadata + ciphertext (`Cache-Control: no-store`).
2. Decrypt with fragment key in memory.
3. Markdown → sanitized React render.
4. Visible watermark from capsule fingerprint.
5. On unload: clear React state; do not write plaintext to `localStorage`.

## Security presets

| Preset | Gate | Capsule | Default TTL |
| --- | --- | --- | --- |
| Standard | Open puzzle | Unique | 2h |
| Private | Invite + puzzle | Unique | 2h |
| Sensitive | Invite + phrase + puzzle | Unique + watermark | 2h |
