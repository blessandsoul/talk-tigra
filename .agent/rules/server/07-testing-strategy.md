---
trigger: always_on
---

> **SCOPE**: These rules apply specifically to the **server** directory.

# Testing Strategy & Best Practices

## Test Philosophy

- **Test the behavior, not the implementation**
- **Aim for 70%+ coverage** on services and critical utilities
- **Fast tests** - Unit tests < 50ms, Integration < 500ms each
- **Deterministic** - Tests must pass/fail consistently

---

## Test Stack

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "supertest": "^6.3.0",
    "@faker-js/faker": "^8.0.0",
    "@testcontainers/mysql": "^10.0.0"
  }
}
```

**Tools:**
- **Vitest** - Test runner (faster than Jest)
- **Supertest** - HTTP endpoint testing
- **Faker** - Generate realistic test data
- **Testcontainers** - Isolated MySQL for integration tests

---

## Folder Structure

```
src/
├── modules/
│   └── users/
│       ├── users.service.ts
│       ├── users.service.test.ts        # Unit tests
│       ├── users.controller.ts
│       └── users.integration.test.ts     # Integration tests
├── libs/
│   └── auth/
│       ├── jwt.ts
│       └── jwt.test.ts
└── __tests__/
    ├── setup.ts                          # Global test setup
    ├── helpers/                          # Test utilities
    │   ├── factory.ts                    # Data factories
    │   └── db.ts                         # Test DB helpers
    └── e2e/                              # End-to-end tests
        └── auth-flow.test.ts
```

---

## Test Types & When to Use

### 1. Unit Tests (70% of tests)
**Test:** Services, utilities, helpers  
**Mock:** Database, external APIs  
**Speed:** < 50ms per test

```typescript
// users.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './users.service';
import { UserRepository } from './users.repo';

vi.mock('./users.repo');

describe('UserService', () => {
  let service: UserService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      create: vi.fn(),
    };
    service = new UserService(mockRepo);
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      mockRepo.findById.mockResolvedValue(mockUser);

      const result = await service.getUserById('1');

      expect(result).toEqual(mockUser);
      expect(mockRepo.findById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getUserById('999'))
        .rejects.toThrow('User not found');
    });
  });
});
```

### 2. Integration Tests (20% of tests)
**Test:** API endpoints with real DB  
**Mock:** External APIs only  
**Speed:** < 500ms per test

```typescript
// users.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../app';
import { setupTestDB, cleanupTestDB } from '../__tests__/helpers/db';

describe('Users API', () => {
  let app: any;

  beforeAll(async () => {
    await setupTestDB();
    app = await build();
  });

  afterAll(async () => {
    await app.close();
    await cleanupTestDB();
  });

  describe('POST /api/v1/users', () => {
    it('should create user with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload: {
          email: 'test@example.com',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        success: true,
        message: 'User created successfully',
        data: {
          email: 'test@example.com',
        },
      });
    });

    it('should reject invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload: {
          email: 'invalid-email',
          password: 'SecurePass123!',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().success).toBe(false);
    });
  });
});
```

### 3. E2E Tests (10% of tests)
**Test:** Complete user flows  
**Mock:** Nothing (real environment)  
**Speed:** < 2s per flow

```typescript
// __tests__/e2e/auth-flow.test.ts
describe('Authentication Flow', () => {
  it('should complete full auth lifecycle', async () => {
    // 1. Register
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: 'user@test.com', password: 'Pass123!' },
    });
    expect(registerRes.statusCode).toBe(201);

    // 2. Login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'user@test.com', password: 'Pass123!' },
    });
    const { accessToken } = loginRes.json().data;

    // 3. Access protected route
    const profileRes = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(profileRes.statusCode).toBe(200);

    // 4. Logout
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(logoutRes.statusCode).toBe(200);
  });
});
```

---

## Test Database Setup

### Option 1: Testcontainers (Recommended)
Real MySQL in Docker, isolated per test suite.

```typescript
// __tests__/helpers/db.ts
import { MySqlContainer } from '@testcontainers/mysql';
import { PrismaClient } from '@prisma/client';

let container: MySqlContainer;
let prisma: PrismaClient;

export async function setupTestDB() {
  container = await new MySqlContainer('mysql:8.0')
    .withDatabase('test_db')
    .start();

  const DATABASE_URL = container.getConnectionUri();
  process.env.DATABASE_URL = DATABASE_URL;

  prisma = new PrismaClient();
  await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;
  // Run migrations
  await prisma.$executeRaw`/* Your schema setup */`;
}

