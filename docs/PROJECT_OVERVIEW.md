# Project Overview - Fahad ERP

## Executive Summary
**Fahad ERP** is a modern, lightweight Progressive Web Application (PWA) built specifically for **Fahad Electronics** (Single Store V1). It manages retail Point-of-Sale (POS) transactions, inventory, and complete device repair lifecycles.

## Core Domain Objectives
1. **Accurate Repair Profit & Technician Distribution**:
   - Calculates Net Repair Profit as `Service Revenue - Spare Parts Cost`.
   - Distributes 100% to Owner for self-completed repairs, or 70% to Second Technician and 30% to Owner for technician-completed repairs.
   - Preserves spare parts cost for store business accounts.
2. **Simplified Customer Management**:
   - Maintains client contact records without customer accounts or logins.
3. **PWA & Mobile-First Execution**:
   - Installable PWA optimized for Android smartphones, iPhones, and desktop computers.
4. **Clean Architectural Separation**:
   - Feature-based modular architecture (`src/features/`).
   - Pure business calculations decoupled from UI components and kept inside feature domain modules.
