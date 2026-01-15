---
trigger: always_on
globs: "client/**/*"
---

> **SCOPE**: These rules apply specifically to the **client** directory.

# Forms & Validation

## Form Handling with React Hook Form + Zod + Ant Design

To maintain the project's logic and architecture while using Ant Design, use **React Hook Form (RHF)** for state management and **Zod** for validation, connecting them to **Ant Design** components via the `Controller` component.

### Basic Form Pattern

```tsx
// features/auth/components/LoginForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Form } from 'antd';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm = ({ onSubmit, isSubmitting }) => {
  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });
  
  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <Form.Item 
        label="Email" 
        validateStatus={errors.email ? 'error' : ''} 
        help={errors.email?.message}
      >
        <Controller
          name="email"
          control={control}
          render={({ field }) => <Input {...field} type="email" placeholder="Email" />}
        />
      </Form.Item>
      
      <Form.Item 
        label="Password" 
        validateStatus={errors.password ? 'error' : ''} 
        help={errors.password?.message}
      >
        <Controller
          name="password"
          control={control}
          render={({ field }) => <Input.Password {...field} placeholder="Password" />}
        />
      </Form.Item>
      
      <Button type="primary" htmlType="submit" loading={isSubmitting} block>
        Login
      </Button>
    </Form>
  );
};
```

### Complete Form Example (Resources)

```tsx
const resourceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  category: z.string().min(1, 'Category is required'),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

export const CreateResourceForm = ({ onSubmit, isSubmitting }) => {
  const { control, handleSubmit, formState: { errors } } = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
  });
  
  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <Form.Item label="Title" validateStatus={errors.title ? 'error' : ''} help={errors.title?.message}>
        <Controller name="title" control={control} render={({ field }) => <Input {...field} />} />
      </Form.Item>

      <Form.Item label="Price" validateStatus={errors.price ? 'error' : ''} help={errors.price?.message}>
        <Controller name="price" control={control} render={({ field }) => <Input type="number" {...field} />} />
      </Form.Item>
      
      <Button type="primary" htmlType="submit" loading={isSubmitting}>
        Create Resource
      </Button>
    </Form>
  );
};
```

## Form with Select (Ant Design)

```tsx
import { Select } from 'antd';

<Form.Item label="Category" validateStatus={errors.category ? 'error' : ''} help={errors.category?.message}>
  <Controller
    name="category"
    control={control}
    render={({ field }) => (
      <Select {...field} placeholder="Select Category">
        <Select.Option value="cat1">Category 1</Select.Option>
        <Select.Option value="cat2">Category 2</Select.Option>
      </Select>
    )}
  />
</Form.Item>
```

## Form with File Upload (Ant Design)

Use Ant Design's `Upload` component, often manually handling the file list to sync with RHF if needed, or using a local state and calling an upload service.

## Validation Best Practices
- ✅ **Consistent Schemas**: Keep Zod schemas in a dedicated `schemas/` folder within features.
- ✅ **Error Mapping**: Map API validation errors back to RHF fields using `setError`.
- ✅ **Loading States**: Use Ant Design's `loading` prop on buttons.
- ✅ **User Experience**: Don't show validation errors until the field is "touched" or the form is submitted.
