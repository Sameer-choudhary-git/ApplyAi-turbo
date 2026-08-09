# ApplyAI — Deployment Documentation

Is document me poora deployment setup explain kiya gaya hai — scheduler aur worker services ke liye Docker-based deployment, jo alag-alag VMs pe chalte hain.

## Architecture Overview

| Service | Platform | Purpose | Port |
|---|---|---|---|
| **Frontend** | Vercel | Next.js web app | - |
| **API** | Render | Hono backend | - |
| **Scheduler** | Azure VM | Cron jobs, queue me jobs push karta hai | None (no server) |
| **Worker** | AWS EC2 (naya) | Playwright se actual browser automation, queue se jobs consume karta hai | None (no server) |
| **Redis** | AWS EC2 (t3.micro) | Queue (BullMQ) aur Cache | 6379 (queue), 6380 (cache) |
| **Database** | Supabase | PostgreSQL | - |

---

## Naming Convention

Chunki dono services (scheduler, worker) same monorepo se deploy hoti hain lekin alag machines pe, humne **service-specific file names** use kiye hain taaki dono files repo me saath reh sakein bina conflict ke:

Dockerfile.scheduler
Dockerfile.worker
docker-compose.scheduler.yml
docker-compose.worker.yml


Har VM pe sirf apni relevant file `-f` flag se specify karke use hoti hai.

---

## Core Concepts

### Docker kya karta hai
Docker ek isolated "container" banata hai jisme code + Node.js + dependencies pehle se packaged hote hain. Host machine pe sirf Docker install karna padta hai; container ke andar ka environment consistent rehta hai chahe kahin bhi deploy karo.

### tsup kya karta hai
TypeScript code ko production-ready JavaScript me compile/bundle karta hai. Important config options:
- `format: "cjs"` — CommonJS output (kuch dependencies jaise `ioredis` ESM format me nahi chalti, isliye CJS use kiya)
- `noExternal` — ye packages final bundle ke andar hi include ho jaate hain
- `external` — ye packages bundle nahi hote, runtime pe `node_modules` se resolve hote hain (jaise `playwright`, `@prisma/client` — ye bade/generated packages hain, bundle karna problematic hai)

### Prisma generate
Prisma ek ORM hai jo `schema.prisma` file se TypeScript types **generate** karta hai. Ye step build se pehle chalna zaroori hai, warna `@applyai/db` package compile hi nahi hoga. Isko sirf syntactically valid `DATABASE_URL` chahiye (dummy value chalti hai build-time pe).

---

## File-by-File Explanation

### `Dockerfile.scheduler` / `Dockerfile.worker`
Instructions ki list jo image banati hai:
1. Node.js base image lo
2. Poora code copy karo
3. Dependencies install karo (`pnpm install`)
4. (Worker only) Playwright browser install karo
5. Prisma client generate karo
6. TypeScript build karo (sirf relevant app filter karke)
7. Final command define karo jo container start hone par chalega

### `docker-compose.scheduler.yml` / `docker-compose.worker.yml`
Container ko **run** karne ka config:
- `env_file` — konsi `.env` file se environment variables inject hongi
- `deploy.resources.limits.memory` — container ki max memory (VM ki RAM ke hisaab se set kiya)
- `restart: unless-stopped` — VM reboot hone par container automatically restart ho jayega, jab tak manually stop na kiya ho
- `logging` — log rotation config (disk full na ho isliye max size/files limit ki)

### `.env` (⚠️ kabhi git me commit nahi hoti)
Real secrets (DB connection string, Redis password). Har VM pe manually banani padti hai.

### `.dockerignore`
Konsi files Docker build context me copy NA ho (jaise `node_modules`, `.git`) — build fast aur chhota rehta hai.

**Important note:** `pnpm-lock.yaml` isme exclude NAHI honi chahiye, warna `pnpm install` fail hota hai lockfile na milne ki wajah se.

### `.npmrc`
Content: `shamefully-hoist=true` — pnpm ko dependencies ko zyada accessible tarike se install karne ko bolta hai (monorepo workspace setups me helpful hota hai).

---

## Commands Reference

### Scheduler (Azure VM)

