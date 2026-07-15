# Redis Cache Setup Guide

## Quick Start

### Option 1: Run Redis with Main Docker Compose (Recommended)

Redis is **already included** in the main `docker-compose.yml`. Just run:

```bash
cd infra/docker
docker-compose up redis
```

This starts:
- Redis cache service on port `6379`
- Redis Commander UI on port `8081`

### Option 2: Run Redis Standalone

For development or testing Redis independently:

```bash
cd infra/docker
docker-compose -f docker-compose.redis.yml up
```

This includes:
- Redis cache optimized for caching (512MB max memory)
- Automatic eviction policy (LRU - Least Recently Used)
- Redis Commander monitoring UI
- Health checks enabled

## Verification

### Check Redis is Running

```bash
# Using redis-cli
redis-cli ping
# Expected response: PONG

# Check Redis info
redis-cli info
```

### Access Redis Web UI

Open your browser and visit: **http://localhost:8081**

You'll see:
- All cached keys
- Memory usage
- Cache hit/miss rates
- Real-time monitoring

## Environment Configuration

The API automatically connects to Redis using these defaults:

```env
REDIS_HOST=redis          # Docker service name or localhost
REDIS_PORT=6379           # Default Redis port
```

For local development, these work out of the box. For production, update `.env`:

```env
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

## Docker Network

Both docker-compose files use the `applyai-network` bridge network, so services can communicate:

```
┌─────────────────────────────────────────┐
│         applyai-network                 │
│  ┌──────────┐      ┌──────────┐         │
│  │   API    │◄────►│  Redis   │         │
│  └──────────┘      └──────────┘         │
│  ┌──────────┐      ┌──────────┐         │
│  │ Scheduler├────►│ Redis UI │         │
│  └──────────┘      └──────────┘         │
│  ┌──────────┐                           │
│  │  Worker  │                           │
│  └──────────┘                           │
└─────────────────────────────────────────┘
```

## Memory Management

### Redis Configuration

The standalone Redis (in `docker-compose.redis.yml`) is configured with:

```yaml
command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
```

**Explanation:**
- `--appendonly yes` - Persist data to disk
- `--maxmemory 512mb` - Maximum 512MB of memory
- `--maxmemory-policy allkeys-lru` - Remove least-recently-used keys when memory limit reached

### Monitor Memory Usage

```bash
# Check Redis memory
redis-cli info memory

# View cache keys
redis-cli keys "*"

# Get memory usage by key
redis-cli --bigkeys

# Clear cache if needed
redis-cli flushdb       # Clear current database
redis-cli flushall      # Clear all databases
```

## Troubleshooting

### Redis Connection Failed

**Error:** `Error: Redis client not initialized`

**Solution:**
1. Verify Redis is running:
   ```bash
   docker ps | grep redis
   ```
2. Check Redis health:
   ```bash
   redis-cli ping
   ```
3. Verify environment variables:
   ```bash
   echo $REDIS_HOST
   echo $REDIS_PORT
   ```

### High Memory Usage

**Issue:** Redis using too much memory

**Solution:**
1. Clear old cache:
   ```bash
   redis-cli flushdb
   ```
2. Reduce TTL in cache utility (default: 300 seconds)
3. Reduce `--maxmemory` value in docker-compose
4. Check for stuck/old keys:
   ```bash
   redis-cli --bigkeys
   ```

### Slow Cache Response

**Issue:** Cache operations are slow

**Solution:**
1. Check Redis memory pressure:
   ```bash
   redis-cli info memory
   ```
2. Check if Redis is using disk (AOF):
   ```bash
   redis-cli info persistence
   ```
3. Monitor commands:
   ```bash
   redis-cli monitor
   ```

## Production Deployment

For production environments:

### 1. Use Redis Cluster
```yaml
# Multiple Redis instances for high availability
redis-1:
  image: redis:7-alpine
  ports:
    - "6379:6379"

redis-2:
  image: redis:7-alpine
  ports:
    - "6380:6380"

redis-3:
  image: redis:7-alpine
  ports:
    - "6381:6381"
```

### 2. Enable Persistence
```bash
redis-server --appendonly yes --appendfsync everysec
```

### 3. Security
```bash
# Require password
redis-server --requirepass your-secure-password

# Update API connection
# Use: redis://user:password@hostname:6379
```

### 4. Monitoring
```bash
# Install redis-exporter for Prometheus
docker run -d -p 9121:9121 oliver006/redis_exporter
```

## Quick Commands

```bash
# Start Redis (standalone)
docker-compose -f docker-compose.redis.yml up -d

# Start Redis (with full stack)
docker-compose up -d

# Stop Redis
docker-compose -f docker-compose.redis.yml down

# View logs
docker-compose -f docker-compose.redis.yml logs -f redis

# Get Redis stats
redis-cli info stats

# Check connected clients
redis-cli client list

# Monitor in real-time
redis-cli monitor

# Clear all cache
redis-cli flushall
```

## Integration with API

The API automatically handles:
- ✅ Connecting to Redis on startup
- ✅ Graceful degradation if Redis is unavailable
- ✅ Caching GET endpoints (5-minute TTL)
- ✅ Invalidating cache on data changes
- ✅ Monitoring cache performance

**No additional configuration needed!** Just start Redis and the API will use it.