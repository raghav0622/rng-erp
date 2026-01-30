# Documentation Index (Frozen v1)

**Last Updated**: January 30, 2026  
**Status**: Complete and locked

## Core Documentation (Start Here)

### [README.md](./README.md)

**What**: Overview, rules, and fundamental concepts  
**For**: Everyone — start here  
**Topics**: Purpose, rules, problems solved, patterns, constraints  
**Length**: ~400 lines

### [AUTH_HOOKS_MODEL.md](./AUTH_HOOKS_MODEL.md)

**What**: Mental model and conceptual architecture  
**For**: Developers building with hooks  
**Topics**: Pure wrapper concept, hook categories, reactive vs snapshot, cache lifecycle  
**Length**: ~450 lines

## Specific Topics

### [RETURN_SEMANTICS.md](./RETURN_SEMANTICS.md)

**What**: Null vs error handling, patterns, and best practices  
**For**: Preventing null-as-error bugs  
**Topics**: Return value semantics, error boundaries, Suspense patterns, cache invalidation strategy  
**Length**: ~250 lines

### [CACHING_STRATEGY.md](./CACHING_STRATEGY.md)

**What**: React Query cache management and invalidation  
**For**: Writing mutations correctly  
**Topics**: Cache key hierarchy, 6 invalidation patterns, use cases, debugging  
**Length**: ~350 lines

### [ROLE_ACTIONS.md](./ROLE_ACTIONS.md)

**What**: Role-grouped facades and discoverability  
**For**: Finding hooks for your role  
**Topics**: 5 facades, organizational structure, authorization, examples  
**Length**: ~300 lines

### [CLIENT_SIDE_LIMITATIONS.md](./CLIENT_SIDE_LIMITATIONS.md)

**What**: Architectural constraints and design rationale  
**For**: Understanding "why" we built it this way  
**Topics**: 8 limitations, design rationale, maintenance procedures, what IS/ISN'T supported  
**Length**: ~350 lines

## Reference

### [FROZEN_V1.md](./FROZEN_V1.md)

**What**: Versioning policy and change rules  
**For**: Maintainers and contributors  
**Topics**: Frozen status, change policy, public API surface, future migrations  
**Length**: ~250 lines

### [FREEZE_COMPLETE.md](./FREEZE_COMPLETE.md)

**What**: Completion summary and how to use these docs  
**For**: Understanding what was done and next steps  
**Topics**: What was frozen, documentation created, validation checklist, usage guide  
**Length**: ~200 lines

---

## Reading Paths

### Path 1: "I'm New to This Project"

1. [README.md](./README.md) — Understand what this layer does
2. [AUTH_HOOKS_MODEL.md](./AUTH_HOOKS_MODEL.md) — Learn the mental model
3. [RETURN_SEMANTICS.md](./RETURN_SEMANTICS.md) — Learn null handling

**Time**: ~30 minutes

### Path 2: "I'm Building a Form"

1. [README.md](./README.md#query-hooks) — See query hook options
2. [RETURN_SEMANTICS.md](./RETURN_SEMANTICS.md) — Pattern for Suspense + errors
3. [ROLE_ACTIONS.md](./ROLE_ACTIONS.md) — Find mutations for your role
4. [CACHING_STRATEGY.md](./CACHING_STRATEGY.md) — See invalidation patterns

**Time**: ~20 minutes

### Path 3: "I'm Writing a Mutation"

1. [CACHING_STRATEGY.md](./CACHING_STRATEGY.md#invalidation-patterns) — Choose invalidation pattern
2. [RETURN_SEMANTICS.md](./RETURN_SEMANTICS.md) — Error handling
3. Reference source code in `useUserManagementMutations.ts`

**Time**: ~15 minutes

### Path 4: "I Need to Understand Constraints"

1. [CLIENT_SIDE_LIMITATIONS.md](./CLIENT_SIDE_LIMITATIONS.md) — All 8 limitations
2. [AUTH_HOOKS_MODEL.md](./AUTH_HOOKS_MODEL.md#synchronous-vs-async-hooks) — Why some hooks are sync
3. [README.md](./README.md#constraints-by-design) — Summary table

**Time**: ~25 minutes

### Path 5: "I'm a Maintainer"

1. [FROZEN_V1.md](./FROZEN_V1.md) — Understand freeze policy
2. [FREEZE_COMPLETE.md](./FREEZE_COMPLETE.md) — See what was done
3. [CLIENT_SIDE_LIMITATIONS.md](./CLIENT_SIDE_LIMITATIONS.md) — Know the constraints

**Time**: ~20 minutes

---

## Key Concepts Reference

### Null is NOT an Error

See: [RETURN_SEMANTICS.md](./RETURN_SEMANTICS.md) (return value semantics section)

### Cache Invalidation Strategy

See: [CACHING_STRATEGY.md](./CACHING_STRATEGY.md) (invalidation patterns section)

### Reactive vs Snapshot

See: [AUTH_HOOKS_MODEL.md](./AUTH_HOOKS_MODEL.md) (session hooks section)

### Role-Based Organization

See: [ROLE_ACTIONS.md](./ROLE_ACTIONS.md) (facades section)

### Client-Side Only Design

See: [CLIENT_SIDE_LIMITATIONS.md](./CLIENT_SIDE_LIMITATIONS.md) (core design section)

### Suspense Patterns

See: [RETURN_SEMANTICS.md](./RETURN_SEMANTICS.md) (error boundary handling section)

---

## File Count & Scope

| Category          | Files | Lines   |
| ----------------- | ----- | ------- |
| **Documentation** | 8     | ~2,300  |
| **Code**          | 12+   | ~1,500+ |
| **Total**         | 20+   | ~3,800+ |

---

## Version Info

- **Status**: Frozen v1 (final)
- **Release Date**: January 30, 2026
- **Change Policy**: Documentation only (no runtime changes)
- **Support**: Locked for years
- **Next Version**: v2.0 (if breaking changes needed)

---

## How to Navigate

All markdown files are interlinked:

- Use [README.md](./README.md) as hub
- Follow reference links `{@link ./filename.md}` in code
- Use breadcrumb sections to understand relationships

**Tip**: Start with [README.md](./README.md), then read based on your role or task (see Reading Paths above).

---

**This documentation is the authoritative reference for app-auth-hooks v1.**

No breaking changes. No surprises. Production-ready.
