import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  // Bundle all @applyai/* workspace packages inline, since most of them
  // ship raw .ts source (main -> ./src/index.ts) rather than pre-built JS.
  // Without this, `node dist/index.js` would try to import .ts files
  // at runtime and crash.
  noExternal: [/^@applyai\//],
  // Keep heavy/native deps external — they must be real node_modules
  // installed in the deploy image, not bundled.
  external: ["playwright", "pg", "@prisma/adapter-pg"],
});
