---
trigger: always_on
---

> **SCOPE**: These rules apply specifically to the **client** directory.

# State Management Patterns

## State Strategy

### Decision Matrix

| State Type | Tool | Examples |
|------------|------|----------|
| **Server Data** | React Query | Resources, profiles, application data from API |
| **Global Client** | Redux | Auth tokens, current user, theme settings |
| **Local** | useState | Form inputs, modals, hover state, toggles |
| **URL** | React Router | Filters, pagination, search query |

## React Query (Server State)

### Setup

```tsx
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

---

## Query Key Factory Pattern (MANDATORY)

**Why?** Consistent query keys prevent cache bugs and enable powerful invalidation patterns.

### Factory Structure

```tsx
// features/resources/lib/query-keys.ts

export const resourceKeys = {
  // Base key
  all: ['resources'] as const,
  
  // List queries
  lists: () => [...resourceKeys.all, 'list'] as const,
  list: (filters: ResourceFilters) => [...resourceKeys.lists(), filters] as const,
  
  // Detail queries
  details: () => [...resourceKeys.all, 'detail'] as const,
  detail: (id: string) => [...resourceKeys.details(), id] as const,
  
  // User-specific queries
  myResources: () => [...resourceKeys.all, 'my'] as const,
  myResource: (filters: ResourceFilters) => [...resourceKeys.myResources(), filters] as const,
};

// Usage in hooks
export const useResources = (filters: ResourceFilters) => {
  return useQuery({
    queryKey: resourceKeys.list(filters),
    queryFn: () => resourceService.getResources(filters),
  });
};

export const useResource = (id: string) => {
  return useQuery({
    queryKey: resourceKeys.detail(id),
    queryFn: () => resourceService.getResource(id),
    enabled: !!id, // Only fetch if ID exists
  });
};
```

### Complex Example (Categories with Resources)

```tsx
// features/categories/lib/query-keys.ts
export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters: CategoryFilters) => [...categoryKeys.lists(), filters] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
  
  // Nested resources
  resources: (categoryId: string) => [...categoryKeys.detail(categoryId), 'resources'] as const,
};
```

### Invalidation Patterns

```tsx
// After creating a resource
useMutation({
  mutationFn: resourceService.createResource,
  onSuccess: () => {
    // Invalidate all resource lists
    queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
  },
});

// After updating a specific resource
useMutation({
  mutationFn: ({ id, data }) => resourceService.updateResource(id, data),
  onSuccess: (_, variables) => {
    // Invalidate this specific resource
    queryClient.invalidateQueries({ queryKey: resourceKeys.detail(variables.id) });
    // Also invalidate lists (resource might move categories)
    queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
  },
});

// After deleting
useMutation({
  mutationFn: resourceService.deleteResource,
  onSuccess: () => {
    // Remove all resource-related queries
    queryClient.invalidateQueries({ queryKey: resourceKeys.all });
  },
});
```

---

## Query Pattern

```tsx
// features/resources/hooks/useResources.ts
import { useQuery } from '@tanstack/react-query';
import { resourceService } from '../services/resource.service';
import { resourceKeys } from '../lib/query-keys';

export const useResources = (filters = {}, page = 1, limit = 10) => {
  return useQuery({
    queryKey: resourceKeys.list({ ...filters, page, limit }),
    queryFn: () => resourceService.getResources({ ...filters, page, limit }),
    staleTime: 5 * 60 * 1000,
  });
};
```

## Mutation Pattern

```tsx
// features/resources/hooks/useCreateResource.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd'; // Ant Design message
import { resourceKeys } from '../lib/query-keys';

export const useCreateResource = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: resourceService.createResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
      message.success('Resource created!');
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });
};
```

## Optimistic Updates

```tsx
export const useToggleStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }) => resourceService.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: resourceKeys.detail(id) });
      
      // Snapshot previous value
      const previous = queryClient.getQueryData(resourceKeys.detail(id));
      
      // Optimistically update
      queryClient.setQueryData(resourceKeys.detail(id), (old: any) => ({ 
        ...old, 
        status 
      }));
      
      return { previous, id };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(resourceKeys.detail(context.id), context.previous);
      }
      message.error('Failed to update status');
    },
    onSettled: (data, error, variables) => {
      // Refetch to ensure sync
      queryClient.invalidateQueries({ queryKey: resourceKeys.detail(variables.id) });
    },
  });
};
```

---

## Redux (Global Client State)

### When to Use Redux
- Authentication state (user, tokens)
- Global UI state (theme, sidebar collapsed)
- App-wide settings

### Slice Pattern
Standard Redux Toolkit pattern for auth and global UI state.

```tsx
// features/auth/store/authSlice.ts
import { createSlice } from '@reduxjs/toolkit';

