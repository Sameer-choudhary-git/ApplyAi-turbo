import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  target: "node18",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: [
    /^@applyai\//,
    "ioredis",
    "bullmq",
    "pg",
    "dotenv",
    "@aws-sdk/client-s3",
    "@bull-board/api",
    "@bull-board/express",
    "express",
  ],
  external: ["playwright", "@prisma/client", "@prisma/adapter-pg"],
});
