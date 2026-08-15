# Service & API Guidelines

To maintain consistency across feature services in **Fahad ERP**:

## Service Signature Rules
1. Every service module resides within `features/<module>/services/` or `src/services/`.
2. Services MUST accept typed input objects and return standard response wrappers:
   ```typescript
   export interface ApiResponse<T> {
     data: T | null;
     error: string | null;
     success: boolean;
   }
   ```
3. Never expose raw database schema models directly to views; map through DTOs or Zod validators defined in `features/<module>/validation/`.
4. Handle offline queuing & TanStack Query caching cleanly at the service boundary.
