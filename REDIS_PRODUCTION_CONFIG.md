# Redis Configuration for Production

## Production Redis Setup

Your production Redis server is configured at:
- **Host**: `13.204.87.62`
- **Port**: `6379`
- **URL**: `redis://13.204.87.62:6379`

## Environment Variables

The project now uses the following environment variables for Redis configuration:

### Primary Method (Recommended for Production)
```env
REDIS_URL=redis://13.204.87.62:6379
```

### Alternative Method (Host + Port)
```env
REDIS_HOST=13.204.87.62
REDIS_PORT=6379
```

## Where Redis is Used

### 1. **API Cache** (`apps/api/src/lib/cache.ts`)
- Stores cached API responses
- Reduces database queries
- Configurable TTL (Time-To-Live)

### 2. **Job Queue** (`packages/queue/src/connection.ts`)
- Manages background jobs
- Supports retry logic
- Persistent job storage

## Configuration Priority

The code checks for Redis configuration in this order:

1. **REDIS_URL** - Direct connection string (highest priority)
2. **REDIS_HOST + REDIS_PORT** - Individual host and port variables
3. **Localhost fallback** - `redis://localhost:6379` (if neither is set)

## Files Updated

- ✅ `.env` - Updated with production Redis IP
- ✅ `.env.production` - Production-specific configuration
- ✅ `.env.example` - Example configuration with documentation
- ✅ `apps/api/src/lib/cache.ts` - Uses REDIS_URL or REDIS_HOST+REDIS_PORT
- ✅ `packages/queue/src/connection.ts` - Uses REDIS_URL or REDIS_HOST+REDIS_PORT

## Deployment Instructions

### For Render (API Server)
1. Go to **Render Dashboard → Your API Service → Environment**
2. Add the following environment variables:
   ```
   REDIS_URL=redis://13.204.87.62:6379
   REDIS_HOST=13.204.87.62
   REDIS_PORT=6379
   ```

### For Vercel (Frontend)
- Redis configuration is not needed in the frontend
- Frontend only needs: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_BASE_URL`

### For Local Development
- Update `.env.local` if you want to use production Redis:
  ```env
  REDIS_URL=redis://13.204.87.62:6379
  ```
- Or use Docker Redis locally:
  ```env
  REDIS_HOST=redis
  REDIS_PORT=6379
  ```

## Testing Redis Connection

To verify Redis is properly configured:

```bash
# Test with redis-cli
redis-cli -h 13.204.87.62 -p 6379 ping

# Expected output: PONG
```

## Troubleshooting

### Connection Timeout
- Verify Redis server is running: `13.204.87.62:6379`
- Check firewall rules allow connections on port 6379
- Test connectivity: `telnet 13.204.87.62 6379`

### Authentication Failed
- Ensure Redis has no password requirement, or add password to connection string:
  ```
  REDIS_URL=redis://:password@13.204.87.62:6379
  ```

### REDIS_URL vs REDIS_HOST
- If both are set, `REDIS_URL` takes priority
- Use `REDIS_URL` for simplicity in production
- Use `REDIS_HOST+REDIS_PORT` for Docker Compose or development
