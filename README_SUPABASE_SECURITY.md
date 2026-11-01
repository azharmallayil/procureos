# ProcureOS PostgreSQL & Supabase Security Architecture
## Multi-Tenant Isolation for FITCO & Arabitra

This document outlines the database schema, security boundaries, and validation test suite for **ProcureOS by Fitco**.

---

## 1. Security Core Directives

1. **Zero Service-Role Credentials in Browser:**
   - Client applications only use `VITE_SUPABASE_ANON_KEY`.
   - All authorization checks are server-enforced in PostgreSQL via **Row Level Security (RLS)** and **Security Definer** routines.
2. **Compound Key Isolation (Engine-Level Cross-Tenant Barrier):**
   - Every tenant-owned table incorporates `company_id uuid NOT NULL REFERENCES companies(id)`.
   - Tables feature a compound unique constraint: `UNIQUE (id, company_id)`.
   - Relational foreign keys are defined as compound foreign keys:
     ```sql
     FOREIGN KEY (vendor_id, company_id) REFERENCES vendors(id, company_id)
     ```
     **Why this matters:** Even if an application bug or malicious actor attempts to link a FITCO Purchase Order to an Arabitra Vendor, PostgreSQL automatically rejects the query with `foreign_key_violation` because the tuple `(vendor_id, fitco_id)` does not exist.
3. **Immutable Tenant Identifier (`company_id`):**
   - A `BEFORE UPDATE` trigger function (`prevent_company_id_mutation()`) blocks any attempt to mutate `company_id` on existing records.
4. **Append-Only Immutable Audit Trail:**
   - `audit_events` records state changes, approvals, and payment releases.
   - Triggers strictly prevent any `UPDATE` or `DELETE` on `audit_events`.
5. **No Production Data Until Sign-Off:**
   - Migrations only seed foundational entity identities (`FITCO` and `ARABITRA`).
   - No sensitive vendor pricing, operational records, or production secrets are introduced.

---

## 2. Normalized Schema Inventory

| Table Name | Description | Compound Key / Constraints |
| :--- | :--- | :--- |
| `companies` | Multi-entity root (`FITCO`, `ARABITRA`) | `code UNIQUE CHECK (IN ('FITCO','ARABITRA'))` |
| `company_memberships` | User memberships and RBAC roles | `UNIQUE (company_id, user_id)` |
| `vendors` | Approved suppliers and Aramco vendor codes | `UNIQUE (id, company_id)`, `UNIQUE (company_id, vendor_code)` |
| `items` | Material catalog and inventory SKUs | `UNIQUE (id, company_id)`, `UNIQUE (company_id, sku)`, FK `(primary_vendor_id, company_id)` |
| `rfqs` | Competitive tenders & procurement requisitions | `UNIQUE (id, company_id)`, `UNIQUE (company_id, rfq_number)`, FK `(target_item_id, company_id)` |
| `quotations` | Commercial bids and compliance evaluations | `UNIQUE (id, company_id)`, FK `(rfq_id, company_id)`, FK `(vendor_id, company_id)` |
| `purchase_orders` | Legally binding purchase contracts | `UNIQUE (id, company_id)`, `UNIQUE (company_id, po_number)`, FK `(vendor_id, company_id)` |
| `po_lines` | Itemized line entries for POs | `UNIQUE (id, company_id)`, `UNIQUE (po_id, line_number)`, FK `(po_id, company_id)` |
| `deliveries` | Shipments, logistics, and GRN inspection reports | `UNIQUE (id, company_id)`, `UNIQUE (company_id, delivery_tracking_number)` |
| `invoices` | Commercial invoices matched against POs | `UNIQUE (id, company_id)`, `UNIQUE (company_id, invoice_number)` |
| `payments` | Milestone payment disbursements (SARIE Wire) | `UNIQUE (id, company_id)`, `UNIQUE (company_id, payment_reference)` |
| `assets` | Deployed heavy equipment and telematics | `UNIQUE (id, company_id)`, `UNIQUE (company_id, asset_tag)` |
| `audit_events` | Immutable security and regulatory event ledger | Append-only trigger guard (`prevent_audit_event_mutation()`) |

---

## 3. RBAC Role Matrix

Supported roles defined in enum `public.user_role`:
- `admin`: Full administrative control over company configuration and membership management.
- `procurement_manager`: Full lifecycle management across RFQs, POs, vendors, and audit inspection.
- `buyer`: Creation and management of RFQs, quotations, items, and PO drafts.
- `approver`: Executive review and formal approval authority for high-value POs and milestone payments.
- `viewer`: Read-only access strictly bounded to their assigned company scope.

### Dual-Company Memberships
Users can hold distinct memberships and roles in both companies simultaneously (e.g. `buyer` in FITCO, `approver` in Arabitra). Row Level Security evaluates active memberships dynamically per company context.

---

## 4. Migration Files

All migration files are located in `supabase/migrations/`:
1. `20261011000001_core_schema.sql`: Extensions, enums, normalized tables, composite constraints, and updated_at triggers.
2. `20261011000002_security_and_rls.sql`: RLS enablement, security helper functions, immutable company_id triggers, and policy sets.
3. `20261011000003_audit_triggers.sql`: Automated lifecycle state auditing to `audit_events`.
4. `20261011000004_initial_companies_seed.sql`: Baseline company master records (`FITCO` & `ARABITRA`).

---

## 5. Automated Verification Test Suite

Test script located in `supabase/tests/rls_cross_company_test.sql`:

### Test Cases Executed:
- **Test 1 (Cross-Company Read):** Verifies that a FITCO user cannot read Arabitra records (0 rows returned).
- **Test 2 (Cross-Company Insert):** Verifies that a FITCO user attempting to inject an Arabitra vendor is rejected by RLS.
- **Test 3 (Cross-Company Update):** Verifies that a cross-company UPDATE affects 0 rows.
- **Test 4 (Cross-Company Delete):** Verifies that cross-company DELETE affects 0 rows.
- **Test 5 (Immutable company_id Mutation):** Verifies that an attempt to mutate `company_id` on an existing record throws `company_id is strictly immutable`.
- **Test 6 (Cross-Company Foreign Key Injection):** Verifies that attempting to bind an Arabitra vendor to a FITCO PO fails via PostgreSQL `foreign_key_violation`.
- **Test 7 (Privilege Escalation on Memberships):** Verifies that non-admin users cannot grant admin roles or add members.
- **Test 8 (Dual Membership Scope):** Verifies that a user with memberships in both companies can legitimately access records in both entities.

### Running the Test Suite:
```bash
# Using Supabase CLI or psql against your local/staging database:
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/tests/rls_cross_company_test.sql
```
