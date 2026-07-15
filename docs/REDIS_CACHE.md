# Redis Cache Implementation

## Overview

Redis cache has been implemented to significantly improve API performance by caching frequently accessed data. This document outlines the cache configuration, usage patterns, and cache invalidation strategies.

## Architecture

### Redis Setup

- **Host**: Configured via `REDIS_HOST` environment variable (default: `localhost`)
- **Port**: Configured via `REDIS_PORT` environment variable (default: `6379`)
- **Status**: Already configured in `dockper-compose.yml` with health checks
- **UI**: Redis Commander available at `http://localhost:8081` for monitoring

### Cache Utility

Location: `apps/api/src/utils/cache.ts`

The cache utility provides a simple interface for all cache operations:

```typescript
// Get cached value
const data = await getCached<T>(key: string): Promise<T | null>

// Set cached value with TTL (Time-To-Live)
await setCached<T>(key: string, value: T, ttlSeconds: number = 300)

// Delete specific cache key
await deleteCached(key: string): Promise<void>

// Delete cache keys matching a pattern
await deleteCachedPattern(pattern: string): Promise<void>

// Clear all cache
await clearAllCache(): Promise<void>
```

## Cached Endpoints

### 1. Applications
- **GET `/api/applications`** - Cache Key: `applications:{userId}`
  - TTL: 5 minutes (300 seconds)
  - Invalidated on: PATCH `/api/applications/:id/interview-status`

### 2. Tasks
- **GET `/api/tasks`** - Cache Key: `tasks:{userId}`
  - TTL: 5 minutes
  - Invalidated on: POST, PATCH, DELETE operations
  
- **GET `/api/tasks/:id`** - Cache Key: `tasks:{userId}:{taskId}`
  - TTL: 5 minutes
  - Invalidated on: PATCH, DELETE operations or toggle

### 3. Interviews
- **GET `/api/interviews`** - Cache Key: `interviews:{userId}`
  - TTL: 5 minutes
  - Invalidated on: POST, PATCH, DELETE operations
  
- **GET `/api/interviews/:id`** - Cache Key: `interviews:{userId}:{interviewId}`
  - TTL: 5 minutes
  - Invalidated on: PATCH, DELETE operations

### 4. Schedule
- **GET `/api/schedule`** - Cache Key: `schedule:{userId}`
  - TTL: 5 minutes
  - Combines cached tasks and interviews data
  - Invalidated on: Any task or interview modifications

### 5. User Profile
- **GET `/api/users/me`** - Cache Key: `user:{userId}:profile`
  - TTL: 5 minutes
  - Invalidated on: POST `/api/users/onboard`

### 6. Reminders
- **GET `/api/reminders`** - Cache Key: `reminders:{userId}`
  - TTL: 5 minutes
  - Invalidated on: POST, PATCH, DELETE operations
  
- **GET `/api/reminders/:id`** - Cache Key: `reminders:{userId}:{reminderId}`
  - TTL: 5 minutes
  - Invalidated on: PATCH, DELETE operations

## Cache Invalidation Strategy

Cache invalidation follows these patterns:

### Specific Key Invalidation
```typescript
await deleteCached(`tasks:${userId}:${taskId}`);
```

### Pattern-Based Invalidation
```typescript
// Invalidates all tasks cache for a user
await deleteCachedPattern(`tasks:${userId}*`);

// Invalidates all applications cache for a user
await deleteCachedPattern(`applications:${userId}*`);
```

### Cascading Invalidation
When related data is modified, related caches are also invalidated:
- Creating/updating an interview invalidates both `interviews:*` and `applications:*` caches
- This ensures consistency across related endpoints

## Performance Improvements

### Expected Benefits

| Endpoint | Scenario | Improvement |
|----------|----------|-------------|
| GET /api/applications | Cached hit | ~80-90% faster |
| GET /api/tasks | Cached hit | ~80-90% faster |
| GET /api/interviews | Cached hit | ~80-90% faster |
| GET /api/schedule | Cached hit | ~70-80% faster (parallel queries) |
| GET /api/users/me | Cached hit | ~80-90% faster |
| GET /api/reminders | Cached hit | ~80-90% faster |

### Cache Hit Rate

With a 5-minute TTL and typical user behavior:
- **Read-heavy workflows**: 70-85% cache hit rate
- **Write-heavy workflows**: 30-50% cache hit rate (more invalidations)

## Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_HOST=redis          # Redis server hostname
REDIS_PORT=6379           # Redis server port
```

### Docker Compose

Redis is automatically started as part of the Docker Compose setup:

```bash
docker-compose up redis
```

## Monitoring

### Redis CLI

```bash
# Connect to Redis
redis-cli

# Check connected clients
INFO clients

# Monitor all commands
MONITOR

# View all keys
KEYS *

# View cache statistics
INFO stats
```

### Redis Commander UI

Access the web-based UI at: `http://localhost:8081`

## Graceful Degradation

The cache implementation includes graceful degradation:
- If Redis is unavailable, the API continues to work normally
- All cache operations are wrapped in try-catch blocks
- Errors are logged but don't break the application flow

## Best Practices

1. **Cache Keys**: Always include `userId` in cache keys to ensure data isolation
2. **TTL**: Use 5-minute TTL for user-specific data (adjust based on needs)
3. **Invalidation**: Always invalidate related caches when modifying data
4. **Error Handling**: Cache errors are logged but don't crash the app

## Future Enhancements

1. **Configurable TTL**: Make TTL adjustable per route
2. **Cache Warming**: Pre-populate cache for frequently accessed data
3. **Metrics**: Add cache hit/miss metrics for monitoring
4. **Multi-level Caching**: Add in-memory cache layer for frequently accessed data
5. **Cache Compression**: Compress large cached values to save memory

## Troubleshooting

### Redis Not Connecting

```
Error: Redis client not initialized. Call initializeRedis first.
```

**Solution**: Check that Redis is running and `REDIS_HOST` and `REDIS_PORT` are correctly set.

### Cache Not Invalidating

Ensure that:
1. Cache keys are consistent across read and write operations
2. All write operations include cache invalidation calls
3. Pattern-based invalidation is used when appropriate

### Memory Issues

If Redis memory usage grows:
1. Monitor cache keys with `KEYS *`
2. Adjust TTL values lower for less critical data
3. Implement cache eviction policies in Redis