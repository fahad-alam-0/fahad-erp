# Fahad ERP - Electronics Retail & Repair Management System

Fahad ERP is an enterprise-grade Progressive Web Application (PWA) built specifically for electronics retail stores and device repair service centers. Designed with clean architecture and SOLID principles, the platform supports multi-role authorization (Owner, Technician, Staff) and can scale from a single shop to a multi-store multi-warehouse SaaS infrastructure.

## 🚀 Tech Stack

- **Core**: React 19, TypeScript, Vite
- **Styling & UI**: Tailwind CSS, shadcn/ui design tokens, Lucide React Icons
- **State & Data Handling**: React Router v6, TanStack Query v5, Zustand, React Hook Form, Zod
- **Data Visualization**: Recharts
- **PWA & Offline**: Vite PWA Plugin
- **Code Quality**: ESLint, Prettier

## 📂 Project Architecture

The application follows a **Feature-Based Modular Architecture**:

```
src/
  ├── app/          # App providers, router setup, and core layouts
  ├── assets/       # Images, icons, logos, illustrations
  ├── components/   # Global reusable UI primitives and common wrappers
  ├── config/       # Environment, site, and tenant configurations
  ├── constants/    # Global constants, roles, and route definitions
  ├── features/     # Isolated domain modules (pages, components, hooks, services, types)
  ├── hooks/        # Shared application custom hooks
  ├── lib/          # Utilities and client initializers
  ├── services/     # Cross-cutting services (Supabase, Auth, Storage, Notifications)
  ├── store/        # Global state stores (Zustand)
  ├── styles/       # Design tokens, CSS variables, and global tailwind styles
  ├── types/        # Global TypeScript definitions
  └── utils/        # Generic helper functions
```

## 🛠️ Getting Started

```bash
# Clone repository
git clone https://github.com/your-org/fahad-erp.git

# Change working directory
cd fahad-erp

# Install dependencies
npm install

# Run development server
npm run dev

# Lint codebase
npm run lint

# Build for production
npm run build
```

## 📖 Documentation Suite

Comprehensive architecture and domain documentation is available:

- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Deep dive into folder responsibilities
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution rules & git workflows
- [CHANGELOG.md](./CHANGELOG.md) - Project release history
- [ROADMAP.md](./ROADMAP.md) - Multi-phase expansion plan (Multi-store, AI diagnostics)
- [API_GUIDELINES.md](./API_GUIDELINES.md) - Service interface standards
- [ERD.md](./ERD.md) - Entity Relationship Diagram outline
- [docs/PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md) - High-level vision & goals
- [docs/MODULES.md](./docs/MODULES.md) - Module-by-module feature definitions
- [docs/DATABASE_PLAN.md](./docs/DATABASE_PLAN.md) - PostgreSQL & Supabase schema roadmap
- [docs/USER_ROLES.md](./docs/USER_ROLES.md) - Owner, Technician, Staff permissions taxonomy
- [docs/CODING_STANDARDS.md](./docs/CODING_STANDARDS.md) - TypeScript, React & CSS guidelines
- [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) - Vercel / Netlify / Self-hosted deployment guide
