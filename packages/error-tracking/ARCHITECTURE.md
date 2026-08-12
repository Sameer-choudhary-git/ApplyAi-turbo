# Error Tracking Architecture - Strategy Pattern

## Class Diagram

```
┌────────────────────────────────────────────────┐
│        IErrorTrackingProvider (Interface)       │
├────────────────────────────────────────────────┤
│ + initialize(config)                           │
│ + captureException(error, context)             │
│ + captureMessage(message, level, context)      │
│ + setUser(user)                                │
│ + setTags(tags)                                │
│ + addBreadcrumb(breadcrumb)                    │
│ + startTransaction(transaction)                │
│ + withScope(fn)                                │
│ + isEnabled()                                  │
│ + close(timeout)                               │
└────────────────────────────────────────────────┘
          ▲                       ▲
          │                       │
    ┌─────┴─────┐              ┌─┴──────────┐
    │            │              │            │
    │            │              │            │
┌───┴───┐  ┌────┴────┐  ┌─────┴───┐  ┌───┴─────┐
│Sentry │  │Datadog  │  │ Rollbar │  │  Null   │
│       │  │         │  │         │  │ Strategy│
│       │  │         │  │         │  │         │
│       │  │         │  │         │  │ (No-op) │
└───────┘  └─────────┘  └─────────┘  └─────────┘


┌────────────────────────────────────────────────┐
│    ErrorTrackingManager (Singleton)             │
├────────────────────────────────────────────────┤
│ - provider: IErrorTrackingProvider             │
│ - config: ErrorTrackingConfig                  │
├────────────────────────────────────────────────┤
│ + getInstance(provider?): ErrorTrackingManager │
│ + initialize(config)                           │
│ + switchProvider(newProvider, config?)         │
│ + captureException(error, context)             │
│ + captureMessage(message, level, context)      │
│ + setUser(user)                                │
│ + setTags(tags)                                │
│ + addBreadcrumb(breadcrumb)                    │
│ + startTransaction(transaction)                │
│ + withScope(fn)                                │
│ + isEnabled()                                  │
│ + close(timeout)                               │
└────────────────────────────────────────────────┘
           ▲
           │
           │ uses
           │
┌────────────────────────────────────────────────┐
│         Global Convenience Functions           │
├────────────────────────────────────────────────┤
│ + getErrorTracker()                            │
│ + captureException(error, context)             │
│ + captureMessage(message, level, context)      │
│ + setUserContext(user)                         │
│ + setErrorTags(tags)                           │
│ + addErrorBreadcrumb(breadcrumb)               │
│ + startErrorTransaction(transaction)           │
│ + withErrorScope(fn)                           │
│ + isErrorTrackingEnabled()                     │
│ + closeErrorTracking(timeout)                  │
└────────────────────────────────────────────────┘
```

## Flow Diagram

### Application Startup

```
┌─────────────────────────────────────────────┐
│  Application Start (main.ts/index.ts)       │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Load Configuration                         │
│  - ERROR_TRACKING_ENABLED                   │
│  - ERROR_TRACKING_DSN                       │
│  - ERROR_TRACKING_ENVIRONMENT               │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Choose Provider Strategy                   │
│  - if enabled → SentryStrategy              │
│  - if not enabled → NullStrategy            │
│  - custom → CustomStrategy                  │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  ErrorTrackingManager.getInstance(provider) │
│  Initialize with config                     │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Application Running                        │
│  Use global functions to track errors       │
│  - captureException()                       │
│  - captureMessage()                         │
│  - trackApiRequest()                        │
│  - trackJob()                               │
│  - etc.                                     │
└─────────────────────────────────────────────┘
```

### Error Handling Flow

```
┌──────────────────────┐
│  Error Occurs        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Application Code                    │
│  try { ... } catch (error) { ... }   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  captureException(error, context)    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  ErrorTrackingManager                │
│  .captureException()                 │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Provider Strategy                   │
│  (SentryStrategy, DatadogStrategy)   │
│  .captureException()                 │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Provider SDK                        │
│  Send Error to Backend               │
│  (Sentry, Datadog, Rollbar)          │
└──────────────────────────────────────┘
```

### Provider Switching

```
┌────────────────────────────────┐
│  Current: SentryStrategy       │
│  Active: ✅ Sending to Sentry  │
└────────────────────────────────┘
           │
           │ switchProvider(
           │   DatadogStrategy
           │ )
           │
           ▼
┌────────────────────────────────┐
│  1. Close old provider         │
│     - Flush pending events     │
│     - Cleanup resources        │
└────────────────────────────────┘
           │
           ▼
┌────────────────────────────────┐
│  2. Set new provider           │
│     - provider = DatadogStrategy
└────────────────────────────────┘
           │
           ▼
┌────────────────────────────────┐
│  3. Initialize new provider    │
│     - Call initialize(config)  │
│     - Validate configuration   │
└────────────────────────────────┘
           │
           ▼
┌────────────────────────────────┐
│  New: DatadogStrategy          │
│  Active: ✅ Sending to Datadog │
└────────────────────────────────┘
```

## Benefits of Strategy Pattern

### 1. **Loose Coupling**
- Application code doesn't know about specific providers
- Dependencies are injected at initialization

### 2. **Runtime Flexibility**
- Switch providers without restarting application
- Choose provider based on environment/configuration

### 3. **Testability**
- Use NullStrategy in tests
- Mock providers for unit testing

### 4. **Extensibility**
- Add new providers by implementing interface
- No changes to existing code

### 5. **Maintainability**
- Each provider is isolated
- Easy to update provider-specific logic

## Configuration Examples

### Development (No Error Tracking)

```typescript
await initializeErrorTracking({
  enabled: false,
  dsn: "",
  environment: "development",
});
```

### Production (Sentry)

```typescript
await initializeErrorTracking({
  enabled: true,
  dsn: process.env.SENTRY_DSN,
  environment: "production",
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});
```

### Production (Datadog)

```typescript
const manager = ErrorTrackingManager.getInstance(new DatadogStrategy());
await manager.initialize({
  enabled: true,
  dsn: process.env.DATADOG_APPLICATION_ID,
  environment: "production",
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
});
```

## Migration Path

### Phase 1: Abstraction Layer Setup ✅
- Create `@applyai/error-tracking` package
- Implement SentryStrategy
- Implement NullStrategy

### Phase 2: Update Applications
- Replace direct Sentry imports with error-tracking
- Use global convenience functions
- Test with both Sentry and Null strategies

### Phase 3: Add Alternative Providers
- Implement DatadogStrategy
- Implement RollbarStrategy
- Document migration steps

### Phase 4: Runtime Switching (Optional)
- Add admin panel for provider selection
- Document switching procedure
- Add monitoring for switches
