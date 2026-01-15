---
trigger: always_on
---

> **SCOPE**: These rules apply specifically to the **client** directory.

# Project Structure & File Naming

## Folder Structure

```
src/
├── app/                    # App configuration
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
├── components/
│   ├── layout/            # Header, Footer, MainLayout
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── MainLayout.tsx
│   └── common/            # Shared components
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       ├── ProtectedRoute.tsx
│       ├── Pagination.tsx
│       └── EmptyState.tsx
├── features/              # Feature modules (domain-driven)
│   ├── auth/
│   │   ├── components/    # LoginForm, RegisterForm
│   │   ├── hooks/         # useAuth, useLogin, useRegister
│   │   ├── pages/         # LoginPage, RegisterPage
│   │   ├── services/      # auth.service.ts
│   │   ├── store/         # authSlice.ts (Redux)
│   │   ├── types/         # auth.types.ts
│   │   └── utils/         # auth.utils.ts
│   ├── resources/         # Example feature
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   └── users/
├── hooks/                 # Global custom hooks
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   └── useMediaQuery.ts
├── lib/
│   ├── api/
│   │   ├── axios.config.ts
│   │   └── api.types.ts
│   ├── constants/
│   │   ├── routes.ts
│   │   ├── api-endpoints.ts
│   │   └── app.constants.ts
│   └── utils/
│       ├── format.ts
│       ├── validation.ts
│       └── error.ts
├── store/                 # Redux store
│   ├── index.ts
│   └── hooks.ts
├── types/                 # Global types
│   ├── index.ts
│   └── api.types.ts
└── styles/
    ├── globals.css        # Global CSS
    └── theme.css          # Ant Design custom theme (if needed)
```

## File Naming Rules

### Components
- **PascalCase**: `ResourceCard.tsx`, `LoginForm.tsx`
- **Pattern**: `<ComponentName>.tsx`
- **CSS**: If using CSS Modules, name as `<ComponentName>.module.css`

### Pages
- **PascalCase + Page suffix**: `ResourcesPage.tsx`, `LoginPage.tsx`
- **Pattern**: `<FeatureName>Page.tsx`

### Hooks
- **camelCase + use prefix**: `useAuth.ts`, `useResources.ts`
- **Pattern**: `use<HookName>.ts`

### Services
- **camelCase + .service suffix**: `auth.service.ts`, `resource.service.ts`
- **Pattern**: `<domain>.service.ts`

### Types
- **camelCase + .types suffix**: `auth.types.ts`, `resource.types.ts`
- **Pattern**: `<domain>.types.ts`

### Store (Redux)
- **camelCase + Slice suffix**: `authSlice.ts`, `resourceSlice.ts`
- **Pattern**: `<domain>Slice.ts`

### Utils
- **camelCase + .utils suffix**: `auth.utils.ts`, `date.utils.ts`
- **Pattern**: `<purpose>.utils.ts`

### Constants
- **camelCase**: `routes.ts`, `api-endpoints.ts`, `app.constants.ts`

## Module Structure Pattern

Every feature module follows this pattern:

```
features/<domain>/
├── components/         # Feature-specific components
├── hooks/             # Feature-specific hooks
├── pages/             # Feature pages (routes)
├── services/          # API service
├── store/             # Redux slice (if needed)
├── types/             # TypeScript types
└── utils/             # Feature utilities
```

## Import Path Aliases

```json
// tsconfig.json & vite.config.ts
{
  "paths": {
    "@/*": ["./src/*"],
    "@/components/*": ["./src/components/*"],
    "@/features/*": ["./src/features/*"],
    "@/lib/*": ["./src/lib/*"],
    "@/hooks/*": ["./src/hooks/*"],
    "@/store/*": ["./src/store/*"],
    "@/types/*": ["./src/types/*"],
    "@/styles/*": ["./src/styles/*"]
  }
}
```

## Import Order

