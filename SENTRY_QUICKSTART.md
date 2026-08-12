# Sentry Error Tracking - Quick Start Guide

## 5-Minute Setup

### Step 1: Get Your Sentry DSN

1. Go to [Sentry.io](https://sentry.io)
2. Create a new project or use existing one
3. Copy your DSN (looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`)

### Step 2: Add to .env

```bash
# In your root .env file
SENTRY_DSN=https://your-key@your-sentry-instance.ingest.sentry.io/project-id
```

### Step 3: Done! 🎉

Everything is already integrated. Start your services:

```bash
# API
npm run -w @applyai/api dev

# Worker
npm run -w worker dev

# Scheduler
npm run -w scheduler dev

# Web
npm run -w @applyai/web dev
```

## Verify It's Working

### Check API Logs

```bash
# Should see: ✅ Sentry initialized for API (development)
```

### Send a Test Error

```bash
import { captureException } from "@applyai/error-tracking";

captureException(new Error("Test error from ApplyAI"));
```

Visit your Sentry dashboard - you should see the error!

## Common Tasks

### Set User Context (Web)

```typescript
import { useSentryUser } from "@/lib/useSentry";

function MyComponent() {
  const { user } = useAuth();
  useSentryUser(user);
  // ...
}
```

### Track API Request (API)

```typescript
import { trackApiRequest } from "@applyai/error-tracking";

trackApiRequest({
  method: "POST",
  path: "/api/users",
  statusCode: 201,
  duration: 145,
  userId: "user123",
});
```

### Track Background Job (Worker)

```typescript
// Already done automatically via sentryWorkerFactory!
// No code needed - jobs are tracked automatically
```

### Track Cron Job (Scheduler)

```typescript
// Already done automatically via sentryScheduler!
// No code needed - cron jobs are tracked automatically
```

### Add Error Boundary (Web)

```typescript
import { ErrorBoundaryWrapper } from "@/components/ErrorBoundaryWrapper";

<ErrorBoundaryWrapper componentName="Dashboard">
  <Dashboard />
</ErrorBoundaryWrapper>
```

## Sampling Rates (Production)

Default settings in production:

```
- Traces: 10% (1 in 10 requests traced)
- Profiles: 10% (1 in 10 transactions profiled)
- Session Replays: 10% normal, 100% on errors
```

To adjust, edit each service's initialization.

## Disable in Development

Sentry automatically disables if `SENTRY_DSN` is not set:

```bash
# Just don't set SENTRY_DSN in your .env
# Services will log: ⚠️  Sentry DSN not configured
```

## Switch to Different Provider

### To Datadog:

1. Install Datadog SDK
2. Update service initialization:

```typescript
import { DatadogStrategy } from "@applyai/error-tracking";

const manager = ErrorTrackingManager.getInstance(new DatadogStrategy());
await manager.initialize(config);
```

That's it! No other code changes needed.

### To Custom Provider:

Implement `IErrorTrackingProvider` interface - see `/packages/error-tracking/README.md` for details.

## Troubleshooting

### Not seeing errors?

```bash
# 1. Check DSN is set
echo $SENTRY_DSN

# 2. Check service initialized correctly
# Look for: ✅ Sentry initialized

# 3. Try manual test
node -e "const { captureException } = require('@applyai/error-tracking'); captureException(new Error('test'))"

# 4. Check Sentry dashboard for event volume
```

### Too many errors?

Reduce sampling in production:

```typescript
initSentryNode({
  tracesSampleRate: 0.01,  // 1% instead of 10%
})
```

## Key Features Already Working

✅ **API**: Request tracking, error capture, middleware  
✅ **Worker**: Job tracking, retry detection, performance  
✅ **Scheduler**: Cron monitoring, execution tracking  
✅ **Web**: Error boundaries, route tracking, session replay  
✅ **Desktop**: App errors, flow tracking  
✅ **Extension**: Local error storage  

## Next Steps

1. ✅ Set your `SENTRY_DSN` in `.env`
2. ✅ Restart all services
3. ✅ View your first errors in Sentry dashboard
4. 📚 Read [SENTRY_IMPLEMENTATION.md](./SENTRY_IMPLEMENTATION.md) for advanced usage
5. 🔄 Consider implementing custom monitoring for your use case

## Support

- Errors not showing? Check `/packages/error-tracking/README.md`
- Want to switch providers? See Strategy pattern in `/packages/error-tracking/ARCHITECTURE.md`
- Need more control? Implement custom provider following template in `/packages/error-tracking/src/strategies/DatadogStrategy.ts`

## Architecture Highlight

The beauty of this implementation:

```
Your Code → ErrorTrackingManager → Strategy (Sentry/Datadog/Custom)

If you ever need to switch from Sentry to Datadog?
Just one line changes. No code refactoring needed.
Everything else stays the same.
```

This is the **Strategy Pattern** in action! 🎯
