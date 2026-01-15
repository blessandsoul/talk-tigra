---
trigger: always_on
---

> **SCOPE**: These rules apply specifically to the **client** directory.

# Component Patterns & Rules

## Component Structure Template

```tsx
// 1. IMPORTS (grouped and ordered)
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from 'antd'; // Ant Design
import { useResources } from '../hooks/useResources';
import type { Resource } from '../types/resource.types';

// Import CSS (Vanilla or Module)
import './ResourceCard.css';

// 2. TYPES (component-specific only)
interface ResourceCardProps {
  resource: Resource;
  onEdit?: (id: string) => void;
  className?: string; // Standard className prop for custom styles
}

// 3. COMPONENT
export const ResourceCard = ({ resource, onEdit, className }: ResourceCardProps) => {
  // 3a. HOOKS (router → Redux → React Query → state → custom)
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  
  // 3b. EVENT HANDLERS
  const handleClick = useCallback(() => {
    navigate(`/resources/${resource.id}`);
  }, [navigate, resource.id]);
  
  // 3c. EFFECTS
  useEffect(() => {
    // Side effects
  }, []);
  
  // 3d. EARLY RETURNS
  if (!resource) return null;
  
  // 3e. RENDER
  return (
    <Card 
      className={`resource-card ${className || ''}`} 
      onClick={handleClick}
      hoverable
    >
      <h3>{resource.title}</h3>
      {/* JSX */}
    </Card>
  );
};
```

## Component Types

### 1. Presentational Components
**Location**: `components/common/` or `features/*/components/`

**Rules**:
- NO business logic
- NO API calls
- NO Redux/Context (except theme)
- Receive ALL data via props
- Focus ONLY on UI

```tsx
// ✅ GOOD - Pure presentation
interface ResourceCardProps {
  resource: Resource;
  onClick: (id: string) => void;
}

export const ResourceCard = ({ resource, onClick }: ResourceCardProps) => {
  return (
    <div className="card-container" onClick={() => onClick(resource.id)}>
      <h3>{resource.title}</h3>
      <p>{resource.price}</p>
    </div>
  );
};
```

### 2. Container Components
**Location**: `features/*/pages/` or `features/*/components/`

**Rules**:
- Contains business logic
- Makes API calls via hooks
- Manages state
- Passes data to presentational components

```tsx
// ✅ GOOD - Container component
export const ResourcesPage = () => {
  const [filters, setFilters] = useState<ResourceFilters>({});
  const { resources, isLoading } = useResources(filters);
  const navigate = useNavigate();
  
  const handleResourceClick = (id: string) => {
    navigate(`/resources/${id}`);
  };
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div className="page-container">
      <ResourceFilters value={filters} onChange={setFilters} />
      <div className="resource-list">
        {resources.map(res => (
          <ResourceCard key={res.id} resource={res} onClick={handleResourceClick} />
        ))}
      </div>
    </div>
  );
};
```

## Styling Rules

### CSS Architecture
Instead of Tailwind, use Vanilla CSS or CSS Modules.

**Vanilla CSS Pattern**:
```css
/* ResourceCard.css */
.resource-card {
  padding: 16px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.resource-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
```

**CSS Modules Pattern**:
```tsx
import styles from './ResourceCard.module.css';

<div className={styles.cardContainer}>...</div>
```

**Rules**:
1. **NO Inline styles**: Avoid `<div style={{...}}>`.
2. **Use Variables**: Use CSS variables for theme colors (defined in `globals.css`).
3. **Consistency**: Use Ant Design's built-in props for standard spacing and layout where possible.
4. **Responsive**: Use media queries in CSS files.

```css
/* ✅ GOOD - Responsive in CSS */
.page-container {
  padding: 20px;
}

@media (min-width: 768px) {
  .page-container {
    padding: 40px;
  }
}
```

## Component Size Rules

### Limits
- **Max 250 lines** per component
- **Max 5 props** (use object if more)
- **Max 3 levels** of JSX nesting

### When to Split
Split when:
1. Component exceeds 250 lines
2. JSX nesting exceeds 3 levels
3. Multiple responsibilities
4. Part is reusable elsewhere

## Props Rules

### Props Interface
```tsx
// ✅ GOOD - Group related props
interface ResourceCardProps {
  resource: Resource;
  actions?: ResourceActions;
  className?: string;
}
```

### Children Prop
```tsx
interface LayoutProps {
  children: React.ReactNode;
  headerContent?: React.ReactNode;
}

export const Layout = ({ children, headerContent }: LayoutProps) => {
  return (
    <div className="layout">
      {headerContent && <div className="header">{headerContent}</div>}
      {children}
    </div>
  );
};
```

## Performance Optimization

### React.memo
```tsx
// ✅ Use for components in lists
export const ResourceCard = React.memo(({ resource }: ResourceCardProps) => {
  return <div>{resource.title}</div>;
});

ResourceCard.displayName = 'ResourceCard';
```

### useCallback
```tsx
// ✅ For handlers passed to children
const handleClick = useCallback((id: string) => {
  navigate(`/resources/${id}`);
}, [navigate]);

<ResourceCard resource={resource} onClick={handleClick} />
```

## Accessibility Rules
- Use semantic HTML tags.
- Use `aria-*` attributes when standard elements aren't enough.
- Ensure Ant Design components are used with proper labels.

## Component Checklist
- [ ] Under 250 lines
- [ ] Props interface defined (max 5)
- [ ] Event handlers use useCallback
- [ ] Expensive computations use useMemo
- [ ] Early returns for error/loading
- [ ] CSS files used (no inline styles, no Tailwind)
- [ ] Accessibility attributes
- [ ] Named export (not default)
