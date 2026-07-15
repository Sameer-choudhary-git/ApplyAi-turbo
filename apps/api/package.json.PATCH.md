Update apps/api/package.json "scripts" and "devDependencies":

  "scripts": {
    "dev": "node scripts/start-redis.js",
    "build": "tsup",
    "check-types": "tsc --noEmit",
    "start": "node dist/index.js",
    "lint": "eslint src"
  },
  "devDependencies": {
    "@types/node": "^22.15.21",
    "tsup": "^8.3.5",
    "tsx": "^4.19.4",
    "typescript": "^5.8.3"
  }

Run: pnpm --filter @applyai/api add -D tsup
