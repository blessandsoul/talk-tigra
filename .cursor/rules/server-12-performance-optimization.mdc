---
trigger: always_on
globs: "server/**/*"
---

> **SCOPE**: These rules apply specifically to the **server** directory.

# Performance Optimization

## Core Principles

- **Measure first, optimize second** - Use profiling to find actual bottlenecks
- **Database queries** are the #1 performance killer
- **Caching** can eliminate 80% of database queries
- **Async everything** - Never block the event loop

---

## Database Query Optimization

### 1. Prevent N+1 Queries

```typescript
// ❌ BAD - N+1 query problem
async function getResourcesWithOwners() {
  const resources = await prisma.resource.findMany();
  
  // This executes 1 query per resource!
  for (const resource of resources) {
    resource.owner = await prisma.user.findUnique({
      where: { id: resource.ownerId },
    });
  }
  
  return resources;
}

// ✅ GOOD - Single query with join
async function getResourcesWithOwners() {
  return await prisma.resource.findMany({
    include: {
      owner: true, // Prisma joins in one query
    },
  });
}
```

### 2. Select Only Needed Fields

```typescript
// ❌ BAD - Fetches all columns
const users = await prisma.user.findMany();

// ✅ GOOD - Select specific fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    name: true,
    // Don't fetch password, createdAt, etc.
  },
});
```

### 3. Use Pagination

```typescript
// ❌ BAD - Loads all records into memory
const resources = await prisma.resource.findMany();

// ✅ GOOD - Paginate
const resources = await prisma.resource.findMany({
  take: limit,
  skip: (page - 1) * limit,
});
```

### 4. Index Frequently Queried Fields

```prisma
// schema.prisma
model Resource {
  id        String   @id @default(uuid())
  ownerId   String
  status    String
  price     Float
  category  String
  createdAt DateTime @default(now())
  
  // Add indexes for fields used in WHERE clauses
  @@index([ownerId])
  @@index([status])
  @@index([category])
  @@index([createdAt])
  
  // Composite index for common queries
  @@index([category, status, createdAt])
}
```

### 5. Use Transactions Sparingly

```typescript
// ❌ BAD - Unnecessary transaction
await prisma.$transaction([
  prisma.user.findUnique({ where: { id: '1' } }), // Just a read!
]);

// ✅ GOOD - Transaction only for writes
await prisma.$transaction([
  prisma.user.update({ where: { id: '1' }, data: { credits: { decrement: 10 } } }),
  prisma.payment.create({ data: { userId: '1', amount: 10 } }),
]);
```

---

## Redis Caching Strategies

### 1. Cache Expensive Queries

```typescript
// libs/cache.ts
import { redis } from './redis';

export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl = 300 // 5 minutes
): Promise<T> {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from DB
  const data = await fetchFn();
  
  // Store in cache
  await redis.setex(key, ttl, JSON.stringify(data));
  
  return data;
}
```

```typescript
// Usage in service
async function getPopularResources() {
  return getCachedOrFetch(
    'popular-resources',
    async () => {
      return await prisma.resource.findMany({
        where: { isPopular: true },
        take: 10,
      });
    },
    600 // Cache for 10 minutes
  );
}
```

### 2. Cache Invalidation

```typescript
// When resource is updated, invalidate cache
async function updateResource(id: string, data: any) {
  const updated = await prisma.resource.update({
    where: { id },
    data,
  });
  
  // Invalidate relevant caches
  await redis.del(`resource:${id}`);
  await redis.del('popular-resources');
  await redis.del('recent-resources');
  
  return updated;
}
```

### 3. Cache Patterns

```typescript
// Pattern: Cache-Aside (Lazy Loading)
async function getResource(id: string) {
  const cacheKey = `resource:${id}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) return JSON.parse(cached);
  
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (resource) {
    await redis.setex(cacheKey, 300, JSON.stringify(resource));
  }
  
  return resource;
}

// Pattern: Write-Through
async function createResource(data: CreateResourceInput) {
  const resource = await prisma.resource.create({ data });
  
  // Immediately cache new resource
  await redis.setex(
    `resource:${resource.id}`,
    300,
    JSON.stringify(resource)
  );
  
  return resource;
}
```

---

## Query Performance Monitoring

### 1. Log Slow Queries

```typescript
// libs/db.ts (already in observability.md)
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    logger.warn(
      {
        query: e.query,
        duration: e.duration,
        params: e.params,
      },
      'Slow query detected'
    );
  }
});
```

### 2. Database Connection Pooling

```typescript
// Prisma auto-manages connection pool
// Configure in DATABASE_URL
// mysql://user:pass@localhost:3306/db?connection_limit=10
```

---

## Response Compression

```typescript
// app.ts
import compress from '@fastify/compress';

await app.register(compress, {
  global: true,
  threshold: 1024, // Only compress responses > 1KB
  encodings: ['gzip', 'deflate'],
});
```

---

## Async Processing Best Practices

### 1. Use Background Jobs for Slow Operations

```typescript
// ❌ BAD - Blocks HTTP response
app.post('/resources', async (request, reply) => {
  const resource = await createResource(request.body);
  
  // This takes 5 seconds!
  await sendEmailToOwner(resource.ownerId);
  await generateThumbnails(resource.images);
  await notifyFollowers(resource.ownerId);
  
  return reply.send(resource);
});

