# User Roles, Permissions & Profit-Sharing Architecture

## System Roles & Access Matrix

### 1. Owner (Father / Super Administrator)
- **Full Access**: Has complete access to all modules, financial reporting, expenses, store settings, activity logs, and technician rosters.
- **Privacy & Visibility**: Can view all sales, all inventory, all repair job cards, and all financial metrics across all technicians.
- **Repair Profit Rule**: Receives **100%** of repair profit from repairs completed personally by him. Also receives **30%** of repair profit from repairs completed by the Second Technician.

### 2. Second Technician (Service Specialist)
- **Restricted Access**: Access to inventory, sales checkout, his own repair/service history, and his own earnings breakdown.
- **Privacy Enforcement**: CANNOT see Father's private repair history or Father's private repair earnings.
- **Repair Profit Rule**: For repairs completed by him, receives **70%** of repair profit. (The remaining 30% goes to the Owner).

### 3. Staff (POS Cashier & Receptionist)
- **Standard Access**: Access to inventory stock lookup, POS sales checkout, customer registration, and repair ticket intake/handover.
- **Privacy Enforcement**: CANNOT view technician-private earnings, owner's private repair earnings, or restricted financial profit reports.

---

## 📐 Finalized Repair Profit-Sharing Formula

```
REPAIR PROFIT = CUSTOMER SERVICE REVENUE - COST OF SPARE PARTS USED
```

### Key Accounting Distinctions:
1. **Customer Service Revenue**: Total amount charged to the customer for the repair service.
2. **Spare-Parts Cost**: Internal purchase/cost price of spare parts consumed during the repair.
3. **Repair Profit**: Service revenue minus spare-parts cost.

> [!IMPORTANT]
> **Spare Parts Cost Accounting**: Total customer payment must NOT be treated as technician profit. The cost of spare parts belongs to the business/store and MUST be deducted before calculating technician profit distribution.

### Profit Sharing Example:
- Customer Service Charge = ₹2,000
- Internal Spare Parts Cost = ₹500
- **Net Repair Profit**: ₹2,000 - ₹500 = **₹1,500**

#### Scenario A: Completed by Second Technician
- **Second Technician Share (70%)**: 0.70 × ₹1,500 = **₹1,050**
- **Owner Share (30%)**: 0.30 × ₹1,500 = **₹450**

#### Scenario B: Completed by Owner/Father
- **Owner Share (100%)**: 1.00 × ₹1,500 = **₹1,500**
- **Second Technician Share**: **₹0**

---

## 🔒 Security & Database RLS Requirements
- Frontend role checks exist strictly for UI rendering.
- Database-level Row Level Security (RLS) MUST enforce that Second Technicians and Staff cannot query Father's private repair history or store profit margins.
