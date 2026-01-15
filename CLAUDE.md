# Project Rules for Claude

> This file is automatically loaded by Claude Code at the start of each conversation.
> For detailed rules, see `.claude/rules/` directory.

## Safe Editing Rules (CRITICAL)

- Assume this is a **production project**. No destructive or experimental changes.
- Keep changes **small and focused**.
- Do NOT change existing function signatures, exports, or imports unless explicitly asked.
- Preserve existing behavior for: Auth, Core business flows, Payment flows.
- If introducing a breaking change, **call it out clearly**.
- Add `// TODO:` comments for ambiguous or incomplete sections.
- Do NOT add noisy debug logs.

---

## Stack Overview

### Server (`server/`)
- **Runtime**: Node.js 20+ LTS
- **Framework**: Fastify
- **Language**: TypeScript (strict mode)
- **Database**: MySQL + Prisma ORM
- **Cache/Queue**: Redis + BullMQ
- **Validation**: Zod
- **Testing**: Vitest

### Client (`client/`)
- **Framework**: React 18+ with Vite
- **UI Library**: Ant Design
- **State**: Redux Toolkit + React Query
- **Language**: TypeScript (strict mode)
- **Styling**: CSS Modules / Tailwind

---

## Server Architecture

### File Structure
```
server/src/
├── app.ts              # Fastify instance & plugin registration
├── server.ts           # Server bootstrap (listen call only)
├── config/             # env, constants
├── libs/               # Shared: db, redis, logger, auth
├── plugins/            # Fastify plugins
├── hooks/              # Fastify hooks
├── routes/             # Standalone routes (health, etc.)
└── modules/<domain>/   # Domain modules
    ├── <domain>.routes.ts
    ├── <domain>.controller.ts
    ├── <domain>.service.ts
    ├── <domain>.repo.ts
    ├── <domain>.schemas.ts
    └── <domain>.types.ts
```

### Layered Architecture
```
Routes → Controllers → Services → Repositories → DB
```

- **Controllers**: HTTP handlers only, no business logic
- **Services**: Business logic, throw typed `AppError` instances
- **Repositories**: Database queries only

### Response Contract (MANDATORY)

**Success Response:**
```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

- Use `successResponse()` helper in controllers
- Throw typed errors (`BadRequestError`, `NotFoundError`, etc.)
- NEVER expose stack traces or internal errors to clients

### Error Types
- `BadRequestError`, `ValidationError`, `UnauthorizedError`
- `ForbiddenError`, `NotFoundError`, `ConflictError`, `InternalError`

---

## Client Architecture

### File Structure
```
client/src/
├── app/                # App config (App.tsx, router, providers)
├── components/
│   ├── layout/         # Header, Footer, Sidebar, MainLayout
│   └── common/         # Shared components
├── features/<domain>/  # Feature modules
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── store/
│   ├── types/
│   └── utils/
├── hooks/              # Global hooks
├── lib/
│   ├── api/            # Axios config, API types
│   ├── constants/      # routes, api-endpoints, app.constants
│   └── utils/
├── store/              # Redux store
├── types/              # Global types
└── styles/
```

### Naming Conventions
- **Components**: `PascalCase.tsx` (e.g., `ResourceCard.tsx`)
- **Pages**: `PascalCase + Page.tsx` (e.g., `ResourcesPage.tsx`)
- **Hooks**: `use<Name>.ts` (e.g., `useAuth.ts`)
- **Services**: `<domain>.service.ts`
- **Types**: `<domain>.types.ts`

### TypeScript Rules
- **NO `any` type** - use `unknown` if needed
- Explicit return types for all functions
- Use `interface` for props/objects, `type` for unions/intersections

### API Response Types (must match backend)
```tsx
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface PaginatedApiResponse<T> {
  success: boolean;
  message: string;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}
```

---

## Coding Style (Both)

- Prefer `async/await` over `.then()`
- Prefer named exports (except `app.ts` and React pages)
- Use path aliases: `@/`, `@/libs/`, `@/modules/`, etc.
- Never `console.log` in production code - use the shared `logger`

---

## Package Manager Detection

- `pnpm-lock.yaml` exists → use `pnpm`
- `yarn.lock` exists → use `yarn`
- Otherwise → use `npm`

---

## When Implementing Features

1. Summarize what needs to be done
2. List files to be created/modified
3. Provide code for each file
4. Mention any migrations or env variables needed
5. If unsure, state assumptions clearly

---

## Detailed Rules

For comprehensive rules, read the appropriate files in `.claude/rules/`:

**Server:**
- `server-02-general-rules.md` - Architecture & code style
- `server-05-project-conventions.md` - File structure & conventions
- `server-06-response-handling.md` - Error & success responses

**Client:**
- `client-01-project-structure.md` - File structure & naming
- `client-03-typescript-rules.md` - TypeScript conventions

**Global:**
- `global-ai-edit-safety.md` - Safe editing practices
