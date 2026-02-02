# RNG-ERP: Enterprise Resource Planning Frontend

> **Status**: 🚀 Production-Ready  
> **Architecture**: Next.js 16 (App Router) + Mantine UI + Zod + Firebase  
> **Quality**: Enterprise-grade with strict TypeScript, frozen modules, and comprehensive testing

## 📋 Quick Links

- **[Architecture Overview](#architecture-overview)** — Three architectural pillars
- **[Project Structure](#project-structure)** — Directory guide
- **[Getting Started](#getting-started)** — Setup and first steps
- **[Development](#development)** — Commands and workflows
- **[Key Modules](#key-modules)** — Deep dives by component
- **[Testing](#testing)** — Vitest, Storybook, E2E patterns
- **[Contributing](#contributing)** — Guidelines and patterns

---

## 🏗️ Architecture Overview

RNG-ERP is built on three frozen architectural pillars:

### 1. **rng-forms** — Schema-Driven Form UI Engine

Zero business logic, pure UI composition. Forms are defined via Zod schemas and declarative DSL.

**Features**:

- 20+ field types (text, select, date, rich-text, signature, uploads, etc.)
- Lazy-loaded components for optimal bundles
- Async validation with retry and debouncing
- Cross-field validation helpers
- Conditional rendering via dependencies and propsLogic
- Taxonomy integration for Firestore-backed selectors

**Entry Point**: [rng-forms/README.md](rng-forms/README.md)  
**DSL**: [rng-forms/dsl/factory.ts](rng-forms/dsl/factory.ts)

### 2. **rng-repository** — Frozen v1 Client-Safe Data Access Layer

Mechanical, immutable CRUD abstraction. No breaking changes allowed.

**Features**:

- Strong typing: `IRepository<T>` generic interface
- Optimistic locking with version checks
- Soft deletes (non-destructive)
- Offline tolerance (queued mutations)
- Structured diagnostics and retry logic
- Safe for client-side use (respects security rules)

**Status**: ✅ **FROZEN v1.0.0** — No public API changes  
**Entry Point**: [rng-repository/README.md](rng-repository/README.md)

### 3. **rng-platform/rng-auth** — Client-Side Authentication Service

Integrates Firebase Auth with Firestore-backed AppUser projections. Invariant-driven.

**Features**:

- Role-based access control (owner, manager, employee, client)
- Email verification synced with Firebase Auth
- Invite lifecycle (invited → activated → revoked)
- Disabled user handling
- Race condition detection and cleanup
- Session integrity guarantees

**Status**: ✅ **FROZEN v1** — Multi-year production stability  
**Auth Model**: [rng-platform/rng-auth/app-auth-service/AUTH_MODEL.md](rng-platform/rng-auth/app-auth-service/AUTH_MODEL.md)  
**Hooks Guide**: [rng-platform/rng-auth/app-auth-hooks/README.md](rng-platform/rng-auth/app-auth-hooks/README.md)

---

## 📁 Project Structure

```
rng-erp/
├── 📁 rng-forms/                 # Schema-driven form UI engine
│   ├── RNGForm.tsx              # Main form component
│   ├── dsl/factory.ts           # DSL builder for forms
│   ├── components/              # Field components (20+ types)
│   ├── core/                    # Form runtime, registry, context
│   ├── hooks/                   # Validation, async, cross-field
│   ├── stories/                 # Storybook integration
│   └── README.md                # Complete forms documentation
│
├── 📁 rng-repository/            # v1 frozen data access layer
│   ├── AbstractClientFirestoreRepository.ts
│   ├── types.ts
│   ├── errors.ts
│   ├── utils/                   # Compression, encryption, sanitize, timestamps
│   ├── tests/contract/          # Immutable contract tests
│   └── README.md                # Freeze rules & API
│
├── 📁 rng-platform/              # Business logic & platform services
│   ├── 📁 rng-auth/             # Authentication module (strict, frozen v1)
│   │   ├── app-auth-service/    # Core service (frozen v1)
│   │   ├── app-auth-hooks/      # React Query hooks (frozen v1)
│   │   ├── app-auth-components/ # Auth UI components
│   │   └── index.public.ts      # Public API
│   └── index.ts                 # Platform services entry point
│
├── 📁 rng-ui/                    # Shared UI patterns
│   ├── DashboardLayout.tsx      # Main layout
│   ├── BrandingHeader.tsx
│   ├── BrandingFooter.tsx
│   └── auth/                    # Auth guards & wrappers
│
├── 📁 app/                       # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page
│   ├── profile/                 # User profile routes
│   └── dashboard/               # Role-based dashboards
│       ├── OwnerDashboard.tsx
│       ├── ManagerDashboard.tsx
│       ├── EmployeeDashboard.tsx
│       └── ClientDashboard.tsx
│
├── 📁 lib/                       # Utilities & bootstrap
│   ├── env.ts                   # Environment schema (Zod + @t3-oss)
│   ├── firebase-client.ts       # Firebase initialization
│   ├── logger.ts                # Structured logger
│   └── types.ts                 # Global types
│
├── 📁 theme/                     # Mantine theme configuration
│   └── index.ts
│
├── 📁 app-providers/             # React context providers
│   ├── RNGQueryProvider.tsx      # React Query setup
│   └── SingleInstanceSafeGuard.tsx
│
├── 📁 public/                    # Static assets
│
├── 📁 .storybook/                # Storybook config
│
├── 📁 scripts/                   # Utility scripts
│   └── get-review-file.ts
│
├── 📁 types/                     # Global TypeScript types
│   └── pdfjs-worker.d.ts
│
├── 📁 .github/                   # GitHub config
│   └── copilot-instructions.md  # AI agent guidance
│
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript config (strict mode)
├── vitest.config.ts            # Vitest configuration
├── package.json                # Dependencies & scripts
└── README.md                   # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (or via `nvm`)
- **npm** 9+ or **pnpm** 8+
- **Firebase Project** (configured in `.env.local`)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd rng-erp

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase credentials
```

### Environment Configuration

Create `.env.local` with both server and client variables:

```env
# Server-side (used during build & SSR)
NODE_ENV=development
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-email@iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Client-side (prefixed with NEXT_PUBLIC_)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**Reference**: [lib/env.ts](lib/env.ts) — Environment schema with Zod validation

---

## 💻 Development

### Start Dev Server

```bash
npm run dev
# Runs on http://localhost:3000
```

### Build for Production

```bash
npm run build
npm run start
```

### Linting & Formatting

```bash
npm run lint              # ESLint + TypeScript strict checks
npm run format            # Prettier (if configured)
```

### Development Commands

| Command                   | Purpose                               |
| ------------------------- | ------------------------------------- |
| `npm run dev`             | Start Next.js dev server (hot reload) |
| `npm run build`           | Production build                      |
| `npm run start`           | Start production server               |
| `npm run test`            | Run Vitest unit tests                 |
| `npm run storybook`       | Start Storybook on :6006              |
| `npm run build-storybook` | Build static Storybook                |
| `npm run lint`            | Run ESLint + TypeScript checks        |

---

## 🧪 Testing

### Unit Tests (Vitest)

```bash
npm run test                    # Run all unit tests
npx vitest run [file]          # Run specific test
npx vitest --watch             # Watch mode
```

**Test Projects**:

- `unit` — JSdom environment for utilities (`rng-platform/**/*.spec.ts`)
- `storybook` — Playwright + Storybook visual tests

**Mock Environment**: Firebase env vars configured in [vitest.config.ts](vitest.config.ts)

### Storybook (Component Tests)

```bash
npm run storybook              # Start Storybook dev
npm run build-storybook        # Build static Storybook
```

**Stories Location**: [rng-forms/stories/](rng-forms/stories/)  
**Story Helper**: [rng-forms/stories/\_shared/story-helpers.tsx](rng-forms/stories/_shared/story-helpers.tsx)

### E2E Testing (Future)

Current project uses Playwright via Storybook addon. E2E test suite (`cypress`, `playwright`, or `webdriver`) can be added per team preference.

---

## 🔑 Key Modules

### **Forms (rng-forms)**

Schema-driven form composition with Zod validation.

```tsx
import { z } from 'zod';
import RNGForm, { createFormBuilder } from 'rng-forms';

const schema = z.object({
  name: z.string().min(2),
  category: z.string().array().min(1),
});

const builder = createFormBuilder(schema);
const formSchema = {
  items: [builder.section('Details', [builder.text('name', { label: 'Name', required: true })])],
};

export default function MyForm() {
  return (
    <RNGForm
      schema={formSchema}
      validationSchema={schema}
      onSubmit={(values) => console.log(values)}
    />
  );
}
```

**Documentation**: [rng-forms/README.md](rng-forms/README.md)

### **Data Access (rng-repository)**

Type-safe, immutable client-side repository.

```ts
const userRepo = new UserRepository(firestore);
const user = await userRepo.getById('user-123');
await userRepo.update('user-123', { name: 'Alice' }, { version: 1 });
```

**Documentation**: [rng-repository/README.md](rng-repository/README.md)

### **Authentication (rng-platform/rng-auth)**

Firebase Auth + Firestore AppUser projections with RBAC.

```tsx
import { useAuthSession, useCurrentUser, useSignIn } from 'rng-platform/rng-auth';

function Dashboard() {
  // Reactive session state
  const session = useAuthSession();
  if (session.state !== 'authenticated') return <LoginForm />;

  // Query current user (Suspense)
  const { data: user } = useCurrentUser();

  return <div>Hello, {user.name}</div>;
}
```

**Documentation**: [rng-platform/rng-auth/app-auth-hooks/README.md](rng-platform/rng-auth/app-auth-hooks/README.md)

---

## 📚 Architecture Decisions

### Frozen Modules

Three core modules are **frozen v1.0.0** with no breaking changes allowed:

| Module             | Reason                     | Changes Allowed             |
| ------------------ | -------------------------- | --------------------------- |
| `rng-repository`   | Client-safe data contract  | Internal optimizations only |
| `app-auth-service` | Auth invariants are policy | Bug fixes, error handling   |
| `app-auth-hooks`   | Production stability       | Documentation only          |

Breaking changes require **v2.0.0** (new major version).

### Separation of Concerns

- **Forms** (`rng-forms`): Pure UI composition, no business logic
- **Repository** (`rng-repository`): Mechanical CRUD, no business rules
- **Auth** (`rng-platform/rng-auth`): Identity & RBAC only (strict module within rng-platform)
- **Business Logic**: Belongs in `rng-platform/` (other modules) or route handlers

### TypeScript Strict Mode

All code compiles with:

- `noUncheckedIndexedAccess` — Arrays can return undefined
- `noImplicitReturns` — Functions must return or throw
- `noFallthroughCasesInSwitch` — Exhaustive switch checks

No `any` or `@ts-ignore` without justification.

### React 19 + Next.js 16 (App Router)

- Server Actions intentionally disabled (commented in [next.config.ts](next.config.ts))
- All client components marked with `'use client'`
- Suspense boundaries for async data loading
- Error boundaries for fault isolation

---

## 🛠️ Contributing

### Code Style

- Follow [ESLint](eslint.config.mjs) rules
- Use TypeScript strict mode
- Document public APIs with JSDoc
- Add Storybook stories for UI components

### Submitting Changes

1. **Create feature branch** from `main`
2. **Write tests** for new functionality
3. **Build & verify**: `npm run build && npm run lint && npm run test`
4. **Submit PR** with clear description
5. **Reference frozen modules** in PR if affected

### Extending Forms

1. Add component to [rng-forms/components/](rng-forms/components/)
2. Register in [rng-forms/core/Registry.tsx](rng-forms/core/Registry.tsx)
3. Add DSL helper to [rng-forms/dsl/factory.ts](rng-forms/dsl/factory.ts)
4. Write Storybook story in [rng-forms/stories/](rng-forms/stories/)
5. Update [rng-forms/README.md](rng-forms/README.md)

### Extending Auth

**Do NOT** add logic directly to auth service. Instead:

1. Create service in `rng-platform/` (separate module) or route handler
2. Use auth hooks from `app-auth-hooks` (UI layer)
3. Never import `appAuthService` directly (use hooks only)

**Reference**: [.github/copilot-instructions.md](.github/copilot-instructions.md)

---

## 📖 Additional Documentation

| Document                                                                                                             | Purpose                                  |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [rng-forms/README.md](rng-forms/README.md)                                                                           | Form engine guide with DSL patterns      |
| [rng-repository/README.md](rng-repository/README.md)                                                                 | Data access contract & freeze rules      |
| [rng-platform/rng-auth/app-auth-service/README.md](rng-platform/rng-auth/app-auth-service/README.md)                 | Auth service guarantees & non-guarantees |
| [rng-platform/rng-auth/app-auth-service/AUTH_MODEL.md](rng-platform/rng-auth/app-auth-service/AUTH_MODEL.md)         | Canonical auth model & invariants        |
| [rng-platform/rng-auth/app-auth-hooks/README.md](rng-platform/rng-auth/app-auth-hooks/README.md)                     | Hooks API & patterns                     |
| [rng-platform/rng-auth/app-auth-hooks/RETURN_SEMANTICS.md](rng-platform/rng-auth/app-auth-hooks/RETURN_SEMANTICS.md) | Null vs error handling                   |
| [rng-platform/rng-auth/app-auth-hooks/CACHING_STRATEGY.md](rng-platform/rng-auth/app-auth-hooks/CACHING_STRATEGY.md) | React Query cache patterns               |
| [.github/copilot-instructions.md](.github/copilot-instructions.md)                                                   | AI agent & contributor guidance          |

---

## 🚨 Common Pitfalls

### ❌ Don't

- Add business logic to form components (use services instead)
- Call `appAuthService` directly (use hooks from `app-auth-hooks`)
- Add methods to frozen modules (`rng-repository`, `app-auth-service`)
- Use `any` or bypass TypeScript strict mode
- Mutate frozen module contracts

### ✅ Do

- Keep forms as pure UI composition
- Use service hooks for all data access
- Add new code to `rng-platform/` (separate modules) or route handlers
- Extend via patterns (registry, DSL, hooks)
- Reference frozen module documentation

---

## 📞 Support

- **Frozen Module Questions**: See corresponding README.md
- **Form DSL Help**: [rng-forms/README.md](rng-forms/README.md) + examples
- **Auth Patterns**: [rng-platform/rng-auth/app-auth-hooks/README.md](rng-platform/rng-auth/app-auth-hooks/README.md)
- **Architecture Issues**: Open issue referencing [.github/copilot-instructions.md](.github/copilot-instructions.md)

---

## 📄 License

(Add your license here)

---

**Last Updated**: January 30, 2026  
**Status**: ✅ Production Ready  
**Stability**: 🔒 Frozen v1 cores, active development on features
