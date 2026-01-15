---
trigger: always_on
---

> **SCOPE**: These rules apply specifically to the **client** directory.

# Common Patterns & Utilities

## Custom Hooks

### useAuth Hook
Standard pattern for authentication state and methods.

```tsx
// features/auth/hooks/useAuth.ts
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  
  const login = async (data: LoginRequest) => {
    const response = await authService.login(data);
    dispatch(setCredentials(response));
  };
  
  const logout = () => {
    dispatch(logoutAction());
  };
  
  return { user, isAuthenticated, login, logout };
};
```

## Common Components (Ant Design)

### Pagination
Use Ant Design's `Pagination` component.

```tsx
import { Pagination } from 'antd';

export const CustomPagination = ({ current, total, onChange }) => (
  <Pagination
    current={current}
    total={total}
    onChange={onChange}
    showSizeChanger={false}
  />
);
```

### Empty State
Use Ant Design's `Empty` component.

```tsx
import { Empty, Button } from 'antd';

export const NoData = ({ message, onAction, actionText }) => (
  <Empty
    description={message}
    image={Empty.PRESENTED_IMAGE_SIMPLE}
  >
    {onAction && (
      <Button type="primary" onClick={onAction}>
        {actionText}
      </Button>
    )}
  </Empty>
);
```

### Confirm Dialog
Use Ant Design's `Modal.confirm`.

```tsx
import { Modal } from 'antd';

const showDeleteConfirm = (onConfirm: () => void) => {
  Modal.confirm({
    title: 'Are you sure you want to delete this resource?',
    content: 'This action cannot be undone.',
    okText: 'Yes, Delete',
    okType: 'danger',
    cancelText: 'No',
    onOk() {
      onConfirm();
    },
  });
};
```

## Utility Functions

### Format Utils
Standard internationalization utils.

```tsx
// lib/utils/format.ts
export const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};
```

## Router & App Setup

### Router Configuration
```tsx
// app/router.tsx
export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'resources', element: <ResourcesPage /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
]);
```

## Table Pattern (Ant Design)
Use Ant Design's `Table` component for consistent data display.

```tsx
// features/resources/components/ResourceTable.tsx
import { Table, Button, Space } from 'antd';

export const ResourceTable = ({ data, onEdit, onDelete, loading }) => {
  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Category', dataIndex: 'category', key: 'category' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button onClick={() => onEdit(record.id)}>Edit</Button>
          <Button danger onClick={() => onDelete(record.id)}>Delete</Button>
        </Space>
      ),
    },
  ];

  return <Table dataSource={data} columns={columns} loading={loading} rowKey="id" />;
};
```
I use `Space` for horizontal layout and `Space.Compact` for grouped actions.
