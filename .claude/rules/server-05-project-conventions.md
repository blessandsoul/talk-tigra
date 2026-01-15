---
trigger: always_on
globs: "server/**/*"
---

> **SCOPE**: These rules apply specifically to the **server** directory.

# API Server – Project Conventions

## Package manager

- Detect the package manager from the lockfile:
  - If `pnpm-lock.yaml` exists → use `pnpm`
  - If `yarn.lock` exists → use `yarn`
  - Else → use `npm`

## File & folder structure

- Keep everything under `src/`.
- Prefer this layout:

  - `src/app.ts` → Fastify instance and plugin registration
  - `src/server.ts` → actual `listen()` call, no app logic
  - `src/config/` → env, config, constants
  - `src/libs/` → shared libraries (db, redis, logger, auth)
  - `src/modules/<domain>/` → domain modules:
    - `<domain>.routes.ts`
    - `<domain>.controller.ts`
    - `<domain>.service.ts`
    - `<domain>.repo.ts`
    - `<domain>.schemas.ts`
    - `<domain>.types.ts` (if needed)

- When adding new modules, stick to `src/modules/<name>/` and keep the exact naming pattern.

## Coding style

- Use TypeScript with `strict` mode ON.
- Prefer `async/await` over `.then()`.
- Prefer named exports over default exports, except for:
  - `src/app.ts` → default export is the Fastify instance
  - Frontend components (if any).
- Use consistent import paths:
  - Use relative imports inside a module: `./user.service`
  - Use aliased imports for cross-module paths if configured (e.g. `@modules/users/...`).

## Error handling

- Controllers must never throw raw errors; they should:
  - Either use a shared error helper, or
  - Let Fastify’s error handler handle typed errors.
- Never `console.log` for production logic:
  - Use the shared `logger` from `src/libs/logger`.

## API versioning & routes

- All API routes must be prefixed with `/api/v1`.
- Group routes by domain:
  - `/api/v1/auth/...`
  - `/api/v1/users/...`
  - `/api/v1/<domain_resource>/...`
- When adding new routes, register them in a Fastify plugin under `src/modules/<domain>/<domain>.routes.ts`.

## Service Layer Rules

- Every domain module must include a `<domain>.service.ts` file.
- Services contain all business logic and must NOT depend on Fastify, reply, request, or HTTP-specific concepts.
- Controllers must call services instead of performing logic directly.
- Services may call repositories for DB operations.
- Services must throw typed AppError instances for failures.
- Services must not return success or error responses; they only return data or throw errors.
- Services must be stateless and reusable.