export async function cleanupTestDB() {
  await prisma.$disconnect();
  await container.stop();
}

export async function clearDB() {
  const tables = await prisma.$queryRaw`SHOW TABLES`;
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${Object.values(table)[0]}`);
  }
}
```

### Option 2: Separate Test Database
Simpler but requires manual setup.

```typescript
// __tests__/helpers/db.ts
export async function setupTestDB() {
  process.env.DATABASE_URL = 'mysql://root:pass@localhost:3306/test_db';
  await prisma.$executeRaw`DROP DATABASE IF EXISTS test_db`;
  await prisma.$executeRaw`CREATE DATABASE test_db`;
  // Run migrations
}
```

---

## Data Factories

Use factories to create consistent test data:

```typescript
// __tests__/helpers/factory.ts
import { faker } from '@faker-js/faker';

export const UserFactory = {
  build: (overrides = {}) => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    password: 'SecurePass123!',
    createdAt: new Date(),
    ...overrides,
  }),

  create: async (overrides = {}) => {
    const data = UserFactory.build(overrides);
    return await prisma.user.create({ data });
  },
};

// Usage in tests
it('should update user', async () => {
  const user = await UserFactory.create();
  // Test with real DB entity
});
```

---

## Mocking Patterns

### Mock External APIs
```typescript
import { vi } from 'vitest';

vi.mock('../libs/stripe', () => ({
  stripeClient: {
    charges: {
      create: vi.fn().mockResolvedValue({ id: 'ch_123', status: 'succeeded' }),
    },
  },
}));
```

### Mock Redis
```typescript
vi.mock('../libs/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));
```

### Mock Environment Variables
```typescript
beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
});
```

---

## Testing Best Practices

### ✅ DO:
- **Test edge cases**: Empty arrays, null values, boundary conditions
- **Use descriptive test names**: `it('should throw error when email is already taken')`
- **One assertion per test** (or closely related assertions)
- **Clean up after tests**: Reset mocks, clear DB
- **Use factories** for consistent test data

### ❌ DON'T:
- Test Prisma/Fastify internals (trust the library)
- Write tests that depend on execution order
- Mock everything (integration tests need real DB)
- Use production database for tests
- Commit `.env.test` with real credentials

---

## Coverage Requirements

```json
// package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Minimum Coverage:**
- **Services**: 80%
- **Controllers**: 60% (mostly happy paths)
- **Utilities**: 90%
- **Overall**: 70%

**Ignore from coverage:**
- Migration files
- Type definitions
- Config files

---

## CI Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test
          MYSQL_DATABASE: test_db
        ports:
          - 3306:3306
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
```

---

## Common Test Scenarios

### Testing Authentication
```typescript
describe('Protected Routes', () => {
  it('should reject requests without token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
    });
    expect(res.statusCode).toBe(401);
  });

  it('should accept valid token', async () => {
    const token = generateTestToken({ userId: '123' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
  });
});
```

### Testing Pagination
```typescript
it('should paginate results correctly', async () => {
  await UserFactory.create({ count: 25 }); // Create 25 users

  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/users?page=2&limit=10',
  });

  const { data } = res.json();
  expect(data.items).toHaveLength(10);
  expect(data.pagination).toMatchObject({
    page: 2,
    limit: 10,
    totalItems: 25,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: true,
  });
});
```

### Testing Transactions
```typescript
it('should rollback on error', async () => {
  await expect(
    prisma.$transaction(async (tx) => {
      await tx.user.create({ data: { email: 'test@example.com' } });
      throw new Error('Simulated error');
    })
  ).rejects.toThrow();

  const users = await prisma.user.findMany();
  expect(users).toHaveLength(0); // Transaction rolled back
});
```

---

## Debugging Tests

```typescript
// Add logging to failing tests
it.only('should debug this specific test', async () => {
  console.log('Request payload:', payload);
  const res = await app.inject({ ... });
  console.log('Response:', res.json());
  expect(res.statusCode).toBe(200);
});
```

**Vitest UI** for visual debugging:
```bash
npm run test -- --ui
```

---

## Checklist

- [ ] Unit tests for all services
- [ ] Integration tests for all API endpoints
- [ ] E2E test for critical user flows
- [ ] 70%+ code coverage
- [ ] Tests pass in CI
- [ ] No hardcoded credentials in tests
- [ ] Test DB isolated from development DB
