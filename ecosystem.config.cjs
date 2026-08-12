module.exports = {
  apps: [
    {
      name: "cleaf",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3460",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3460,
        // NEXT_PUBLIC_SITE_URL must be set at `pnpm build` (see docs/DEPLOY.md).
        // Listing it only here does NOT rewrite already-built OG absolute URLs.
      },
    },
  ],
};
