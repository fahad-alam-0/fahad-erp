# Coding Standards & Architectural Guidelines

## 1. Feature-Based Architecture & Shared Layer Rules
- Business-domain code belongs inside `src/features/<feature-name>/`.
- Cross-cutting, generic code with genuine multi-feature utility belongs in `src/shared/` (`components/`, `hooks/`, `types/`, `utils/`, `validation/`, `constants/`).
- Do NOT place feature-specific business logic (such as Repair Profit calculations) in `src/shared/`. Feature-specific calculations belong inside `src/features/<feature-name>/calculations/` or `src/features/<feature-name>/services/`.

## 2. Business Logic Separation
- Pure calculations (POS totals, repair profit sharing, tax calculations) must be isolated from React UI components.
- Never write financial calculation formulas inside React JSX render methods or component bodies.

## 3. Customer Security & Privacy Rules
- Customers do NOT have web accounts, logins, or passwords.
- Privacy boundaries for roles (Owner vs Second Technician vs Staff) must be enforced at the server / Supabase Row Level Security (RLS) layer, not solely by hiding UI controls.

## 4. State Management Standards
- **Zustand**: Reserved exclusively for global client state (session token, active theme, UI sidebar/tab preferences).
- **TanStack Query**: Used for all server/database data fetching and caching. Server data must not be stored in global Zustand stores.

## 5. Audit Logging Standards
- Significant events (sales, repair updates, spare parts allocations, technician assignment changes, financial overrides) must emit Activity Log events.
