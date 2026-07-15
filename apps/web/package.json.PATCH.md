Update apps/web/package.json "scripts.typecheck":

  "typecheck": "tsc --noEmit",

It currently reads `"tsc -p ./jsconfig.json"` — that file isn't your
tsconfig, so this is almost certainly a typo/leftover and is either
erroring or silently checking nothing right now. `tsc --noEmit` (no -p
flag) will pick up ./tsconfig.json automatically since it's a plain
`noEmit: true` config for Vite.
