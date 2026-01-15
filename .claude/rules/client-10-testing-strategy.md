---
trigger: always_on
globs: "client/**/*"
---

> **SCOPE**: These rules apply specifically to the **client** directory.

# Client Testing Strategy

## Stack

```json
{
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@testing-library/jest-dom": "^6.1.0",
    "msw": "^2.0.0"
  }
}
```

## Setup

```typescript
// src/test/setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);
afterEach(() => cleanup());

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});
```

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

## Test Utilities

```typescript
// src/test/utils.tsx
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

export function renderWithProviders(ui: React.ReactElement, options = {}) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>{children}</BrowserRouter>
        </QueryClientProvider>
      </Provider>
    );
  }

  return { ...render(ui, { wrapper: Wrapper, ...options }), queryClient };
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

## API Mocking (MSW)

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/v1/auth/login', async ({ request }) => {
    const { email, password } = await request.json();
    
    if (email === 'user@test.com' && password === 'password') {
      return HttpResponse.json({
        success: true,
        data: {
          user: { id: '1', email: 'user@test.com' },
          tokens: { accessToken: 'fake-token' },
        },
      });
    }
    
    return HttpResponse.json(
      { success: false, error: { code: 'INVALID_CREDENTIALS' } },
      { status: 401 }
    );
  }),

  http.get('/api/v1/resources', () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [
          { id: '1', title: 'Resource 1', price: 100 },
          { id: '2', title: 'Resource 2', price: 200 },
        ],
        pagination: { page: 1, totalPages: 1, hasNextPage: false },
      },
    });
  }),
];
```

```typescript
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```typescript
// src/test/setup.ts (add to existing)
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Testing Patterns

### 1. Component Tests

```typescript
// ResourceCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/utils';
import { ResourceCard } from './ResourceCard';

describe('ResourceCard', () => {
  const mockResource = {
    id: '1',
    title: 'Test Resource',
    price: 99.99,
  };

  it('renders resource information', () => {
    render(<ResourceCard resource={mockResource} />);
    
    expect(screen.getByText('Test Resource')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const { user } = render(
      <ResourceCard resource={mockResource} onClick={handleClick} />
    );
    
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith('1');
  });
});
```

### 2. Page/Container Tests

```typescript
// ResourcesPage.test.tsx
import { render, screen, waitFor } from '@/test/utils';

describe('ResourcesPage', () => {
  it('displays loading state initially', () => {
    render(<ResourcesPage />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders resources after loading', async () => {
    render(<ResourcesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Resource 1')).toBeInTheDocument();
    });
  });

  it('handles API errors', async () => {
    server.use(
      http.get('/api/v1/resources', () => {
        return HttpResponse.json(
          { success: false, error: { message: 'Error' } },
          { status: 500 }
        );
      })
    );
    
    render(<ResourcesPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### 3. Form Tests

```typescript
// ResourceForm.test.tsx
import userEvent from '@testing-library/user-event';

describe('ResourceForm', () => {
  it('submits valid form data', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();
    
    render(<ResourceForm onSubmit={handleSubmit} />);
    
    await user.type(screen.getByLabelText(/title/i), 'New Resource');
    await user.type(screen.getByLabelText(/price/i), '99.99');
    await user.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        title: 'New Resource',
        price: 99.99,
      });
    });
  });

  it('displays validation errors', async () => {
    const user = userEvent.setup();
    render(<ResourceForm onSubmit={vi.fn()} />);
    
    await user.click(screen.getByRole('button', { name: /submit/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });
});
```

### 4. Hook Tests

```typescript
// useResources.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useResources', () => {
  it('fetches resources successfully', async () => {
    const { result } = renderHook(() => useResources(), {
      wrapper: createWrapper(),
    });
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    
    expect(result.current.data).toHaveLength(2);
  });
});
```

### 5. User Flow Tests

```typescript
// login-flow.test.tsx
describe('Login Flow', () => {
  it('allows user to login', async () => {
    const user = userEvent.setup();
    render(<App />, { initialRoute: '/login' });
    
    await user.type(screen.getByLabelText(/email/i), 'user@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    });
  });
});
```

## Best Practices

### ✅ DO:
```typescript
// Test what user sees
expect(screen.getByText('Resource 1')).toBeInTheDocument();

// Use user-event for interactions
await user.click(screen.getByRole('button'));

// Wait for async updates
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

### ❌ DON'T:
```typescript
// Don't test implementation details
expect(component.state.isLoading).toBe(false); // BAD

// Don't use test IDs unnecessarily
screen.getByTestId('card'); // Prefer semantic queries

// Don't test third-party libraries
expect(mockRouter.navigate).toHaveBeenCalled(); // BAD
```

## Coverage Requirements

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Minimum:**
- Hooks: 80%
- Components: 70%
- Utils: 90%
- Overall: 70%

## Checklist

- [ ] Test setup configured (RTL + MSW)
- [ ] All critical user flows tested
- [ ] Forms validated and tested
- [ ] API mocking for endpoints
- [ ] 70%+ code coverage
- [ ] Tests run in CI
