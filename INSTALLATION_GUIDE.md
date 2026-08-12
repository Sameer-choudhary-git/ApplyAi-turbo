# Installation Guide - Sentry Implementation

## ✅ Good News: Most Dependencies Already Installed!

The Sentry implementation uses **workspace dependencies**, which means most packages are already configured. You just need to run one command to install everything.

## 🚀 Single Installation Command

From the **root directory** of your project:

```bash
pnpm install
```

That's it! This will:
- ✅ Install all Sentry dependencies
- ✅ Link all workspace packages
- ✅ Set up the new `@applyai/error-tracking` package
- ✅ Update all services

## 📦 What Gets Installed (Details)

### Core Sentry Packages (Already in package.json)

| Package | Version | Used By | Purpose |
|---------|---------|---------|---------|
| `@sentry/node` | ^8.60.0 | API, Worker, Scheduler | Backend error tracking |
| `@sentry/react` | ^8.60.0 | Web | React error tracking |
| `@sentry/profiling-node` | ^8.60.0 | API, Worker | Performance profiling |

**These are already configured in:**
- ✅ `packages/sentry/package.json`
- ✅ `packages/queue/package.json`
- ✅ `apps/api/package.json`
- ✅ `apps/worker/package.json`
- ✅ `apps/scheduler/package.json`
- ✅ `apps/web/package.json`

### New Package (Already Created)

| Package | Location | Purpose |
|---------|----------|---------|
| `@applyai/error-tracking` | `packages/error-tracking/` | Vendor-agnostic abstraction |

**Already includes in package.json:**
- ✅ `@types/node` - TypeScript types
- ✅ `typescript` - TypeScript support

## 🔄 Installation Steps

### Step 1: Navigate to Root Directory
```bash
cd d:\Shinchan\Coding\ApplyAi-turbo
```

### Step 2: Run Install
```bash
pnpm install
```

**Expected output:**
```
Progress: resolved 150, reused 145, downloaded 5, added 0
```

### Step 3: Verify Installation
```bash
# Check if Sentry packages are installed
pnpm ls @sentry/node
pnpm ls @sentry/react
```

**Should output:**
```
@applyai/api@1.0.0
└── @sentry/node@8.60.0

@applyai/web@0.0.0
└── @sentry/react@8.60.0
```

## 🧪 Testing Installation

### Test 1: Check Workspace Setup
```bash
pnpm list --depth=0
```

Should show all packages including `@applyai/error-tracking`

### Test 2: Build Packages
```bash
# Build Sentry package
pnpm -w @applyai/sentry build

# Build Error Tracking package
pnpm -w @applyai/error-tracking build
```

Expected: Both build successfully

### Test 3: Type Check
```bash
# Check API types
pnpm -w @applyai/api check-types

# Check Web types
pnpm -w @applyai/web typecheck
```

Expected: No TypeScript errors

## ✅ Verification Checklist

After running `pnpm install`:

- [ ] Command completed without errors
- [ ] `node_modules/@sentry/` directory exists
- [ ] `packages/error-tracking/` linked in workspace
- [ ] All services can start without import errors
- [ ] TypeScript compilation succeeds

## 🚀 Next Steps After Installation

1. **Add Sentry DSN to .env:**
   ```bash
   SENTRY_DSN=https://your-key@sentry.io/project-id
   ```

2. **Start Services:**
   ```bash
   # Terminal 1: API
   pnpm -w @applyai/api dev

   # Terminal 2: Worker
   pnpm -w worker dev

   # Terminal 3: Scheduler
   pnpm -w scheduler dev

   # Terminal 4: Web
   pnpm -w @applyai/web dev
   ```

3. **Verify Initialization:**
   Look for logs showing:
   ```
   ✅ Sentry initialized for API (development)
   ✅ Sentry initialized for Worker (development)
   ✅ Sentry initialized for Scheduler (development)
   ✅ Sentry initialized for Web (development)
   ```

## ❌ If Installation Fails

### Error: "Not a workspace root"
**Solution:** Make sure you're in the root directory
```bash
cd d:\Shinchan\Coding\ApplyAi-turbo
pnpm install
```

### Error: "Cannot find module @applyai/error-tracking"
**Solution:** The package is new. Run:
```bash
pnpm install
pnpm -w @applyai/error-tracking build
```

### Error: "Sentry dependency conflicts"
**Solution:** Clear cache and reinstall
```bash
rm -rf node_modules
pnpm install
```

### Error: "Port already in use"
**Solution:** Different services use different ports
```bash
pnpm -w @applyai/api dev      # Port 3000
pnpm -w @applyai/web dev      # Port 5173
pnpm -w worker dev             # Port 3001 (optional)
pnpm -w scheduler dev          # No port (background job)
```

## 📝 Dependency Summary

| Location | Package | Status |
|----------|---------|--------|
| `packages/sentry/` | @sentry/node, @sentry/react, @sentry/profiling-node | ✅ Configured |
| `packages/queue/` | @sentry/node | ✅ Configured |
| `packages/error-tracking/` | @types/node, typescript | ✅ Configured |
| `apps/api/` | @sentry/node (via @applyai/sentry) | ✅ Configured |
| `apps/worker/` | @sentry/node (via @applyai/sentry) | ✅ Configured |
| `apps/scheduler/` | @sentry/node (via @applyai/sentry) | ✅ Configured |
| `apps/web/` | @sentry/react (via @applyai/sentry) | ✅ Configured |

## 🎯 What pnpm install Does

When you run `pnpm install`:

1. **Resolves dependencies** from all package.json files
2. **Creates symlinks** for workspace packages
3. **Links @applyai/error-tracking** to services that need it
4. **Installs Sentry packages** in node_modules
5. **Creates pnpm-lock.yaml** with exact versions

## 🔍 File Structure After Installation

```
ApplyAi-turbo/
├── node_modules/
│   ├── @sentry/
│   │   ├── node/
│   │   ├── react/
│   │   └── profiling-node/
│   └── ... (other deps)
├── packages/
│   ├── sentry/
│   ├── queue/
│   ├── error-tracking/  ← NEW (symlinked)
│   └── ... (other packages)
├── apps/
│   ├── api/
│   ├── worker/
│   ├── scheduler/
│   ├── web/
│   └── ... (other apps)
└── pnpm-lock.yaml  ← Updated with new deps
```

## 💡 Pro Tips

### Tip 1: Install Specific Package
```bash
# If only one package needs updating
pnpm -w @applyai/api install
```

### Tip 2: Clean Install
```bash
# Nuclear option if something is weird
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Tip 3: Check Workspace
```bash
# See all workspace packages
pnpm ls -r --depth=0
```

### Tip 4: Rebuild Packages
```bash
# Rebuild all TypeScript packages
pnpm -r build
```

## ✅ READY TO GO!

Once `pnpm install` completes successfully:

1. ✅ All Sentry dependencies installed
2. ✅ Workspace packages linked
3. ✅ Ready to start services
4. ✅ Ready to add SENTRY_DSN to .env

**Next:** Follow `SENTRY_QUICKSTART.md` to complete setup!

---

## 🆘 Need Help?

- **Installation issues?** → See "If Installation Fails" section above
- **Which package?** → See "Dependency Summary" table
- **What gets installed?** → See "What Gets Installed" section
- **Full setup guide?** → See `SENTRY_QUICKSTART.md`
