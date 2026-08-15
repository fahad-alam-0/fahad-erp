# Database & Supabase Preparation Plan

## V1 Single-Store Architecture Strategy

- **V1 Scope**: V1 is built specifically for **ONE physical store** (Fahad Electronics).
- **No Premature Multi-Store Tables**: Do NOT add `store_id` columns to V1 tables or build multi-tenant organization isolation schemas in V1.
- **Future Multi-Store SaaS Hierarchy**:
  ```
  Organization
      ↓
    Stores
      ↓
    Users
      ↓
  Business Data (Customers, Products, Job Cards, Sales)
  ```
  `src/config/tenant.config.ts` is maintained purely for future architectural readiness.

---

## Data Schema Principles for V1

### 1. Customers Table (Unauthenticated)
- Stores client contact records (`full_name`, `phone`, `alternate_phone`, `address`, `notes`).
- No passwords, auth tokens, or login fields.

### 2. Products / Spare Parts Table (Dual Pricing)
- Must include both `cost_price` (internal wholesale purchase cost) and `selling_price` (retail price).
- Repair profit queries must join `job_card_parts` with `products.cost_price`.

### 3. Job Cards & Repairs Table
- Stores `service_revenue` (amount charged for labor/service).
- Linked to `job_card_parts` (spare parts used with recorded cost prices).
- Stores `assigned_technician_id` to determine profit distribution.

### 4. Row Level Security (RLS) Privacy Rules
- **Technician Privacy**: Second Technician can only query job cards where `assigned_technician_id = auth.uid()`.
- **Owner Privileges**: Owner (`role = 'OWNER'`) can query all job cards, expenses, and financial summaries.

---

## 🧪 Acceptance Test Cases Blueprint (Future Verification)

```
Test 1: Owner Completed Repair
  - Service Revenue = ₹2,000 | Parts Cost = ₹500 | Tech = Owner/Father
  - Net Profit = ₹1,500
  - Expected Output: Owner Share = ₹1,500 | Tech Share = ₹0

Test 2: Second Technician Completed Repair
  - Service Revenue = ₹2,000 | Parts Cost = ₹500 | Tech = Second Technician
  - Net Profit = ₹1,500
  - Expected Output: Second Tech Share (70%) = ₹1,050 | Owner Share (30%) = ₹450

Test 3: Zero Spare Parts Repair (Second Tech)
  - Service Revenue = ₹1,000 | Parts Cost = ₹0 | Tech = Second Technician
  - Net Profit = ₹1,000
  - Expected Output: Second Tech Share (70%) = ₹700 | Owner Share (30%) = ₹300
```
