Update apps/scheduler/package.json "scripts" and "devDependencies":

  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsup",
    "check-types": "tsc --noEmit",
    "start": "node dist/index.js"
  },
  "devDependencies": {
    "tsup": "^8.3.5",
    "tsx": "^4.21.0",
    "typescript": "^5.9.2"
  }

Run: pnpm --filter scheduler add -D tsup typescript
(note: scheduler currently has no "typescript" devDependency at all —
it's only working today because it inherits the hoisted root version;
add it explicitly so `tsc --noEmit` / `tsup` resolve predictably.)
