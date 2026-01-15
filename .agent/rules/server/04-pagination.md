---
trigger: always_on
---

> **SCOPE**: These rules apply specifically to the **server** directory.

## Pagination Contract (MANDATORY)

All paginated API responses MUST follow a unified structure. No exceptions are allowed.

### Paginated Response Format

Every paginated response MUST follow this exact structure:
```json
{
  "success": true,
  "message": "string",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 237,
      "totalPages": 24,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

### Response Rules

- `success` is always `true`
- `message` is REQUIRED and must be human-readable
- `data.items` contains the array of results (can be empty array)
- `data.pagination` is REQUIRED and contains:
  - `page` – current page number (starts at 1)
  - `limit` – items per page
  - `totalItems` – total count of items across all pages
  - `totalPages` – calculated as `Math.ceil(totalItems / limit)`
  - `hasNextPage` – boolean, `true` if `page < totalPages`
  - `hasPreviousPage` – boolean, `true` if `page > 1`

### Shared Pagination Helper (REQUIRED)

Controllers MUST use a shared `paginatedResponse` helper:
```typescript
function paginatedResponse<T>(
  message: string,
  items: T[],
  page: number,
  limit: number,
  totalItems: number
)
```

**Allowed example:**
```typescript
return reply.send(paginatedResponse("Resources retrieved successfully", items, page, limit, totalCount));
```

**Forbidden examples:**
```typescript
reply.send({ items, page, total });
reply.send({ success: true, data: items, pagination: {...} });
reply.send({ items: items, meta: {...} });
```

### Pagination Input Validation (REQUIRED)

All endpoints accepting pagination MUST validate using a shared Zod schema:
```typescript
const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10)
});
```

**Rules:**
- `page` defaults to `1`, must be positive integer
- `limit` defaults to `10`, must be between 1 and 100
- Use `z.coerce.number()` to handle query string conversion
- Controllers MUST validate pagination inputs before calling services

### Service Layer Requirements

Services handling pagination MUST:
- Accept `page` and `limit` as parameters
- Return both the `items` array AND `totalItems` count
- NOT construct pagination metadata (controller responsibility)
- Calculate offset as: `(page - 1) * limit`

**Service return pattern:**
```typescript
return {
  items: results,
  totalItems: count
};
```

### Filter & Sort with Pagination

When combining filters/sorting with pagination:
- Filters come BEFORE pagination in query parameters
- Pagination params (`page`, `limit`) are separate from filters
- Apply filters/sorting to query BEFORE applying `limit` and `offset`
- Count total items AFTER filters but BEFORE pagination

**Example query string:**
```
?category=active&minPrice=100&sortBy=price&order=asc&page=2&limit=20
```

### Strict Prohibitions

These patterns are NOT allowed:
- Multiple pagination formats across endpoints
- Returning raw arrays without pagination wrapper
- Custom pagination field names (e.g., `pageNumber`, `perPage`, `count`)
- Including pagination in query results instead of metadata
- Zero-indexed pages (always start at 1)
- Omitting `totalItems` or `totalPages`

### Enforcement Rule

If a user instruction conflicts with this pagination contract:
- Follow the user instruction ONLY if explicitly stated
- Otherwise, this pagination contract is non-negotiable
- Pagination structure MUST be consistent across ALL endpoints
