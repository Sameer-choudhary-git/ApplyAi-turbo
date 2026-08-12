# Quick Reference Card - Installation & Setup

## 🚀 TL;DR (Too Long; Didn't Read)

```bash
# 1. Install everything (from root directory)
pnpm install

# 2. Add Sentry DSN to .env
SENTRY_DSN=https://your-key@sentry.io/project-id

# 3. Start services
pnpm -w @applyai/api dev          # Terminal 1
pnpm -w worker dev                 # Terminal 2  
pnpm -w scheduler dev              # Terminal 3
pnpm -w @applyai/web dev          # Terminal 4

# Done! ✨
```

## 📋 Installation Commands

| Command | Purpose | Location |
|---------|---------|----------|
| `pnpm install` | Install all dependencies | Root directory |
| `pnpm -w @applyai/sentry build` | Build Sentry package | Root directory |
| `pnpm -w @applyai/error-tracking build` | Build Error Tracking package | Root directory |
| `pnpm -w @applyai/api dev` | Start API service | Root directory |
| `pnpm -w worker dev` | Start Worker service | Root directory |
| `pnpm -w scheduler dev` | Start Scheduler service | Root directory |
| `pnpm -w @applyai/web dev` | Start Web service | Root directory |

## 📦 What to Install & Where

### Answer: Just run ONE command!

```bash
pnpm install
```

**Location:** Root directory (`d:\Shinchan\Coding\ApplyAi-turbo`)

**What it installs:**
- ✅ `@sentry/node` - Backend error tracking
- ✅ `@sentry/react` - React error tracking
- ✅ `@sentry/profiling-node` - Performance profiling
- ✅ `@applyai/error-tracking` - Abstraction layer (NEW)
- ✅ All workspace dependencies

**Reason:** Everything is already configured in package.json files. Just install once!

## 🔧 Environment Variables

### Add to .env (root directory)

```bash
# REQUIRED: Sentry DSN
SENTRY_DSN=https://your-sentry-key@your-instance.ingest.sentry.io/your-project-id

# OPTIONAL: Error tracking settings
ERROR_TRACKING_ENABLED=true
ERROR_TRACKING_TRACES_SAMPLE_RATE=1.0
ERROR_TRACKING_PROFILES_SAMPLE_RATE=1.0
```

## ✅ Verification Commands

```bash
# Check if Sentry is installed
pnpm ls @sentry/node

# Check if error-tracking package exists
pnpm ls @applyai/error-tracking

# Build all packages
pnpm -r build

# Type check all packages
pnpm -r check-types
```

## 🧬 Dependency Structure

```
Your App
   ↓
@applyai/sentry (wrapper)
   ↓
@sentry/node, @sentry/react (actual SDKs)
```

All already configured. No manual installation needed!

## 🚀 Start Services Order

```
1. pnpm -w @applyai/api dev        # API (port 3000)
2. pnpm -w worker dev              # Worker (background)
3. pnpm -w scheduler dev           # Scheduler (background)
4. pnpm -w @applyai/web dev        # Web (port 5173)
```

Each in its own terminal.

## 📍 File Locations

| Item | Location |
|------|----------|
| **Root** | `d:\Shinchan\Coding\ApplyAi-turbo` |
| **API** | `apps/api/` |
| **Web** | `apps/web/` |
| **Worker** | `apps/worker/` |
| **Scheduler** | `apps/scheduler/` |
| **Sentry Package** | `packages/sentry/` |
| **Error Tracking** | `packages/error-tracking/` |
| **queue Package** | `packages/queue/` |
| **.env file** | `d:\Shinchan\Coding\ApplyAi-turbo\.env` |

## 🎯 Next After Installation

1. ✅ Run `pnpm install`
2. ✅ Add SENTRY_DSN to `.env`
3. ✅ Start services with `pnpm -w <service> dev`
4. ✅ Look for "✅ Sentry initialized" in logs
5. ✅ Visit Sentry dashboard to see errors

## ❓ Common Questions

**Q: Do I need to run pnpm add?**
A: No! Everything is already configured. Just `pnpm install`

**Q: Where do I install?**
A: Root directory only. `d:\Shinchan\Coding\ApplyAi-turbo`

**Q: Do all services need installation?**
A: No. One `pnpm install` at root installs for all services

**Q: What if I get an error?**
A: See INSTALLATION_GUIDE.md for troubleshooting

## 🔄 Reinstall/Clean

```bash
# If something goes wrong
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 📊 Package Dependency Tree

```
@applyai/error-tracking (NEW - abstraction layer)
  ├─ No external dependencies ✅

@applyai/sentry (wrapper)
  ├─ @sentry/node ^8.60.0
  ├─ @sentry/react ^8.60.0
  └─ @sentry/profiling-node ^8.60.0

@applyai/api
  └─ @applyai/sentry (workspace:*)

@applyai/worker
  ├─ @applyai/sentry (workspace:*)
  └─ @applyai/queue (workspace:*)

@applyai/scheduler
  └─ @applyai/sentry (workspace:*)

@applyai/web
  └─ @applyai/sentry (workspace:*)
```

## ⏱️ Expected Time

| Task | Time |
|------|------|
| `pnpm install` | 2-5 minutes |
| Add SENTRY_DSN to .env | 1 minute |
| Start all services | 2 minutes |
| **Total Setup Time** | **5-8 minutes** |

## 🎓 Learn More

- **Installation Details** → `INSTALLATION_GUIDE.md`
- **Quick Start** → `SENTRY_QUICKSTART.md`
- **Full Guide** → `SENTRY_IMPLEMENTATION.md`
- **Navigation Hub** → `README_SENTRY.md`

---

**Ready?** Run: `pnpm install`

Then see: `SENTRY_QUICKSTART.md`
