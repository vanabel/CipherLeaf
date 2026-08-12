# Deploy CleAF (CipherLeaf) on NAS with PM2

Product name stays **CipherLeaf**. Short handle:

| | |
| --- | --- |
| GitHub | `vanabel/cleaf` |
| PM2 process | `cleaf` |
| Suggested public URL | `https://cleaf.vanabel.cn` |
| Upstream port | `3460` |

## 1. First deploy on NAS

```bash
# example path — adjust to your Synology volume
cd /volume1/web
git clone git@github.com:vanabel/cleaf.git
cd cleaf

corepack enable
pnpm install
pnpm build

mkdir -p data   # SQLite lives here; never commit
pm2 start ecosystem.config.cjs
pm2 save
```

Reverse-proxy `cleaf.vanabel.cn` → `http://127.0.0.1:3460` (HTTPS at the proxy).

## 2. Update

```bash
cd /volume1/web/cleaf
git pull
pnpm install
pnpm build
pm2 restart cleaf
```

`pnpm install` on the NAS no longer needs a C++ toolchain — storage uses Node's built-in `node:sqlite` (Node 22+).

Do not copy `node_modules` from a Mac; install on the NAS so optional native deps (if any) match Linux.

## 3. Data

- Runtime DB: `data/cipherleaf.sqlite` (gitignored)
- Back up `data/` separately if you care about metadata (ciphertext blobs, invites, capsules)
- Content keys stay in URL fragments / author bookmarks — losing them means content is unreadable even with DB backup

## 4. Useful pm2 commands

```bash
pm2 status
pm2 logs cleaf
pm2 stop cleaf
pm2 delete cleaf
```
