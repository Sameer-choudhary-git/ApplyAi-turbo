Update packages/typescript-config/package.json "exports" field to this
(this is what lets `packages/ui/tsconfig.json` extend
"@repo/typescript-config/react-library.json" by package name):

{
  "name": "@repo/typescript-config",
  "version": "0.0.0",
  "private": true,
  "license": "MIT",
  "publishConfig": {
    "access": "public"
  },
  "exports": {
    "./base.json": "./base.json",
    "./react-library.json": "./react-library.json"
  }
}

Notes:
- Removed the "." -> "./tsconfig.json" export and the "build" script.
  This package only ships JSON config files — it has nothing to compile,
  so tsconfig.json and the "tsc -p tsconfig.json" build script were dead
  weight. DELETE packages/typescript-config/tsconfig.json entirely.
