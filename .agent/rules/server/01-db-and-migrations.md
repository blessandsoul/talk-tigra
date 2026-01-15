---
trigger: always_on
---

> **SCOPE**: These rules apply specifically to the **server** directory.

# API Server – Database & Migrations Rules

## 🎯 Core Principles

- **Primary Database**: MySQL 8.0+
- **ORM**: Prisma (version 6.x - DO NOT upgrade to 7.x without testing)
- **Migration Philosophy**: 
  - Development: Fast iteration with resets
  - Production: Safe, forward-only migrations
- **Schema Source of Truth**: `prisma/schema.prisma`

---

## 🚫 CRITICAL RULES - NEVER BREAK THESE

### Rule 1: NO Manual Schema Changes
❌ **NEVER** run raw SQL to change schema (CREATE TABLE, ALTER TABLE, etc.)  
✅ **ALWAYS** use Prisma migrations for schema changes  
✅ **EXCEPTION**: Data changes (INSERT, UPDATE, DELETE) can be raw SQL

### Rule 2: Development vs Production Workflows
**Development** (when iterating on schema):
```bash
npm run prisma:reset        # Drops everything, reruns migrations
npm run prisma:seed         # Repopulate test data
```

**Production** (deployed servers):
```bash
npm run prisma:migrate deploy   # Only applies new migrations, NEVER resets
```

### Rule 3: Migration Conflicts = Reset
When you get migration errors in **development**:
- ❌ DON'T try to fix migration files manually
- ❌ DON'T delete migration folders
- ✅ DO run `npm run prisma:reset` to start clean

### Rule 4: Never Use `prisma db push` in Production
- `prisma db push` = Quick prototyping, no migration history
- `prisma migrate dev` = Proper migrations with history
- Use `db push` ONLY when rapidly prototyping new features

---

## 📁 Naming Conventions

### Tables
- Format: `snake_case` plural
- Examples: `users`, `posts`, `categories`

### Columns
- Format: `snake_case`
- Timestamps: `created_at`, `updated_at`, `deleted_at`
- Foreign keys: `<table_singular>_id`
  - Example: `user_id`, `category_id`

### Prisma Models
- Format: `PascalCase` singular
- Example: `User`, `Post`, `Category`

---

## 🗄️ Required Fields for Every Table

Every main entity table MUST have:
```prisma
model EntityName {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Optional but recommended:
```prisma
  deletedAt DateTime?  // For soft deletes
  isActive  Boolean @default(true)  // For disabling without deleting
```

---

## 🔗 Architecture Relationships

### Core Entities (Example)
```
users (1) ──→ (many) posts
users (1) ──→ (1) profiles
categories (1) ──→ (many) posts
```

### Media Attachments
For images/files attached to multiple entity types:
```prisma
model Media {
  id         String @id @default(uuid())
  entityType String // 'post', 'user', 'product'
  entityId   String // ID of the related entity
  url        String
  type       String // 'image', 'video', 'document'
  order      Int    // For sorting galleries
  
  @@index([entityType, entityId])
}
```

---

## ⚡ Indexing Strategy

### Always Index These:
1. **Foreign Keys** - Prisma auto-indexes, but verify:
```prisma
   @@index([userId])
```

2. **Filter Columns** - Fields used in WHERE clauses:
```prisma
   @@index([isActive])
   @@index([status])
```

3. **Composite Indexes** - Multiple columns filtered together:
```prisma
   @@index([categoryId, isActive])
```

4. **Unique Constraints** - Business logic requirements:
```prisma
   @@unique([email])
   @@unique([slug])
```

### When NOT to Index:
- Low-cardinality boolean fields used alone (e.g., `isActive` by itself)
- Text/blob columns
- Fields never used in WHERE/ORDER BY

---

## 🔄 Migration Workflow

### When Making Schema Changes:

#### Step 1: Edit `prisma/schema.prisma`
```prisma
model Resource {
  id          String   @id @default(uuid())
  title       String
  description String?  @db.Text  // NEW FIELD
  // ... rest of fields
}
```

#### Step 2: Create Migration (Development)
```bash
# Option A: With descriptive name
npm run prisma:migrate dev --name add_resource_description

# Option B: If migration conflicts occur
npm run prisma:reset  # Nuclear option - drops everything
npm run prisma:seed   # Repopulate test data
```

---

## 🚀 Production Deployment Workflow

### Pre-Deployment Checklist:
1. ✅ All migrations tested locally
2. ✅ Seed data runs successfully
3. ✅ No pending schema changes in `schema.prisma`
4. ✅ Migration files committed to git

### Deployment Commands:
```bash
# On production server:
npm run prisma:migrate deploy  # Applies pending migrations only
npm run prisma:generate        # Regenerates client with new schema
npm start                      # Restart application
```

---

## 📊 Data Integrity Rules

### Foreign Keys
- ✅ **USE** foreign keys for core relationships
- ✅ **USE** `onDelete: Cascade` for dependent data
```prisma
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
```

### Soft Deletes
Prefer soft deletes for user-generated content:
```prisma
model Resource {
  deletedAt DateTime?
  // Query helper: where: { deletedAt: null }
}
```

---

## 🛠️ Troubleshooting Guide

### Issue: "Environment variable not found: DATABASE_URL"
**Solution:**
```bash
# Verify .env exists and has:
DATABASE_URL="mysql://user:pass@localhost:3306/dbname"
```

### Issue: "Prisma Client is not generated"
**Solution:**
```bash
npm run prisma:generate
```

---

## 🎯 Best Practices Summary

### ✅ DO:
- Use Prisma migrations for ALL schema changes
- Reset database freely in development
- Test migrations in staging before production
- Add indexes for frequently queried fields
- Use soft deletes for user content
- Commit migration files to git

### ❌ DON'T:
- Manually edit database schema
- Use `prisma:reset` in production
- Skip migrations and use `db push` in production
- Delete migration files
