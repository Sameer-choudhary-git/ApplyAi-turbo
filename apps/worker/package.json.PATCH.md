Update apps/worker/package.json "scripts" and "devDependencies":

  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup",
    "check-types": "tsc --noEmit",
    "start": "node dist/index.js"
  },
  "devDependencies": {
    "tsup": "^8.3.5",
    "tsx": "^4.21.0",
    "typescript": "^5.9.2"
  }

Run: pnpm --filter worker add -D tsup typescript
(same note as scheduler — no explicit "typescript" devDependency today)
