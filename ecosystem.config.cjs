const fs = require("fs");
const path = require("path");

/** Load KEY=VAL from a dotenv-style file into process.env (does not override). */
function loadEnvFile(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) return;
  for (const raw of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(".env.production");
loadEnvFile(".env");

const port = Number(process.env.PORT || 3460);

module.exports = {
  apps: [
    {
      name: "cleaf",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      // Port comes from .env.production (or PORT / default 3460) — do not hardcode machine ports here.
      args: `start -H 0.0.0.0 -p ${port}`,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: port,
        // NEXT_PUBLIC_SITE_URL must be set at `pnpm build` (see docs/DEPLOY.md).
        // Listing it only here does NOT rewrite already-built OG absolute URLs.
      },
    },
  ],
};
