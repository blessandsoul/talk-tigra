---
trigger: always_on
---

> **SCOPE**: These rules apply specifically to the **client** directory.

# API Integration & Error Handling

## Axios Configuration
Standard pattern for interceptors and token management.

```tsx
// lib/api/axios.config.ts
import axios from 'axios';
import { store } from '@/store';
import { logout, updateTokens } from '@/features/auth/store/authSlice';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.tokens?.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

## Service Pattern
Use classes or plain objects to group API calls by domain.

```tsx
// features/resources/services/resource.service.ts
class ResourceService {
  async getResources(params = {}) {
    const response = await apiClient.get('/resources', { params });
    return response.data.data;
  }
}
export const resourceService = new ResourceService();
```

## Error Handling Utilities

```tsx
// lib/utils/error.ts
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message || error.message;
  }
  return 'An unexpected error occurred';
};
```

## UI Feedback (Ant Design)

### Error Components
```tsx
// components/common/ErrorMessage.tsx
import { Alert } from 'antd';
import { getErrorMessage } from '@/lib/utils/error';

export const ErrorMessage = ({ error }: { error: any }) => (
  <Alert
    message="Error"
    description={getErrorMessage(error)}
    type="error"
    showIcon
  />
);
```

### Loading States
```tsx
// components/common/LoadingSpinner.tsx
import { Spin } from 'antd';

export const LoadingSpinner = () => (
  <div className="spinner-container">
    <Spin size="large" />
  </div>
);
```

### Skeleton (Ant Design)
```tsx
// components/common/ResourceSkeleton.tsx
import { Skeleton, Card } from 'antd';

export const ResourceSkeleton = () => (
  <Card>
    <Skeleton active />
  </Card>
);
```

## Notifications (Ant Design)
Use `message` or `notification` from Ant Design.

```tsx
import { message } from 'antd';

// Success
message.success('Action completed!');

// Error
message.error(getErrorMessage(error));
```

## File Upload Pattern
```tsx
// features/resources/hooks/useUploadFiles.ts
export const useUploadFiles = () => {
  return useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      return apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  });
};
```

## Infinite Scroll Pattern
Standard React Query `useInfiniteQuery` implementation with Ant Design's `Button` for "Load More" or a custom observer.
