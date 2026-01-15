---
trigger: always_on
---

> **SCOPE**: These rules apply to the entire workspace (**server** and **client**).

# API Server – Safe Editing Rules

## General safety

- Assume this is a real production project. Avoid destructive or experimental changes.
- Never delete or radically restructure large parts of the codebase unless explicitly requested.

## When modifying existing code

- Keep changes as **small and focused** as possible.
- Do not change:
  - Existing function signatures unless explicitly asked.
  - Existing exports/imports that other modules depend on.
- If you must introduce a breaking change, call it out clearly in the explanation.

## Backwards compatibility

- When adding new features, prefer extending modules over rewiring everything.
- Preserve existing behavior for:
  - Auth
  - Core business flows
  - Payment flows

## Comments & TODOs

- If something is ambiguous, add a `// TODO:` comment with a short note.
- Do NOT leave half-implemented features without a TODO or explanation.

## Logs & debugging

- Do not add noisy debug logs.
- If temporary logs are necessary, clearly mark them with `// TODO: remove debug log` so they can be cleaned up.
