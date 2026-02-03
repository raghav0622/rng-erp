# 🧠 RNG ERP — Copilot Mega-Prompt

**Auth-Integrated, Workstation-Grade Dashboard**

> Follow these instructions strictly. Do not invent architecture. Do not bypass existing services.

## Context

You are implementing UI for a professional ERP dashboard using:

- React
- Next.js App Router
- Mantine UI
- Existing RNG Auth Service (already implemented)

**This is not a consumer app and not mobile-first.**

The UI must support long work sessions, multitasking, dense data, and operational clarity.

## Core UX Law (Absolute)

| Desktop & Tablet       | Mobile              |
| :--------------------- | :------------------ |
| **Full Work Mode**     | **View Mode**       |
| Multitasking enabled   | Primarily read-only |
| Dense, compact layout  | Comfortable density |
| All features available | Limited to viewing  |

**Core Principle**: Responsive design adapts layout, not capability. Never implement feature parity across devices.

## Auth System (Mandatory — Do Not Reimplement)

### ✅ You MUST:

- Use the existing auth service
- Use existing auth hooks
- Use existing auth UI components
- Respect auth guards and boundaries

### ❌ You MUST NOT:

- Call Firebase directly
- Implement login/session logic
- Mock auth state
- Duplicate auth UI

**Key Rule**: Auth controls whether UI renders, not how it looks.

## Auth-Aware Layout Rules

### Unauthenticated State

- Render only auth components
- **Do NOT** render AppShell or dashboard

### Auth Loading State

- Render provided auth loading boundary

### Authenticated State

- Wrap dashboard routes in AppShell
- Show header + sidebar
- Show user avatar/menu from auth context

### Disabled/Blocked User

- Render provided auth empty/blocked state component

## Layout Implementation (Mandatory)

### Core Requirements

- Use Mantine `AppShell`
- Persistent sidebar + slim sticky header
- Sidebar must be collapsible
- Header must remain visually quiet

### Device Behavior

| Device      | Density     | Multitasking |
| :---------- | :---------- | :----------- |
| **Desktop** | Compact     | ✅ Enabled   |
| **Tablet**  | Compact     | ✅ Enabled   |
| **Mobile**  | Comfortable | ❌ View-only |

## Multitasking (Desktop & Tablet Required)

The UI must allow parallel work.

### ✅ Approved Patterns

- Master–detail split view
- Persistent side panels/drawers
- Inline detail expansion
- Parallel information panels

### 📋 Rules

- Primary list/context must remain visible
- Filters, scroll, and selection must persist
- Only one secondary panel may be open at a time

### ❌ Prohibited

- Full-page blocking modals for core workflows
- Wizard-only flows
- Context-destroying navigation

## Dashboard Implementation Requirements

Implement a working dashboard page that:

### Includes

- Status cards (summary metrics)
- Primary work list (table on desktop, cards on mobile)
- Secondary panel or section (details/recent activity)
- Auth-aware empty states

### Must

- Render only when authenticated
- Respect auth loading & blocked states
- Respect UI empty/loading/error states
- Be responsive and density-aware
- Use placeholder data only for business data, never for auth

## Page Structure (Strict)

Every page must follow:

1. **Page title** + optional subtitle
2. **Single primary action** (top-right)
3. **Optional filters/tabs**
4. **Main content**

Never deviate.

## Data & Table Rules

### Desktop/Tablet

- Tables are primary work surface
- First column emphasized
- Secondary data muted
- Status shown using pill + color
- Actions aligned right
- Sticky headers on desktop

### Mobile

- Convert tables to cards
- One entity per card
- Tap opens detail view

## State & Trust Signals (UI-Only)

Visually indicate:

- Logged-in user context
- View-only vs editable states
- Locked/archived/pending states
- "Last updated by/when" (visual only)

**Do NOT implement RBAC or permission logic.**

## Empty/Loading/Error States (Mandatory)

Every screen must handle:

- Auth loading
- Auth blocked/disabled
- Empty data
- Generic errors

**Note**: Use existing auth empty/boundary components where applicable.

## Mobile View Mode Rules

On mobile:

- Read-only by default
- At most one primary action
- No split views
- No dense tables
- Large tap targets

**Mobile is for awareness, not administration.**

## Visual Style Rules

- Neutral, professional palette
- One accent color
- Subtle borders & shadows
- Restrained rounding
- Icons always support text
- Consistency over creativity
- No playful animations

## Hard Constraints (Do Not Violate)

- ❌ Do NOT reimplement auth
- ❌ Do NOT call Firebase
- ❌ Do NOT bypass auth guards
- ❌ Do NOT mix auth UI with dashboard UI
- ❌ Do NOT require scrolling to reach primary action on desktop
- ❌ Do NOT expose more than one primary action on mobile
- ❌ Do NOT introduce backend or business logic

## Expected Output From Copilot

### Generate

- React components
- Mantine UI layouts
- AppShell-based dashboard
- Auth-aware layout and routing
- Multitasking-capable desktop UI

### Avoid

- Fake auth
- Over-engineering
- Non-Mantine UI libraries
- Consumer-style UI patterns

## Final Rule

**This UI is a workstation behind a strict auth boundary.**

If a solution:

- fakes auth,
- reduces multitasking,
- hides context,
- or adds visual noise,

**it is incorrect by design.**
