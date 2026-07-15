Update packages/contracts/package.json - "main" currently points at
"index.js" in the package root, but tsc now emits to ./dist. Change:

  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",

Also rename the package from generic "contracts" to "@applyai/contracts"
to match the naming convention every other internal package uses
(so "workspace:*" references stay consistent repo-wide).
