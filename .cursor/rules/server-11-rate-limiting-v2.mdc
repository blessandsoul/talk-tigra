---
trigger: always_on
globs: "server/**/*"
---

> **SCOPE**: These rules apply specifically to the **server** directory.

# Rate Limiting & Throttling

## Stack

```json
{
  "dependencies": {
    "@fastify/rate-limit": "^9.0.0",
    "ioredis": "^5.3.0"
  }
}
```

## Basic Setup

```typescript
// app.ts
import rateLimit from '@fastify/rate-limit';
import { redis } from './libs/redis';

await app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '15 minutes',
  redis,
  nameSpace: 'rate-limit:',
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
    'retry-after': true,
  },
  errorResponseBuilder: (request, context) => ({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Rate limit exceeded. Retry in ${Math.ceil(context.ttl / 1000)}s.`,
    },
  }),
});
```

## Per-Route Limits

```typescript
// Disable global, configure per route
await app.register(rateLimit, { global: false, redis });

// Strict limit for login
app.post('/auth/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '15 minutes',
    },
  },
  handler: authController.login,
});

// Generous limit for authenticated routes
app.get('/resources', {
  preHandler: [app.authenticate],
  config: {
    rateLimit: {
      max: 1000,
      timeWindow: '15 minutes',
    },
  },
  handler: resourceController.listResources,
});
```

## Custom Rate Limit Keys

```typescript
await app.register(rateLimit, {
  redis,
  keyGenerator: (request) => {
    // Authenticated: rate limit by user ID
    if (request.user) {
      return `user:${request.user.id}`;
    }
    // Anonymous: rate limit by IP
    return `ip:${request.ip}`;
  },
});
```

## User-Based Tiered Limits

```typescript
await app.register(rateLimit, {
  redis,
  max: async (request) => {
    if (!request.user) return 100; // Anonymous
    if (request.user.role === 'ADMIN') return 10000;
    if (request.user.tier === 'PREMIUM') return 5000;
    return 1000; // Standard
  },
});
```

## Rate Limit Tiers

```typescript
// lib/constants/rate-limits.ts
export const RATE_LIMITS = {
  LOGIN: { max: 5, timeWindow: '15 minutes' },
  REGISTER: { max: 3, timeWindow: '1 hour' },
  PASSWORD_RESET: { max: 3, timeWindow: '1 hour' },
  PUBLIC: { max: 100, timeWindow: '15 minutes' },
  AUTHENTICATED: { max: 1000, timeWindow: '15 minutes' },
  PREMIUM: { max: 5000, timeWindow: '15 minutes' },
  ADMIN: { max: 10000, timeWindow: '15 minutes' },
  FILE_UPLOAD: { max: 10, timeWindow: '1 hour' },
} as const;
```

## Monitoring

```typescript
await app.register(rateLimit, {
  redis,
  onExceeding: (request, key) => {
    logger.warn({ key, ip: request.ip, url: request.url }, 'Approaching limit');
  },
  onExceeded: (request, key) => {
    logger.error({ key, ip: request.ip, url: request.url }, 'Limit exceeded');
  },
});
```

## Whitelist IPs

```typescript
app.addHook('preHandler', async (request, reply) => {
  const whitelistedIPs = ['127.0.0.1', '::1'];
  if (whitelistedIPs.includes(request.ip)) {
    // @ts-ignore
    request.bypassRateLimit = true;
  }
});

await app.register(rateLimit, {
  redis,
  skip: (request) => request.bypassRateLimit === true,
});
```

## Check Rate Limit Status

```typescript
app.get('/me/rate-limit', {
  preHandler: [app.authenticate],
  handler: async (request, reply) => {
    const key = `user:${request.user.id}`;
    const current = await redis.get(`rate-limit:${key}`);
    const ttl = await redis.ttl(`rate-limit:${key}`);
    
    return {
      limit: 1000,
      used: parseInt(current || '0'),
      remaining: 1000 - parseInt(current || '0'),
      resetIn: ttl,
    };
  },
});
```

## Strategy Summary

| Endpoint | Max | Window | Key |
|----------|-----|--------|-----|
| Login | 5 | 15 min | IP |
| Register | 3 | 1 hour | IP + email |
| Public API | 100 | 15 min | IP |
| Authenticated | 1000 | 15 min | User ID |
| Premium | 5000 | 15 min | User ID |
| Admin | 10000 | 15 min | User ID |

## Best Practices

### ✅ DO:
- Use Redis for distributed rate limiting
- Set stricter limits for auth endpoints
- Return helpful error messages with retry time
- Log rate limit violations
- Add rate limit headers to responses
- Whitelist localhost for testing

### ❌ DON'T:
- Use in-memory rate limiting in production
- Apply same limits to all endpoints
- Block users permanently without investigation
- Forget to test rate limits

## Checklist

- [ ] Rate limiting configured with Redis
- [ ] Per-route limits set appropriately
- [ ] Custom error responses implemented
- [ ] Rate limit headers enabled
- [ ] Monitoring and logging in place
- [ ] Whitelist configured for testing
