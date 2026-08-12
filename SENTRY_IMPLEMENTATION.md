# Sentry Implementation - ApplyAI Turbo

## Overview

This document describes the professional, vendor-agnostic Sentry implementation across all ApplyAI services. The implementation uses the **Strategy Design Pattern** to allow easy switching between error tracking providers (Sentry, Datadog, Rollbar, etc.) without changing application code.

## Architecture

### Strategy Pattern Design

```
IErrorTrackingProvider (Interface)
    ├── SentryStrategy (Current)
    ├── DatadogStrategy (Template)
    ├── RollbarStrategy (Future)
    └── NullStrategy (Fallback)

ErrorTrackingManager (Singleton)
    └── Manages provider switching at runtime
    └── Delegates to current strategy

Global Functions
    └── captureException, captureMessage, trackJob, etc.
```

### Key Benefits

✅ **Vendor Agnostic** - Not locked into Sentry  
✅ **Runtime Switching** - Change providers without restarting  
✅ **Type Safe** - Full TypeScript support  
✅ **Testable** - Use NullStrategy in tests  
✅ **Easy Migration** - Swap providers with one line of code  

## Implementation Details

### 1. Error Tracking Package

**Location:** `packages/error-tracking/`

**Components:**
- `types.ts` - Core interfaces and types
- `ErrorTrackingManager.ts` - Singleton managing providers
- `strategies/SentryStrategy.ts` - Sentry implementation
- `strategies/DatadogStrategy.ts` - Datadog template
- `strategies/NullStrategy.ts` - No-op implementation
- `utils.ts` - Helper functions for common operations
- `README.md` - Comprehensive usage guide
- `ARCHITECTURE.md` - Detailed architecture diagrams

### 2. API Service

**Location:** `apps/api/`

**Files Updated:**
- `src/index.ts` - Sentry initialization with conditional enabling
- `src/app.ts` - Sentry middleware integration
- `src/middleware/sentry.ts` - NEW - Context capture middleware
- `src/middleware/error.ts` - Enhanced error handler with Sentry

**Features:**
- Request context tracking (method, path, headers)
- User context capture
- Error exception capture with metadata
- Breadcrumb logging for request flow
- Transaction tracking for operations

### 3. Worker Service

**Location:** `apps/worker/`

**Files Updated:**
- `src/index.ts` - Sentry initialization
- `src/app.ts` - Enhanced with Sentry setup
- `src/workers/*.worker.ts` - All workers use sentryWorkerFactory

**New Files:**
- `packages/queue/src/sentryWorkerFactory.ts` - Worker factory with Sentry

**Features:**
- Job execution tracking with transactions
- Attempt tracking and retry detection
- Job status monitoring (started, completed, failed, retried)
- Performance metrics per job
- Automatic error capture with context

### 4. Scheduler Service

**Location:** `apps/scheduler/`

**Files Updated:**
- `src/index.ts` - Sentry initialization
- `src/app.ts` - Enhanced logging
- `src/schedules/*.ts` - All use sentryScheduler

**New Files:**
- `src/lib/sentryScheduler.ts` - Cron job wrapper with Sentry

**Features:**
- Cron job execution tracking
- Cron pattern logging
- Execution time monitoring
- Error tracking per cron job
- Breadcrumb trail for debugging

### 5. Web Frontend

**Location:** `apps/web/`

**Files Updated:**
- `src/main.tsx` - Sentry initialization + ErrorBoundary wrapper
- `src/App.tsx` - Route tracking + error boundaries per route

**New Files:**
- `src/lib/useSentry.ts` - React hooks for Sentry integration
- `src/components/SentryRouteTracker.tsx` - Route change tracking
- `src/components/ErrorBoundaryWrapper.tsx` - Error boundary component

**Features:**
- Global error boundary at app root
- Per-route error boundaries
- Navigation tracking
- User context tracking
- Session replay (10% of sessions, 100% on errors)
- Performance monitoring
- React hooks for manual error capture
- Breadcrumb tracking for user interactions

### 6. Desktop Application

**Location:** `apps/applyAi-desktop/`

**Files Updated:**
- `main.js` - Full Sentry integration

**Features:**
- Desktop app error tracking
- Deep link handling monitoring
- Browser automation tracking
- Encryption operation monitoring
- Graceful shutdown with event flushing

### 7. Chrome Extension

**Location:** `apps/chrome-extension/`

**Files Updated:**
- `popup.js` - Error tracking integration

**New Files:**
- `error-tracking.js` - Lightweight error tracking utility

**Features:**
- Local error storage (up to 50 errors)
- Optional API sending when auth token available
- Breadcrumb logging
- Global error handlers
- Session storage for breadcrumbs

## Configuration

### Environment Variables

```bash
# Enable/disable error tracking
SENTRY_DSN=https://your-key@sentry.io/project-id

# Optional sampling rates
ERROR_TRACKING_TRACES_SAMPLE_RATE=0.1        # 10% in production
ERROR_TRACKING_PROFILES_SAMPLE_RATE=0.1      # 10% in production

# For Web (React)
VITE_SENTRY_DSN=https://your-key@sentry.io/project-id
```

### Initialization Examples

**API Service:**
```typescript
import { initSentryNode, getSentryDSN, getEnvironment } from "@applyai/sentry";

initSentryNode({
  dsn: getSentryDSN(),
  environment: getEnvironment(),
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
```

