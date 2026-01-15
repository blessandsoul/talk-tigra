---
trigger: always_on
globs: "client/**/*"
---

> **SCOPE**: These rules apply specifically to the **client** directory.

# TypeScript Rules & Types

## TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Strict Mode Rules

- **Always use strict mode**
- **NO `any` type** (use `unknown` if needed)
- **Explicit return types** for functions
- **No implicit any**

```tsx
// ❌ BAD
const fetchResource = async (id) => {
  const response = await api.get(`/resources/${id}`);
  return response.data;
};

// ✅ GOOD
const fetchResource = async (id: string): Promise<Resource> => {
  const response = await api.get<ApiResponse<Resource>>(`/resources/${id}`);
  return response.data.data;
};
```

## Type vs Interface

### Use `interface` for:
- Component props
- Object shapes
- Extendable structures

### Use `type` for:
- Unions
- Intersections
- Utility types
- Type aliases

```tsx
// ✅ Interface for props
interface ResourceCardProps {
  resource: Resource;
  onClick?: () => void;
}

// ✅ Type for unions
type UserRole = 'USER' | 'ORG' | 'ADMIN';
type ResourceStatus = 'active' | 'inactive' | 'deleted';

// ✅ Type for intersections
type ResourceWithOwner = Resource & { owner: User };
```

## API Response Types

Match backend response structure:

```tsx
// lib/api/api.types.ts

// Base response
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Paginated response
export interface PaginatedApiResponse<T> {
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

// Error response
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
```

## Domain Types

Create types matching backend entities:

```tsx
// features/resources/types/resource.types.ts

export interface Resource {
  id: string;
  ownerId: string;
  title: string;
  summary: string | null;
  price: number;
  status: ResourceStatus;
  createdAt: string;
  updatedAt: string;
}

export type ResourceStatus = 'active' | 'inactive' | 'deleted';

// Request types
export interface CreateResourceRequest {
  title: string;
  summary?: string;
  price: number;
}
```

## Function Type Signatures

```tsx
// Event handlers
type ClickHandler = (event: React.MouseEvent<HTMLElement>) => void;
type ChangeHandler = (event: React.ChangeEvent<HTMLInputElement>) => void;

// Async functions
type AsyncFunction<T> = () => Promise<T>;
```

## Component Prop Types

```tsx
// Base component props
interface BaseComponentProps {
  className?: string; // Standard for CSS and Ant Design
  children?: React.ReactNode;
}

// With generic data
interface DataComponentProps<T> extends BaseComponentProps {
  data: T;
  onSelect?: (item: T) => void;
}
```

## Type Guards

```tsx
// Type guard functions
export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    error.success === false
  );
};
```

## Enum Alternatives (String Unions)

```tsx
// ✅ Use string unions + const object
export const USER_ROLES = {
  USER: 'USER',
  ORG: 'ORGANIZATION',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
```

## Discriminated Unions

```tsx
// State machine pattern
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

## Type Safety Checklist

- [ ] Strict mode enabled
- [ ] No `any` types used
- [ ] All functions have return types
- [ ] Props interfaces defined
- [ ] API response types match backend
- [ ] Domain types match backend models
- [ ] Type guards for runtime checks
- [ ] Discriminated unions for state machines
