---
trigger: always_on
globs: "server/**/*"
---

> **SCOPE**: These rules apply specifically to the **server** directory.

# Observability, Logging & Monitoring

## Logging Stack

```json
{
  "dependencies": {
    "pino": "^8.16.0",
    "pino-pretty": "^10.2.0"
  }
}
```

## Logger Setup

```typescript
// libs/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  redact: {
    paths: ['req.headers.authorization', '*.password', '*.token'],
    censor: '[REDACTED]',
  },
});
```

## Fastify Integration

```typescript
// app.ts
export const app = fastify({
  logger: {
    level: 'info',
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, requestId: req.id }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  },
  requestIdHeader: 'x-request-id',
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
});
```

## Log Levels

```typescript
logger.info({ userId }, 'Normal operations');
logger.warn({ attempts: 3 }, 'Approaching limit');
logger.error({ error, userId }, 'Errors needing attention');
```

**Production:** `info` | **Development:** `debug`

## Error Logging

```typescript
app.setErrorHandler((error, request, reply) => {
  request.log.error({
    err: error,
    requestId: request.id,
    userId: request.user?.id,
  }, error.message);

  reply.status(error.statusCode || 500).send({
    success: false,
    error: { code: error.code || 'INTERNAL_ERROR', message: error.message },
  });
});
```

## Slow Query Logging

```typescript
// libs/db.ts
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    logger.warn({ query: e.query, duration: e.duration }, 'Slow query');
  }
});
```

## Error Tracking (Sentry)

```typescript
// libs/sentry.ts
import * as Sentry from '@sentry/node';

export function initSentry() {
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }
}
```

## Health Check Endpoint

```typescript
app.get('/health', async (request, reply) => {
  const checks = {
    status: 'healthy',
    database: 'unknown',
    redis: 'unknown',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'connected';
  } catch {
    checks.database = 'disconnected';
    checks.status = 'unhealthy';
  }

  try {
    await redis.ping();
    checks.redis = 'connected';
  } catch {
    checks.redis = 'disconnected';
    checks.status = 'unhealthy';
  }

  return reply.status(checks.status === 'healthy' ? 200 : 503).send(checks);
});
```

## Performance Tracking

```typescript
app.addHook('onRequest', (request, reply, done) => {
  request.startTime = Date.now();
  done();
});

app.addHook('onResponse', (request, reply, done) => {
  const duration = Date.now() - request.startTime;
  
  if (duration > 500) {
    logger.warn({ url: request.url, duration }, 'Slow response');
  }
  
  done();
});
```

## Best Practices

### ✅ DO:
- Use structured logging (JSON)
- Include request IDs for tracing
- Redact sensitive data
- Log errors with full context
- Monitor response times

### ❌ DON'T:
- Log passwords, tokens, API keys
- Use `console.log` in production
- Log sensitive user data
- Skip error context

## Checklist

- [ ] Pino logger configured
- [ ] Request ID tracking enabled
- [ ] Sensitive data redacted
- [ ] Health check endpoint
- [ ] Slow query logging
- [ ] Error tracking (Sentry) in production
