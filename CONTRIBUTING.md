# Contributing Guidelines

Thank you for contributing to **Fahad ERP**! To ensure the codebase remains clean, maintainable, and enterprise-grade, please follow these guidelines.

## Code Standards
1. **SOLID Principles**: Keep components focused on a single responsibility.
2. **Feature Isolation**: Never import feature-private components across features. If a component is shared, elevate it to `src/components/`.
3. **No Direct Business Logic in Views**: Move logic into custom hooks (`hooks/`) or domain services (`services/`).
4. **TypeScript**: Do not use `any`. Define strict types under `types/` or feature-specific `types/`.

## Workflow
1. Branch off `main` using naming convention `feat/feature-name` or `fix/bug-name`.
2. Ensure `npm run lint` and `npm run build` pass cleanly before submitting PRs.
3. Keep PRs targeted and well-documented.