**Web Frontend:**
```typescript
import { initSentryBrowser, ErrorBoundary } from "@applyai/sentry";

initSentryBrowser({
  dsn: getSentryDSN(),
  environment: getEnvironment(),
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Wrap app with error boundary
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

## Usage Patterns

### Capture Exception

```typescript
import { captureException } from "@applyai/error-tracking";

try {
  await someOperation();
} catch (error) {
  captureException(error, {
    userId: "user123",
    requestId: "req456",
    operation: "payment_processing",
  });
}
```

### Track Operations

```typescript
import { 
  trackApiRequest, 
  trackJob, 
  trackCronJob,
  trackDatabase 
} from "@applyai/error-tracking";

// API requests
trackApiRequest({
  method: "POST",
  path: "/api/users",
  statusCode: 201,
  duration: 145,
  userId: "user123",
});

// Background jobs
trackJob({
  jobId: "job123",
  jobName: "EmailNotification",
  status: "completed",
  duration: 2345,
});

// Cron jobs
trackCronJob({
  jobName: "DailyReport",
  schedule: "0 2 * * *",
  status: "completed",
  duration: 15000,
});

// Database operations
trackDatabase({
  operation: "INSERT",
  table: "users",
  duration: 45,
  rowsAffected: 1,
});
```

### React Hooks

```typescript
import { 
  useSentryUser, 
  useSentryRouteTracking,
  useSentryBreadcrumb,
  useSentryInteraction 
} from "@applyai/web/lib/useSentry";

// Set user context
const { user } = useAuth();
useSentryUser(user);

// Track route changes
useSentryRouteTracking(location.pathname, "Dashboard");

// Add breadcrumb
const addBreadcrumb = useSentryBreadcrumb();
addBreadcrumb("User clicked checkout button", { cart_total: 99.99 });

// Track user interactions
const trackClick = useSentryInteraction("checkout_button_click");
onClick={() => trackClick({ cart_total: 99.99 })}
```

## Switching Providers

### Method 1: At Initialization

```typescript
import { ErrorTrackingManager, DatadogStrategy } from "@applyai/error-tracking";

const manager = ErrorTrackingManager.getInstance(new DatadogStrategy());
await manager.initialize(config);
```

### Method 2: Runtime Switching

```typescript
const manager = ErrorTrackingManager.getInstance();
await manager.switchProvider(new DatadogStrategy(), config);
```

## Testing

Use NullStrategy in tests:

```typescript
import { ErrorTrackingManager, NullStrategy } from "@applyai/error-tracking";

// In test setup
const tracker = ErrorTrackingManager.getInstance(new NullStrategy());
await tracker.initialize({ enabled: false, dsn: "", environment: "test" });
```

## Services Status

| Service | Status | Features |
|---------|--------|----------|
| API | ✅ Done | Request context, error capture, breadcrumbs |
| Worker | ✅ Done | Job tracking, retry detection, transactions |
| Scheduler | ✅ Done | Cron monitoring, execution tracking |
| Web | ✅ Done | Error boundaries, route tracking, session replay |
| Desktop | ✅ Done | App errors, flow tracking |
| Chrome Extension | ✅ Done | Local error storage, breadcrumbs |

## Data Redaction

Sensitive data is automatically redacted:

- Authorization headers → `[REDACTED]`
- Cookie headers → `[REDACTED]`
- API keys → `[REDACTED]`
- Passwords in query params → `[REDACTED]`
- Access tokens → `[REDACTED]`

## Performance Impact

- **Development**: Minimal (100% tracing)
- **Production**: Very low (10% tracing, 10% replays)
- **Disabled**: Zero impact (NullStrategy)

## Future Enhancements

1. **Datadog Integration** - Implement full DatadogStrategy
2. **Rollbar Integration** - Implement RollbarStrategy
3. **Custom Providers** - Users can implement their own
4. **Metrics** - Add Prometheus metrics collection
5. **Log Aggregation** - Integrate with ELK stack
6. **Alert Rules** - Create Sentry alert rules

## Troubleshooting

### Errors Not Appearing in Sentry

1. Check `SENTRY_DSN` is set correctly
2. Verify `NODE_ENV` is not set to "development" (can be disabled)
3. Check Sentry organization settings for event filtering
4. Verify network connectivity to Sentry

### High Event Volume

1. Reduce `tracesSampleRate` (e.g., 0.1 for 10%)
2. Add event filtering in beforeSend
3. Implement session sampling in browser

### Performance Issues

1. Use NullStrategy in development
2. Reduce profiling sample rate in production
3. Disable session replay in low-bandwidth environments

## Additional Resources

- [Strategy Pattern](/packages/error-tracking/ARCHITECTURE.md)
- [Usage Guide](/packages/error-tracking/README.md)
- [Sentry Documentation](https://docs.sentry.io/)

## Summary

The implementation provides a professional, production-ready error tracking solution with:

- ✅ Vendor-agnostic architecture using Strategy pattern
- ✅ Comprehensive coverage across all services
- ✅ Easy provider switching without code changes
- ✅ Type-safe TypeScript integration
- ✅ Automatic sensitive data redaction
- ✅ Performance monitoring and tracing
- ✅ Session replay (web)
- ✅ Breadcrumb tracking throughout the application
- ✅ Graceful degradation when disabled
- ✅ Well-documented and tested

The system is production-ready and can be deployed immediately with the provided Sentry DSN.
