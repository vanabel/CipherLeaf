# CipherLeaf

**Encrypted knowledge for deliberate readers.**

零明文托管 + 数学挑战访问 + 短期 Reader Capsule + 个体化水印。

> 不是试图阻止所有复制，而是确保原文不落服务器、随手访问变困难、泄露链接快速失效、阅读副本可区分。

短名：**CleAF** · 仓库 / 进程 / 公网建议：`cleaf` · `https://cleaf.vanabel.cn`

## 快速开始

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 页面

| 路径 | 作用 |
| --- | --- |
| `/` | 创作并本地加密 |
| `/g/:token#shareSecret` | Puzzle Gate |
| `/r/:token#shareSecret` | Reader Capsule |
| `/m/:secret#shareSecret` | Author Console（短路径） |
| `/vault` | 本机加密书签包 |

`#` 后是短分享密钥（包装内容密钥），不会上传服务器。`/data/*.sqlite` 仅存密文与元数据，**不要提交到 Git**。

## 安全档位

- **Standard** — Open puzzle + 临时 capsule
- **Private** — Invite + puzzle
- **Sensitive**（默认）— Invite + passphrase + puzzle + watermark

## 部署（NAS + PM2）

见 [docs/DEPLOY.md](docs/DEPLOY.md)。

```bash
pnpm build
pm2 start ecosystem.config.cjs   # process name: cleaf; PORT from .env.production (default 3460)
```

## 文档

- [威胁模型](docs/THREAT_MODEL.md)
- [能力协议](docs/PROTOCOL.md)
- [NAS 部署](docs/DEPLOY.md)

## 技术栈

Next.js · Web Crypto (AES-256-GCM) · SQLite · 自研 Puzzle DSL

宣传用语请用：**Designed to discourage casual redistribution.**  
不要宣传成 “Cannot be copied.”
