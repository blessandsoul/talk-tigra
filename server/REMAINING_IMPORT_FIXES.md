# Final Import Fix Guide - Remaining 9 Files

## Completed So Far (11/20)
1. ✅ server.ts
2. ✅ app.ts
3. ✅ libs/db.ts
4. ✅ libs/redis.ts
5. ✅ libs/queue.ts
6. ✅ libs/error-handler.ts
7. ✅ libs/auth/authenticate.middleware.ts
8. ✅ libs/auth/rbac.middleware.ts
9. ✅ hooks/request-timing.hook.ts
10. ✅ plugins/security.plugin.ts
11. ✅ (Continue from here)

## Remaining Files - Exact Changes Needed

### 1. plugins/rate-limit.plugin.ts
**File location:** `src/plugins/rate-limit.plugin.ts`

**Changes:**
- Line 3: `from '@/libs/redis'` → `from '../libs/redis.js'`
- Line 4: `from '@/config/env'` → `from '../config/env.js'`

### 2. routes/health.routes.ts
**File location:** `src/routes/health.routes.ts`

**Changes:**
- Line 2: `from '@/libs/db'` → `from '../libs/db.js'`
- Line 3: `from '@/libs/redis'` → `from '../libs/redis.js'`

### 3. workers/file.worker.ts
**File location:** `src/workers/file.worker.ts`

**Changes:**
- Line 11: `from '@/libs/redis'` → `from '../libs/redis.js'`
- Line 12: `from '@/libs/logger'` → `from '../libs/logger.js'`

### 4. types/fastify.d.ts
**File location:** `src/types/fastify.d.ts`

**Changes:**
- `from '@/modules/auth/auth.types'` → `from '../modules/auth/auth.types.js'`
- `from '@/libs/auth/rbac.middleware'` → `from '../libs/auth/rbac.middleware.js'`

### 5. modules/auth/auth.controller.ts
**File location:** `src/modules/auth/auth.controller.ts`

**Changes:**
- `from '@/utils/response'` → `from '../../utils/response.js'`
- `from '@/utils/errors'` → `from '../../utils/errors.js'`
- `from './auth.service'` → `from './auth.service.js'`
- `from './auth.repo'` → `from './auth.repo.js'`
- `from './auth.schemas'` → `from './auth.schemas.js'` (appears twice)

### 6. modules/auth/auth.service.ts
**File location:** `src/modules/auth/auth.service.ts`

**Changes:**
- `from '@/config/env'` → `from '../../config/env.js'`
- `from '@/libs/logger'` → `from '../../libs/logger.js'`
- `from '@/utils/errors'` → `from '../../utils/errors.js'`
- `from './auth.repo'` → `from './auth.repo.js'`
- `from './auth.types'` → `from './auth.types.js'`
- `from './auth.schemas'` → `from './auth.schemas.js'`

### 7. modules/auth/auth.repo.ts
**File location:** `src/modules/auth/auth.repo.ts`

**Changes:**
- `from '@/libs/db'` → `from '../../libs/db.js'`
- `from './auth.types'` → `from './auth.types.js'`

### 8. modules/admin/admin.controller.ts
**File location:** `src/modules/admin/admin.controller.ts`

**Changes:**
- `from '@/utils/response'` → `from '../../utils/response.js'`
- `from '@/utils/errors'` → `from '../../utils/errors.js'`
- `from './admin.service'` → `from './admin.service.js'`
- `from './admin.schemas'` → `from './admin.schemas.js'`

### 9. modules/admin/admin.service.ts
**File location:** `src/modules/admin/admin.service.ts`

**Changes:**
- `from '@/libs/db'` → `from '../../libs/db.js'`
- `from '@/utils/errors'` → `from '../../utils/errors.js'`
- `from '@/libs/logger'` → `from '../../libs/logger.js'`

### 10. modules/resources/resources.controller.ts
**File location:** `src/modules/resources/resources.controller.ts`

**Changes:**
- `from '@/utils/response'` → `from '../../utils/response.js'`
- `from '@/utils/pagination'` → `from '../../utils/pagination.js'`
- `from './resources.service'` → `from './resources.service.js'`
- `from './resources.schemas'` → `from './resources.schemas.js'` (appears twice)

### 11. modules/resources/resources.service.ts
**File location:** `src/modules/resources/resources.service.ts`

**Changes:**
- `from '@/libs/logger'` → `from '../../libs/logger.js'`
- `from '@/utils/errors'` → `from '../../utils/errors.js'`
- `from './resources.repo'` → `from './resources.repo.js'`
- `from './resources.types'` → `from './resources.types.js'`
- `from './resources.schemas'` → `from './resources.schemas.js'`

### 12. modules/resources/resources.repo.ts
**File location:** `src/modules/resources/resources.repo.ts`

**Changes:**
- `from '@/libs/db'` → `from '../../libs/db.js'`
- `from './resources.types'` → `from './resources.types.js'`
- `from './resources.schemas'` → `from './resources.schemas.js'`

## Pattern Summary

### For files in `src/` (depth 0):
- `@/config/*` → `./config/*.js`
- `@/libs/*` → `./libs/*.js`
- `@/modules/*` → `./modules/*.js`

### For files in `src/subfolder/` (depth 1):
- `@/config/*` → `../config/*.js`
- `@/libs/*` → `../libs/*.js`
- `@/modules/*` → `../modules/*.js`
- `@/utils/*` → `../utils/*.js`

### For files in `src/subfolder/subfolder/` (depth 2):
- `@/config/*` → `../../config/*.js`
- `@/libs/*` → `../../libs/*.js`
- `@/utils/*` → `../../utils/*.js`
- `./file` → `./file.js`

## After Completing All Fixes

1. Delete `.tsc-aliasrc.json`
2. Run `npm run build` to test compilation
3. Fix any remaining errors
4. Run `npm start` to test execution

## Quick Test Command
```powershell
# From template/server directory
npm run build
```

If build succeeds, all imports are correctly fixed!