// ✅ GOOD - Offload to background jobs
app.post('/resources', async (request, reply) => {
  const resource = await createResource(request.body);
  
  // Queue background jobs (non-blocking)
  await emailQueue.add('notify-owner', { resourceId: resource.id });
  await fileQueue.add('generate-thumbnails', { resourceId: resource.id });
  await notificationQueue.add('notify-followers', { ownerId: resource.ownerId });
  
  // Return immediately
  return reply.send(resource);
});
```

### 2. Parallel Execution

```typescript
// ❌ BAD - Sequential (slow)
const user = await prisma.user.findUnique({ where: { id } });
const resources = await prisma.resource.findMany({ where: { ownerId: id } });
const stats = await calculateUserStats(id);

// ✅ GOOD - Parallel (fast)
const [user, resources, stats] = await Promise.all([
  prisma.user.findUnique({ where: { id } }),
  prisma.resource.findMany({ where: { ownerId: id } }),
  calculateUserStats(id),
]);
```

---

## Response Optimization

### 1. Minimize Response Size

```typescript
// ❌ BAD - Returns entire objects
app.get('/resources', async (request, reply) => {
  const resources = await prisma.resource.findMany();
  return resources; // Includes unnecessary fields
});

// ✅ GOOD - Select only needed fields
app.get('/resources', async (request, reply) => {
  const resources = await prisma.resource.findMany({
    select: {
      id: true,
      title: true,
      price: true,
      thumbnailUrl: true,
      // Don't include description, metadata, etc. in list view
    },
  });
  return resources;
});
```

### 2. Use Streaming for Large Responses

```typescript
// For large datasets, stream instead of buffering
app.get('/export/resources', async (request, reply) => {
  reply.type('application/json');
  
  const stream = prisma.resource.findMany({ stream: true });
  
  return reply.send(stream);
});
```

---

## Memory Management

### 1. Avoid Memory Leaks

```typescript
// ❌ BAD - Memory leak
const cache = new Map();

app.get('/data', (request, reply) => {
  const data = getExpensiveData();
  cache.set(request.id, data); // Never cleaned up!
  return data;
});

// ✅ GOOD - Use Redis or LRU cache
import LRU from 'lru-cache';

const cache = new LRU({
  max: 500, // Max 500 items
  ttl: 1000 * 60 * 5, // 5 minutes
});
```

### 2. Batch Processing

```typescript
// ❌ BAD - Process one by one
for (const user of users) {
  await sendEmail(user.email);
}

// ✅ GOOD - Batch process
const chunks = chunkArray(users, 100);
for (const chunk of chunks) {
  await Promise.all(chunk.map(user => sendEmail(user.email)));
}
```

---

## API Design for Performance

### 1. Cursor-Based Pagination (Large Datasets)

```typescript
// Better than offset pagination for large datasets
app.get('/resources', async (request, reply) => {
  const { cursor, limit = 10 } = request.query;
  
  const resources = await prisma.resource.findMany({
    take: limit + 1, // Fetch one extra to check if more exist
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  
  const hasMore = resources.length > limit;
  const items = hasMore ? resources.slice(0, -1) : resources;
  
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
});
```

### 2. Field Selection (GraphQL-style)

```typescript
// Allow clients to request only needed fields
app.get('/users/:id', async (request, reply) => {
  const { fields } = request.query; // ?fields=id,email,name
  
  const select = fields
    ? fields.split(',').reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {})
    : undefined;
  
  const user = await prisma.user.findUnique({
    where: { id: request.params.id },
    select,
  });
  
  return user;
});
```

---

## Load Testing

```bash
# Install k6 for load testing
brew install k6  # macOS
# or
choco install k6  # Windows

# Create load test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/v1/resources');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
EOF

# Run test
k6 run load-test.js
```

---

## Performance Monitoring

### 1. Response Time Tracking

```typescript
// Already covered in observability.md
app.addHook('onRequest', (request, reply, done) => {
  request.startTime = Date.now();
  done();
});

app.addHook('onResponse', (request, reply, done) => {
  const duration = Date.now() - request.startTime;
  
  logger.info({
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    duration,
  });
  
  done();
});
```

### 2. Database Query Metrics

```typescript
let queryCount = 0;
let totalQueryTime = 0;

prisma.$on('query', (e) => {
  queryCount++;
  totalQueryTime += e.duration;
});

app.get('/metrics/db', async (request, reply) => {
  return {
    totalQueries: queryCount,
    avgDuration: totalQueryTime / queryCount,
  };
});
```

---

## Performance Checklist

### Database
- [ ] Indexes on frequently queried fields
- [ ] No N+1 queries
- [ ] Pagination implemented
- [ ] Select only needed fields
- [ ] Connection pooling configured
- [ ] Slow query logging enabled

### Caching
- [ ] Redis caching for expensive queries
- [ ] Cache invalidation strategy
- [ ] TTL set appropriately
- [ ] Cache hit/miss monitoring

### API
- [ ] Response compression enabled
- [ ] Background jobs for slow operations
- [ ] Parallel execution where possible
- [ ] Minimal response payloads
- [ ] Rate limiting configured

### Monitoring
- [ ] Response time tracking
- [ ] Database metrics collected
- [ ] Load testing performed
- [ ] Error rates monitored
- [ ] Memory usage monitored

---

## Performance Targets

| Metric | Target |
|--------|--------|
| API Response Time (p95) | < 500ms |
| API Response Time (p99) | < 1s |
| Database Query Time (p95) | < 100ms |
| Cache Hit Rate | > 80% |
| Error Rate | < 0.1% |
| Throughput | > 1000 req/s |
