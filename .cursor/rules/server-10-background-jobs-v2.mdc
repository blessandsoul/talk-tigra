---
trigger: always_on
globs: "server/**/*"
---

> **SCOPE**: These rules apply specifically to the **server** directory.

# Background Jobs & Queue Processing

## Stack

```json
{
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.0"
  }
}
```

## Redis Setup

```typescript
// libs/redis.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null, // Required for BullMQ
});
```

## Queue Setup

```typescript
// libs/queue.ts
import { Queue, Worker, QueueEvents } from 'bullmq';
import { redis } from './redis';

export const emailQueue = new Queue('emails', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 3600, count: 100 },
    removeOnFail: { age: 86400 },
  },
});
```

## Worker Pattern

```typescript
// workers/email.worker.ts
import { Worker, Job } from 'bullmq';

interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

export const emailWorker = new Worker<EmailJobData>(
  'emails',
  async (job: Job<EmailJobData>) => {
    const { to, subject, body } = job.data;
    
    logger.info({ jobId: job.id, to }, 'Processing email');
    
    await sendEmail({ to, subject, body });
    
    return { success: true, sentAt: new Date().toISOString() };
  },
  {
    connection: redis,
    concurrency: 5,
    limiter: { max: 100, duration: 60000 }, // 100 jobs/minute
  }
);
```

## Job Patterns

### 1. Immediate Background Job
```typescript
// Add to queue (non-blocking)
await emailQueue.add('welcome-email', {
  to: user.email,
  subject: 'Welcome!',
  body: 'Thanks for signing up',
});
```

### 2. Delayed Job
```typescript
// Send after 24 hours
await emailQueue.add(
  'reminder-email',
  { to: user.email, subject: 'Reminder', body: 'Complete your profile' },
  { delay: 24 * 60 * 60 * 1000 }
);
```

### 3. Scheduled Job (Cron)
```typescript
// Daily at 2 AM
await cleanupQueue.add(
  'daily-cleanup',
  {},
  { repeat: { pattern: '0 2 * * *' } }
);
```

### 4. Priority Job
```typescript
await paymentQueue.add(
  'process-payment',
  { orderId, amount },
  { priority: 1 } // Lower = higher priority
);
```

## Error Handling

```typescript
emailWorker.on('failed', (job, error) => {
  logger.error({ jobId: job?.id, error }, 'Job failed');
  
  // Move to dead letter queue after all retries
  if (job && job.attemptsMade >= job.opts.attempts!) {
    deadLetterQueue.add('failed-email', {
      originalJob: job.data,
      failedReason: error.message,
    });
  }
});
```

## Graceful Shutdown

```typescript
// server.ts
const workers = [emailWorker, fileWorker];

async function gracefulShutdown() {
  logger.info('Shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

## Use Cases

- **Email sending** (welcome, verification, notifications)
- **File processing** (image thumbnails, video encoding)
- **Report generation** (PDFs, exports)
- **Data cleanup** (expired records, temp files)
- **External API calls** (webhooks, third-party sync)

## Best Practices

### ✅ DO:
- Use background jobs for slow operations (>1s)
- Set appropriate retry strategies
- Implement rate limiting for external APIs
- Monitor job failures
- Clean up old jobs

### ❌ DON'T:
- Block HTTP responses with heavy processing
- Forget error handling
- Skip monitoring
- Use queues for everything (simple tasks can run inline)

## Checklist

- [ ] BullMQ and Redis installed
- [ ] Queues created with retry config
- [ ] Workers implemented with error handling
- [ ] Graceful shutdown configured
- [ ] Job monitoring in place
- [ ] Dead letter queue for failures
