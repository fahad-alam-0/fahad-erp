# Project Structure & Architecture Guide

Fahad ERP uses a **Feature-Based Modular Architecture** combined with a domain-driven layout and explicit `shared/` layer.

```
fahad-erp/
├── .env.example
├── API_GUIDELINES.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── ERD.md
├── PROJECT_STRUCTURE.md
├── README.md
├── ROADMAP.md
├── index.html
├── package.json
├── supabase/                 # Supabase infrastructure preparation
│   ├── functions/            # Edge functions
│   ├── migrations/           # SQL migration files
│   └── seed/                 # Database seeds
├── tests/                    # Automated testing suites
│   ├── e2e/                  # End-to-end tests (Playwright)
│   ├── integration/          # Component/Hook integration tests
│   └── unit/                 # Pure domain utility unit tests
└── src/
    ├── app/                  # Application routing & layout frame
    │   ├── layouts/          # AppLayout, DashboardLayout, AuthLayout, MobileBottomNav
    │   ├── providers/        # Multi-provider wrappers (AppProvider, ThemeProvider)
    │   └── router/           # Route definitions & guards (AuthGuard, RoleGuard)
    ├── assets/               # Static media (icons, illustrations, images, logos)
    ├── components/           # Reusable UI component libraries
    ├── config/               # System configs (env.ts, site.config.ts, tenant.config.ts, feature-flags)
    ├── constants/            # Application-wide constants
    ├── features/             # Modular business domains
    │   ├── activity-log/     # Audit logging & event types
    │   ├── analytics/
    │   ├── auth/
    │   ├── backup/
    │   ├── customer-management/
    │   ├── dashboard/
    │   ├── expense-management/
    │   ├── inventory-management/
    │   │   ├── brands/
    │   │   ├── categories/
    │   │   ├── products/
    │   │   ├── stock/
    │   │   └── suppliers/
    │   ├── notifications/
    │   ├── payments/
    │   ├── profile/
    │   ├── repair-management/
    │   │   ├── job-cards/
    │   │   ├── repair-status/
    │   │   ├── service-history/
    │   │   ├── spare-parts-used/
    │   │   └── warranty/
    │   ├── reports/
    │   ├── sales-management/
    │   ├── settings/
    │   └── technician-management/
    ├── hooks/                # Cross-cutting React hooks
    ├── lib/                  # Library utilities & error handling
    │   ├── error-handler/    # Global error formatter
    │   ├── errors/           # AppError, ValidationError, AuthError
    │   └── supabase.ts       # Supabase client placeholder
    ├── services/             # Cross-cutting platform services
    ├── shared/               # Shared layer for genuinely reusable cross-feature code
    │   ├── components/       # ErrorBoundary, shared UI primitives
    │   ├── constants/        # Shared constants & route keys
    │   ├── hooks/            # useOnlineStatus, useQueryCustom
    │   ├── types/            # Shared base types & entities
    │   ├── utils/            # domain-calculations.ts, formatters
    │   └── validation/       # Shared Zod validators
    ├── store/                # Global client state (Auth session, Theme, UI preferences)
    ├── styles/               # Design tokens & HSL CSS variables
    ├── types/                # Core TypeScript interfaces
    └── utils/                # Helper functions
```
