---
trigger: always_on
globs: "client/**/*"
---

> **SCOPE**: These rules apply specifically to the **client** directory.

# Color System & Theming

## Color Architecture
All colors are defined as **CSS variables** in a global stylesheet and synchronized with **Ant Design's ConfigProvider** for component theming.

## CSS Variables Setup

```css
/* styles/theme.css */
:root {
  --primary-color: #1677ff;
  --success-color: #52c41a;
  --warning-color: #faad14;
  --error-color: #f5222d;
  --text-color: rgba(0, 0, 0, 0.88);
  --bg-color: #ffffff;
  --border-color: #d9d9d9;
}

[data-theme='dark'] {
  --primary-color: #1668dc;
  --bg-color: #141414;
  --text-color: rgba(255, 255, 255, 0.85);
}
```

## Ant Design Configuration

```tsx
// app/providers.tsx
import { ConfigProvider, theme } from 'antd';

export const AppProviders = ({ children, isDarkMode }) => (
  <ConfigProvider
    theme={{
      algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: '#1677ff',
        borderRadius: 4,
      },
    }}
  >
    {children}
  </ConfigProvider>
);
```

## Usage Rules

### ✅ CORRECT - Use CSS Variables in Vanilla CSS

```css
/* features/resources/components/ResourceCard.css */
.resource-card {
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  color: var(--text-color);
}

.resource-card:hover {
  border-color: var(--primary-color);
}
```

### ❌ NEVER Hardcode Colors in Components

```tsx
// ❌ BAD
<div style={{ color: '#ff0000' }}>Error</div>

// ✅ GOOD
<div className="error-text">Error</div> /* defined in CSS using var(--error-color) */
```

## Dark Mode Implementation
Use the `data-theme` attribute on the `html` or `body` tag and sync it with Ant Design's algorithm.

## AI Agent Rules

### Rule 1: No Hardcoded Colors
Always use `var(--color-name)` in CSS files. Never use hex/rgb values directly in component files.

### Rule 2: Semantic Naming
Use functional names like `--primary-color`, `--text-secondary`, not descriptive ones like `--blue`.

### Rule 3: Single Source of Truth
Global theme variables must stay in `styles/theme.css`. Components should import their own `.css` files that reference these variables.
