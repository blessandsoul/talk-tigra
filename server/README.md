# Talk Tigra



## Features
- JWT Authentication (access + refresh tokens)
- User management with role-based access
- Complete CRUD for resources
- Pagination with filters
- Rate limiting with Redis
- Background job processing (BullMQ)
- Comprehensive error handling
- Request logging and monitoring
- Health checks

## Tech Stack
- **Runtime**: Node.js 20+
- **Framework**: Fastify 4
- **Database**: MySQL 8.0 with Prisma ORM
- **Cache/Queue**: Redis + BullMQ
- **Validation**: Zod
- **Authentication**: JWT (jsonwebtoken)
- **Testing**: Vitest + Supertest

## Prerequisites
- Node.js 20 or higher
- Docker and Docker Compose
- npm or pnpm

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start Docker services (MySQL + Redis)
docker-compose up -d

# 3. Initialize database (creates .env, waits for DB, runs migrations)
npm run db:init

# 4. Seed the database
npm run prisma:seed

# 5. Start development server
npm run dev
```

Server will start at http://localhost:3000

### Production Installation

For production deployments, install only production dependencies:

```bash
# Install production dependencies only (faster, smaller)
npm install --omit=dev

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

## API Endpoints

Once running, you can access:
- Health Check: http://localhost:3000/health
- Auth endpoints: http://localhost:3000/api/v1/auth/*
- Resources endpoints: http://localhost:3000/api/v1/resources/*
- Admin endpoints: http://localhost:3000/api/v1/admin/*

## Available Scripts

```bash
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm run start            # Start production server
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations (dev)
npm run prisma:seed      # Seed database
npm run prisma:studio    # Open Prisma Studio
```

## Project Structure

```
src/
├── app.ts              # Fastify app with plugins
├── server.ts           # Server startup
├── config/
│   └── env.ts         # Environment validation
├── libs/
│   ├── db.ts          # Prisma client
│   ├── redis.ts       # Redis connection
│   ├── logger.ts      # Pino logger
│   └── queue.ts       # BullMQ queues
├── modules/
│   ├── auth/          # Authentication module
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repo.ts
│   │   ├── auth.schemas.ts
│   │   └── auth.types.ts
│   └── resources/     # Resources module
├── utils/
│   ├── errors.ts      # Custom error classes
│   ├── response.ts    # Response helpers
│   └── pagination.ts  # Pagination helper
└── workers/
    └── email.worker.ts # Background email worker
```

## Environment Variables

Required:
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port

See `.env.example` for all available variables.

## Testing

```bash
npm test                 # Run all tests
npm run test:coverage    # Generate coverage report
```

Coverage targets: 70%+ overall

## Management Tools

The project includes built-in web interfaces for managing your data:

### Database (phpMyAdmin)
- **URL:** [http://localhost:8080](http://localhost:8080)
- **User:** `root` or `root`
- **Password:** `password` or `password` (check `docker-compose.yml`)

### Redis (Redis Commander)
- **URL:** [http://localhost:8081](http://localhost:8081)
- **Host:** `local:redis:6379` (default)

## Production Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Build application: `npm run build`
- [ ] Configure environment variables
- [ ] Configure Nginx reverse proxy
- [ ] Set up SSL certificates (Let's Encrypt)
- [ ] Configure firewall (UFW/iptables)
- [ ] Set up monitoring (Sentry, logging)
- [ ] Configure log rotation
- [ ] Set up automated backups (database + uploads)
- [ ] Configure rate limiting for production
- [ ] Enable CORS for production domains only

## Security

This project follows security best practices and undergoes regular security audits.

**Security Status**: Production dependencies 100% secure

For detailed information about:
- Known security considerations
- Security best practices
- Vulnerability reporting
- Audit history

See **[SECURITY.md](./SECURITY.md)**

## License

MIT
