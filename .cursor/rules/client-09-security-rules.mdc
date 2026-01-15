---
trigger: always_on
globs: "client/**/*"
---

> **SCOPE**: These rules apply specifically to the **client** directory.

# Frontend Security Rules

## Core Security Principles

1. **Never trust user input**: Always validate and sanitize data from users.
2. **Never expose secrets**: API keys, database credentials, and secrets must never be in the client code.
3. **Always validate and sanitize**: Even if the backend validates, client-side sanitization is essential for UX and defense-in-depth.
4. **Defense in depth**: Multiple layers of security at every level of the stack.

## XSS Prevention

### React's Built-in Protection
React automatically escapes values to prevent XSS.

```tsx
// ✅ SAFE - React escapes by default
<div>{userInput}</div>

// ❌ DANGEROUS - Avoid dangerouslySetInnerHTML unless strictly sanitized
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### URL Sanitization
Always validate URLs before using them in `href` attributes.

```tsx
export const isSafeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};
```

## Authentication Token Security

### Token Storage
Avoid storing sensitive tokens in `localStorage`. Use Redux for access tokens (in-memory) and `httpOnly` cookies or encrypted storage for long-lived tokens.

### Token Transmission
Always use HTTPS and send tokens in the `Authorization` header.

```tsx
axios.interceptors.request.use((config) => {
  const token = store.getState().auth.tokens?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## Input & File Validation

### Client + Server Validation
Use Zod for robust client-side validation, matching the backend's expectations.

### File Upload Security
Validate file type, size, and extension before uploading.

```tsx
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const validateFile = (file: File) => {
  if (!ALLOWED_TYPES.includes(file.type)) return { valid: false, error: 'File type not allowed' };
  if (file.size > MAX_SIZE) return { valid: false, error: 'File too large' };
  return { valid: true };
};
```

## Environment Variables
- Prefix with `VITE_` for client availability.
- Never commit `.env` files.
- Validate environment variables at runtime using a Zod schema.

## AI Agent Security Rules

### Rule 1: Never Trust User Input
Never use `dangerouslySetInnerHTML` with raw user input.

### Rule 2: Never Expose Secrets
Do not hardcode API keys or credentials. Use `import.meta.env`.

### Rule 3: Secure Tokens
Do not recommend plain `localStorage` for sensitive authentication tokens.

### Rule 4: Sanitize Content
Sanitize any HTML content with DOMPurify before rendering.
