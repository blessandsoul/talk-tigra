# Remaining Import Fixes

This document lists all remaining files that need @/ imports converted to relative .js imports.

## Files Fixed So Far (8/20)
1. ✅ server.ts
2. ✅ app.ts
3. ✅ libs/db.ts
4. ✅ libs/redis.ts
5. ✅ libs/queue.ts
6. ✅ libs/error-handler.ts
7. ✅ libs/auth/authenticate.middleware.ts

## Remaining Files (12)

### libs/auth/rbac.middleware.ts
- `from '@/utils/errors'` → `from '../../utils/errors.js'`

### hooks/request-timing.hook.ts
- `from '@/config/env'` → `from '../config/env.js'`

### plugins/security.plugin.ts
- `from '@/config/env'` → `from '../config/env.js'`

### plugins/rate-limit.plugin.ts
- `from '@/libs/redis'` → `from '../libs/redis.js'`
- `from '@/config/env'` → `from '../config/env.js'`

### routes/health.routes.ts
- `from '@/libs/db'` → `from '../libs/db.js'`
- `from '@/libs/redis'` → `from '../libs/redis.js'`

### workers/file.worker.ts
- `from '@/libs/redis'` → `from '../libs/redis.js'`
- `from '@/libs/logger'` → `from '../libs/logger.js'`

### types/fastify.d.ts
- `from '@/modules/auth/auth.types'` → `from '../modules/auth/auth.types.js'`
- `from '@/libs/auth/rbac.middleware'` → `from '../libs/auth/rbac.middleware.js'`

### modules/auth/auth.controller.ts
- `from '@/utils/response'` → `from '../../utils/response.js'`
- `from '@/utils/errors'` → `from '../../utils/errors.js'`
- `from './auth.service'` → `from './auth.service.js'`
- `from './auth.repo'` → `from './auth.repo.js'`
- `from './auth.schemas'` → `from './auth.schemas.js'` (appears twice)

### modules/auth/auth.service.ts
- `from '@/config/env'` → `from '../../config/env.js'`
- `from '@/libs/logger'` → `from '../../libs/logger.js'`
- `from '@/utils/errors'` → `from '../../utils/errors.js'`
- `from './auth.repo'` → `from './auth.repo.js'`
- `from './auth.types'` → `from './auth.types.js'`
- `from './auth.schemas'` → `from './auth.schemas.js'`

### modules/auth/auth.repo.ts
- `from '@/libs/db'` → `from '../../libs/db.js'`
- `from './auth.types'` → `from './auth.types.js'`

### modules/auth/auth.service.test.ts
- `from '@/config/env'` → `from '../../config/env.js'`
- `from '@/utils/errors'` → `from '../../utils/errors.js'`

### modules/admin/admin.controller.ts
- `from '@/utils/response'` → `from '../../utils/response.js'`
- `from '@/utils/errors'` → `from '../../utils/errors.js'`
- `from './admin.service'` → `from './admin.service.js'`
- `from './admin.schemas'` → `from './admin.schemas.js'`

### modules/admin/admin.service.ts
- `from '@/libs/db'` → `from '../../libs/db.js'`
- `from '@/utils/errors'` → `from '../../utils/errors.js'`
- `from '@/libs/logger'` → `from '../../libs/logger.js'`

### modules/resources/resources.controller.ts
- `from '@/utils/response'` → `from '../../utils/response.js'`
- `from '@/utils/pagination'` → `from '../../utils/pagination.js'`
- `from './resources.service'` → `from './resources.service.js'`
- `from './resources.schemas'` → `from './resources.schemas.js'` (appears twice)

### modules/resources/resources.service.ts
- `from '@/libs/logger'` → `from '../../libs/logger.js'`
- `from '@/utils/errors'` → `from '../../utils/errors.js'`
- `from './resources.repo'` → `from './resources.repo.js'`
- `from './resources.types'` → `from './resources.types.js'`
- `from './resources.schemas'` → `from './resources.schemas.js'`

### modules/resources/resources.repo.ts
- `from '@/libs/db'` → `from '../../libs/db.js'`
- `from './resources.types'` → `from './resources.types.js'`
- `from './resources.schemas'` → `from './resources.schemas.js'`

## After Fixing All Imports

1. Delete `.tsc-aliasrc.json` (no longer needed)
2. Remove `tsc-alias` from devDependencies in package.json
3. Test build: `npm run build`
4. Test run: `npm start`
