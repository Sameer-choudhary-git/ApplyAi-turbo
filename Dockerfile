FROM node:20-slim
RUN corepack enable
WORKDIR /app

# Dependencies cache ke liye pehle sirf package.json files copy karo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/scheduler/package.json apps/scheduler/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/queue/package.json packages/queue/package.json
COPY packages/jobs/package.json packages/jobs/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/core/apply/package.json packages/core/apply/package.json
COPY packages/core/extractor/package.json packages/core/extractor/package.json
COPY packages/config/package.json packages/config/package.json

RUN pnpm install --no-frozen-lockfile

# Ab poora code copy karo
COPY . .

# Dummy DATABASE_URL sirf prisma generate ke liye (real value nahi!)
ARG DATABASE_URL="postgresql://user:pass@localhost:5432/db"
ENV DATABASE_URL=$DATABASE_URL

RUN pnpm --filter @applyai/db exec prisma generate
RUN pnpm turbo build --filter=scheduler

ENV NODE_ENV=production
CMD ["node", "apps/scheduler/dist/index.js"]
