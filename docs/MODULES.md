# Module Specifications & Business Workflows

## 🛠️ Real-World Electronics Repair Workflow

The system is designed around the real-world repair intake and fulfillment lifecycle:

```
Customer brings device (e.g. TV / Smartphone)
  ↓
Record Customer Information (Name + Phone; Search existing or register new)
  ↓
Record Device Details & Issue Description
  ↓
Generate Repair Job Card
  ↓
Technician accepts/initiates job card
  ↓
Device Diagnosis & Fault Identification
  ↓
Repair Execution (Allocate internal spare parts if needed)
  ↓
Determine final Service Revenue Amount
  ↓
Customer Payment Processing
  ↓
Mark Repair Completed
  ↓
System calculates Net Repair Profit (Service Revenue - Internal Parts Cost)
  ↓
System calculates Technician Share (100% Owner OR 70% Tech / 30% Owner)
  ↓
Notify Customer (SMS / Call)
  ↓
Device Delivery & Receipt Handover
```

---

## 📦 Inventory Movements & Controlled Stock Adjustments

### Permanent Stock History (`inventory_movements`)
All stock changes are recorded as positive `quantity` entries in `inventory_movements` with direction determined by `movement_type`:
- **Increases Stock**: `PURCHASE`, `RETURN`, `ADJUSTMENT_IN`
- **Decreases Stock**: `SALE`, `REPAIR_USAGE`, `ADJUSTMENT_OUT`

### Manual Stock Adjustment Rules
- Direct overwriting of `products.stock_quantity` without an `inventory_movements` record is strictly prohibited.
- Every manual stock adjustment must specify `product_id`, `quantity`, `movement_type` (`ADJUSTMENT_IN` / `ADJUSTMENT_OUT`), `notes` (reason), `created_by` (user), and `created_at`.

### Purchase Integrity & Deletion Rules
- Physical deletion of historical `purchases` is forbidden.
- Order adjustments or cancellations are executed via cancellation flags and balancing reversal `inventory_movements` for full audit trails.

### Atomic Inventory Transactions
Future application service operations will atomically:
1. Validate available stock.
2. Record `inventory_movements` entry.
3. Update `products.stock_quantity`.
If any step fails, the entire database transaction rolls back.

---

## 👤 Customer Architecture (No Customer Auth Required)

Customers are store clients, NOT system app users.

- **No Authentication**: Customers do NOT have logins, passwords, or web accounts.
- **Customer Profile Data**:
  - Full Name
  - Phone Number (Primary key for lookup)
  - Alternate Phone Number (Optional)
  - Address (Optional)
  - Notes / Preferences
  - Sales & Purchase History
  - Repair Job Card History
- **Intake Flow**:
  - *New Customer*: Quick registration using Name + Phone.
  - *Existing Customer*: Fast search by Name or Phone to attach to new job cards or POS invoices.