interface AuthState {
  user: User | null;
  tokens: { accessToken: string; refreshToken: string } | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.tokens = action.payload.tokens;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.tokens = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
```

---

## Local State
Use `useState` for UI-only state (e.g., `isModalOpen`, form inputs before submission).

```tsx
export const ResourceCard = ({ resource }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* UI */}
    </div>
  );
};
```

---

## URL State
Use `useSearchParams` from `react-router-dom` for filters and pagination to ensure page refreshes and direct links work as expected.

```tsx
import { useSearchParams } from 'react-router-dom';

export const ResourcesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const page = parseInt(searchParams.get('page') || '1');
  const category = searchParams.get('category') || '';
  
  const handleFilterChange = (newCategory: string) => {
    setSearchParams({ page: '1', category: newCategory });
  };
  
  const { data } = useResources({ category }, page);
  
  return (
    <div>
      <CategoryFilter value={category} onChange={handleFilterChange} />
      <ResourceList resources={data?.items} />
      <Pagination 
        current={page} 
        total={data?.pagination.totalPages}
        onChange={(newPage) => setSearchParams({ page: String(newPage), category })}
      />
    </div>
  );
};
```

---

## Advanced Query Patterns

### Dependent Queries
```tsx
export const useResourceWithOwner = (resourceId: string) => {
  // First fetch resource
  const { data: resource } = useQuery({
    queryKey: resourceKeys.detail(resourceId),
    queryFn: () => resourceService.getResource(resourceId),
  });
  
  // Then fetch owner (depends on resource)
  const { data: owner } = useQuery({
    queryKey: ['users', resource?.ownerId],
    queryFn: () => userService.getUser(resource!.ownerId),
    enabled: !!resource?.ownerId, // Only run when we have ownerId
  });
  
  return { resource, owner };
};
```

### Parallel Queries
```tsx
export const useDashboardData = () => {
  const resources = useQuery({
    queryKey: resourceKeys.lists(),
    queryFn: resourceService.getResources,
  });
  
  const categories = useQuery({
    queryKey: categoryKeys.lists(),
    queryFn: categoryService.getCategories,
  });
  
  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: statsService.getStats,
  });
  
  return {
    isLoading: resources.isLoading || categories.isLoading || stats.isLoading,
    data: {
      resources: resources.data,
      categories: categories.data,
      stats: stats.data,
    },
  };
};
```

### Infinite Queries (Load More)
```tsx
export const useInfiniteResources = (filters: ResourceFilters) => {
  return useInfiniteQuery({
    queryKey: [...resourceKeys.lists(), 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => 
      resourceService.getResources({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasNextPage ? lastPage.pagination.page + 1 : undefined,
  });
};

// Usage in component
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteResources(filters);

<Button onClick={() => fetchNextPage()} disabled={!hasNextPage} loading={isFetchingNextPage}>
  Load More
</Button>
```

---

## Anti-Patterns

### ❌ DO NOT:
```tsx
// Don't store server data in Redux
const dispatch = useDispatch();
const resources = await resourceService.getResources();
dispatch(setResources(resources)); // BAD

// Don't use string literals for query keys
useQuery(['resources'], () => ...); // BAD - inconsistent

// Don't forget to invalidate after mutations
useMutation({
  mutationFn: createResource,
  // Missing onSuccess invalidation - cache will be stale!
});
```

### ✅ DO:
```tsx
// Use React Query for server data
const { data: resources } = useQuery({
  queryKey: resourceKeys.lists(),
  queryFn: resourceService.getResources,
});

// Always use query key factories
queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });

// Always invalidate after mutations
useMutation({
  mutationFn: createResource,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });
  },
});
```

---

## Prefetching Data

```tsx
export const ResourcesPage = () => {
  const queryClient = useQueryClient();
  
  // Prefetch next page on hover
  const handleResourceHover = (id: string) => {
    queryClient.prefetchQuery({
      queryKey: resourceKeys.detail(id),
      queryFn: () => resourceService.getResource(id),
    });
  };
  
  return (
    <div>
      {resources.map((resource) => (
        <ResourceCard 
          key={resource.id}
          resource={resource}
          onMouseEnter={() => handleResourceHover(resource.id)}
        />
      ))}
    </div>
  );
};
```

---

## Checklist

- [ ] Query key factories created for all domains
- [ ] React Query for all server data
- [ ] Redux ONLY for auth and global UI state
- [ ] URL state for filters/pagination
- [ ] Proper invalidation after mutations
- [ ] Optimistic updates for instant feedback
- [ ] Error handling in mutations
- [ ] Loading states handled in UI
