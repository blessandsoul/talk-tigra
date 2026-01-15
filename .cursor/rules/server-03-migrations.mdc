---
trigger: always_on
globs: "server/**/*"
---

> **SCOPE**: These rules apply specifically to the **server** directory.

# Migration Rules for AI Agent

CRITICAL: When user asks for schema changes:

1. ALWAYS edit `prisma/schema.prisma` first
2. THEN run: `npm run prisma:migrate dev --name descriptive_name`
3. IF migration fails with conflicts:
   - DON'T try to fix manually
   - DO run: `npm run prisma:reset`
   - Then: `npm run prisma:seed`
4. NEVER use `prisma db push` unless explicitly asked

Development = use prisma:reset freely
Production = ONLY use prisma:migrate deploy
