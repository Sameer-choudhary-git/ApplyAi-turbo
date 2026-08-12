import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Bundle workspace packages because most of them ship raw TypeScript source.
  noExternal: [/^@applyai\//],
  // Keep heavy/native dependencies external so deployment resolves them from
  // node_modules instead of trying to embed native binaries into the bundle.
  external: [
    "playwright",
    "pg",
    "@prisma/adapter-pg",
    "@prisma/client",
    "pino",
    "pino-http",
    "pino-pretty",
    "bullmq",
    "ioredis",
    "@sentry/node",
    "@sentry/core",
    "@sentry/profiling-node",
  ],
});