```bash
# Build + start
docker compose -f docker-compose.scheduler.yml up -d --build

# Fresh rebuild (cache use nahi karega)
docker compose -f docker-compose.scheduler.yml build --no-cache
docker compose -f docker-compose.scheduler.yml up -d

# Logs (live)
docker compose -f docker-compose.scheduler.yml logs -f scheduler

# Logs (last N lines)
docker logs applyai-scheduler --tail 100

# Stop (bina delete kiye)
docker compose -f docker-compose.scheduler.yml stop scheduler

# Start (stopped container ko wapas chalu karna)
docker compose -f docker-compose.scheduler.yml start scheduler

# Restart
docker compose -f docker-compose.scheduler.yml restart scheduler

# Poora hata dena (image preserve rahegi)
docker compose -f docker-compose.scheduler.yml down

# Status check
docker ps
docker ps -a          # stopped containers bhi dikhega
docker stats --no-stream applyai-scheduler   # memory/CPU usage
```

### Worker (AWS EC2)

Same commands, bas file name badlega:
```bash
docker compose -f docker-compose.worker.yml up -d --build
docker compose -f docker-compose.worker.yml logs -f worker
docker compose -f docker-compose.worker.yml stop worker
docker compose -f docker-compose.worker.yml start worker
```

---

## Deployment Flow (Manual, CI/CD se pehle)

Jab bhi code change karna ho:

1. **Local pe code edit karo, test karo**
2. **Git commit + push:**
```bash
   git add .
   git commit -m "description"
   git push
```
3. **VM pe SSH karo:**
```bash
   ssh -i <key.pem> <user>@<vm-ip>
```
4. **Latest code pull karo:**
```bash
   cd ~/ApplyAi-turbo
   git pull
```
5. **Rebuild aur restart:**
```bash
   docker compose -f docker-compose.scheduler.yml up -d --build
   # ya worker VM pe:
   docker compose -f docker-compose.worker.yml up -d --build
```
6. **Logs check karo confirm karne ke liye sab sahi chal raha hai:**
```bash
   docker compose -f docker-compose.scheduler.yml logs -f scheduler
```

---

## Known Issues & Fixes (Historical Reference)

Ye saari dikkatein deployment ke dauraan aayi thi, future reference ke liye:

| Issue | Root Cause | Fix |
|---|---|---|
| `turbo prune` fail | Package naam `scheduler` tha, `@applyai/scheduler` nahi | Sahi package naam use karo turbo filter me |
| Lockfile mismatch | `pnpm-lock.yaml` outdated tha | `--no-frozen-lockfile` use kiya install ke time |
| Prisma `Cannot find module` | `prisma generate` nahi chala tha build se pehle | Dockerfile me explicit `prisma generate` step add kiya |
| `Cannot find module dist/index.js` | tsup ESM format me `.mjs` extension deta hai | CMD me `.mjs`/`.js` sahi extension use karo (format `cjs` use karne par `.js` hoga) |
| `Dynamic require of "events"` | ESM format me `ioredis` jaisi CJS-style packages nahi chalti | `format: "cjs"` use kiya tsup config me |
| `ERR_MODULE_NOT_FOUND: ioredis` (runtime) | `external` mark kiya tha but workspace setup me resolve nahi hua | `noExternal` me daal ke bundle kar diya |
| TypeScript error — `apps/worker/utils` import in package | Shared package (`apply`) app-specific file import kar raha tha (architecture violation) | Function ko `packages/core/apply/src/utils.ts` me move kiya |
| Redis jobs khaali dikh rahe the | `every5Minutes.ts` me `Promise.all([])` khaali tha (intentional, unused scheduler) | Confirm kiya ki hourly scheduler sahi kaam kar raha tha |

---

## Environment Variables Reference

### Scheduler needs:

DATABASE_URL=postgresql://...supabase...
REDIS_QUEUE_URL=redis://:<password>@<redis-ec2-ip>:6379


### Worker needs (confirm karke update karna):

DATABASE_URL=postgresql://...supabase...
REDIS_QUEUE_URL=redis://:<password>@<redis-ec2-ip>:6379

---

## Security Notes

1. `.env` files kabhi git me commit nahi karni — hamesha `.gitignore` me confirm rakhna
2. Redis Security Group `0.0.0.0/0` pe khula hai kyunki Render/Azure/EC2 workers ke static IPs nahi milte — isliye **strong password authentication mandatory** hai Redis pe
3. Redis Commander (monitoring UI, port 8081) kabhi public internet pe expose mat karna — sirf SSH tunnel ya restricted IP se access karo
4. SSH private keys (`.pem` files) kabhi git me commit mat karna, kabhi share mat karna

---

## Future: CI/CD

Abhi deployment manual hai (git pull + docker compose rebuild VM pe SSH karke). Future me GitHub Actions se automate karna hai taaki `git push` karte hi automatically VM pe deploy ho jaye. Iska setup alag se document kiya jayega jab implement hoga.
