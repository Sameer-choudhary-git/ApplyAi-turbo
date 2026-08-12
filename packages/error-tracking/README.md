# Error Tracking Abstraction Layer

This package provides a vendor-agnostic error tracking abstraction using the **Strategy pattern**. You can easily switch between different error tracking providers (Sentry, Datadog, Rollbar, etc.) without changing your application code.

## Architecture

The abstraction layer consists of:

1. **IErrorTrackingProvider Interface** - Defines the contract for all error tracking providers
2. **Concrete Strategies** - Implementations for specific providers (Sentry, Datadog, Rollbar, etc.)
3. **ErrorTrackingManager** - Singleton that manages the current strategy
4. **Utility Functions** - High-level functions for common tracking scenarios

## Supported Providers

- **Sentry** (default) - ✅ Fully implemented
- **Datadog** - Template provided, ready to implement
- **Rollbar** - Can be implemented following the Datadog pattern
- **Custom** - Implement IErrorTrackingProvider for any provider

## Usage

### Initialize with Sentry (Default)

```typescript
import { initializeErrorTracking } from "@applyai/error-tracking";

// In your app's main entry point
await initializeErrorTracking({
  enabled: process.env.NODE_ENV === "production",
  dsn: process.env.ERROR_TRACKING_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});
```

### Switch Provider at Runtime

```typescript
import { 
  ErrorTrackingManager, 
  DatadogStrategy,
  SentryStrategy 
} from "@applyai/error-tracking";

// Switch from Sentry to Datadog
const manager = ErrorTrackingManager.getInstance();
await manager.switchProvider(new DatadogStrategy());

// Or use a different provider from the start
const manager = ErrorTrackingManager.getInstance(new DatadogStrategy());
```

### Capture Errors

```typescript
import { captureException, captureMessage } from "@applyai/error-tracking";

// Capture an exception with context
try {
  // some operation
} catch (error) {
  captureException(error, {
    userId: "user123",
    requestId: "req456",
    context: "payment_processing",
  });
}

// Capture a message
captureMessage("User signed up", "info", {
  userId: "user123",
});
```

### Track Operations

```typescript
import { 
  trackApiRequest, 
  trackDatabase, 
  trackJob,
  trackCronJob,
  trackTransaction 
} from "@applyai/error-tracking";

// Track API requests
trackApiRequest({
  method: "POST",
  path: "/api/users",
  statusCode: 201,
  duration: 145,
  userId: "user123",
  requestId: "req456",
});

// Track database operations
trackDatabase({
  operation: "INSERT",
  table: "users",
  duration: 45,
  rowsAffected: 1,
});

// Track background jobs
trackJob({
  jobId: "job123",
  jobName: "EmailNotification",
  status: "completed",
  duration: 2345,
});

// Track cron jobs
trackCronJob({
  jobName: "DailyReport",
  schedule: "0 2 * * *",
  status: "completed",
  duration: 15000,
});

// Track custom transactions
await trackTransaction("PaymentProcessing", async (transaction) => {
  // Your code here
  // transaction automatically tracks success/error and timing
});
```

### Set User Context

```typescript
import { setUserContext, setErrorTags } from "@applyai/error-tracking";

// Set user information
setUserContext({
  id: "user123",
  email: "user@example.com",
  username: "john_doe",
});

// Set custom tags for error grouping
setErrorTags({
  feature: "payments",
  environment: "production",
});

// Clear user context (e.g., on logout)
setUserContext(null);
```

### Add Breadcrumbs

```typescript
import { addErrorBreadcrumb } from "@applyai/error-tracking";

// Add a breadcrumb for context
addErrorBreadcrumb({
  message: "User clicked checkout button",
  category: "user-action",
  level: "info",
  data: {
    cart_total: 99.99,
    items_count: 3,
  },
});
```

## Creating a Custom Strategy

To implement support for a new provider:

```typescript
import { IErrorTrackingProvider, ErrorTrackingConfig, ErrorContext, Breadcrumb, Transaction, SeverityLevel } from "@applyai/error-tracking";

export class CustomProviderStrategy implements IErrorTrackingProvider {
  private enabled = false;

  async initialize(config: ErrorTrackingConfig): Promise<void> {
    // Initialize your provider here
    this.enabled = config.enabled;
  }

  captureException(error: Error | unknown, context?: ErrorContext): string | void {
    if (!this.enabled) return;
    // Send to your provider
  }

  captureMessage(message: string, level?: SeverityLevel, context?: ErrorContext): string | void {
    if (!this.enabled) return;
    // Send to your provider
  }

  setUser(user: { id?: string; email?: string; [key: string]: any } | null): void {
    if (!this.enabled) return;
    // Set user context in your provider
  }

  setTags(tags: Record<string, string>): void {
    if (!this.enabled) return;
    // Set tags in your provider
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    if (!this.enabled) return;
    // Add breadcrumb in your provider
  }

  startTransaction(transaction: Transaction): { setStatus(status: "ok" | "error"): void; finish(): void } {
    if (!this.enabled) {
      return { setStatus: () => {}, finish: () => {} };
    }
    // Create and return transaction handler
  }

  async withScope<T>(fn: (scope: any) => T | Promise<T>): Promise<T> {
    if (!this.enabled) return fn({});
    // Execute with provider-specific scope
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async close(timeout?: number): Promise<void> {
    // Cleanup and flush pending events
  }
}

// Use it
import { ErrorTrackingManager } from "@applyai/error-tracking";

const manager = ErrorTrackingManager.getInstance(new CustomProviderStrategy());
await manager.initialize(config);
```

## Migration Example

### Before (Tightly Coupled to Sentry)
```typescript
import * as Sentry from "@sentry/node";

Sentry.init({ ... });
Sentry.captureException(error);
Sentry.setUser(user);
```

### After (Provider Agnostic)
```typescript
import { initializeErrorTracking, captureException, setUserContext } from "@applyai/error-tracking";

await initializeErrorTracking({ ... });
captureException(error);
setUserContext(user);

// To switch to Datadog later, just change one line:
// const manager = ErrorTrackingManager.getInstance(new DatadogStrategy());
```

## Benefits

✅ **Provider Agnostic** - Not locked into Sentry  
✅ **Easy Migration** - Switch providers with minimal code changes  
✅ **Type Safe** - Full TypeScript support  
✅ **Extensible** - Add custom providers easily  
✅ **Testable** - Use NullStrategy in tests  
✅ **Zero Runtime Cost** - No-op implementation when disabled  
✅ **Consistent API** - Same interface across all providers  

## Environment Variables

```env
# Enable/disable error tracking
ERROR_TRACKING_ENABLED=true

# Provider DSN/Token
ERROR_TRACKING_DSN=https://key@sentry.io/project

# Sampling rates
ERROR_TRACKING_TRACES_SAMPLE_RATE=0.1
ERROR_TRACKING_PROFILES_SAMPLE_RATE=0.1
ERROR_TRACKING_REPLAYS_SESSION_SAMPLE_RATE=0.1
ERROR_TRACKING_REPLAYS_ERROR_SAMPLE_RATE=1.0
```

## Testing

```typescript
import { ErrorTrackingManager, NullStrategy } from "@applyai/error-tracking";

// In your test setup
const nullTracker = ErrorTrackingManager.getInstance(new NullStrategy());
await nullTracker.initialize({ 
  enabled: false, 
  dsn: "", 
  environment: "test" 
});
```