```tsx
// 1. React and framework
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Third-party libraries (Ant Design first)
import { Button, Card, Input } from 'antd';
import { useQuery } from '@tanstack/react-query';

// 3. Styles
import './ResourceCard.css'; // or .module.css

// 4. Local components
import { ResourceCard } from '../components/ResourceCard';

// 5. Hooks
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useResources } from '../hooks/useResources';

// 6. Services
import { resourceService } from '../services/resource.service';

// 7. Types (always use 'type' keyword)
import type { Resource } from '../types/resource.types';

// 8. Utils
import { formatDate } from '@/lib/utils/format';
```

## Constants Structure

### API Endpoints

```tsx
// lib/constants/api-endpoints.ts
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    VERIFY_EMAIL: '/auth/verify-email',
    RESEND_VERIFICATION: '/auth/resend-verification',
    REQUEST_PASSWORD_RESET: '/auth/request-password-reset',
    RESET_PASSWORD: '/auth/reset-password',
  },
  USERS: {
    ME: '/users/me',
    UPDATE_ME: '/users/me',
    DELETE_ME: '/users/me',
  },
  RESOURCES: {
    LIST: '/resources',
    MY_RESOURCES: '/resources/my',
    CREATE: '/resources',
    GET: (id: string) => `/resources/${id}`,
    UPDATE: (id: string) => `/resources/${id}`,
    DELETE: (id: string) => `/resources/${id}`,
  },
} as const;
```

### Routes

```tsx
// lib/constants/routes.ts
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  RESOURCES: {
    LIST: '/resources',
    DETAILS: (id: string) => `/resources/${id}`,
    MY_RESOURCES: '/my-resources',
    CREATE: '/resources/create',
    EDIT: (id: string) => `/resources/${id}/edit`,
  },
} as const;
```

### App Constants

```tsx
// lib/constants/app.constants.ts
export const APP_NAME = 'My Application';

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

export const USER_ROLES = {
  USER: 'USER',
  ORG: 'ORGANIZATION',
  ADMIN: 'ADMIN',
} as const;

export const CURRENCIES = {
  GEL: 'GEL',
  USD: 'USD',
  EUR: 'EUR',
} as const;
```

## Naming Conventions

### Variables
- **camelCase**: `userName`, `resourceList`, `isLoading`

### Functions
- **camelCase**: `getUserData()`, `handleSubmit()`, `formatPrice()`

### Constants
- **UPPER_SNAKE_CASE**: `API_BASE_URL`, `MAX_FILE_SIZE`

### Types/Interfaces
- **PascalCase**: `User`, `Resource`, `ResourceFilters`
- **Interface prefix**: `IUser`, `IResource` (optional, be consistent)

### Enums/Type Unions
- **PascalCase**: `UserRole`, `ResourceStatus`

## Export Patterns

### Named Exports (Preferred)
```tsx
// ✅ GOOD
export const ResourceCard = () => {};
export const ResourceList = () => {};

// Import
import { ResourceCard, ResourceList } from './components';
```

### Default Export (Only for app.ts)
```tsx
// ❌ AVOID for components
export default ResourceCard;

// ✅ OK for App
export default App;
```

### Barrel Exports
```tsx
// features/resources/index.ts
export { ResourceCard } from './components/ResourceCard';
export { ResourceList } from './components/ResourceList';
export { useResources } from './hooks/useResources';
export { resourceService } from './services/resource.service';
export type * from './types/resource.types';

// Usage
import { ResourceCard, useResources, resourceService } from '@/features/resources';
```

## Environment Variables

```env
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=My Application

# .env.production
VITE_API_BASE_URL=https://api.myapplication.com/api/v1
VITE_APP_NAME=My Application
```

**Rules:**
- Prefix with `VITE_` to expose to client
- Never commit `.env` files
- Always provide `.env.example`

```tsx
// Accessing env variables
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;
```
