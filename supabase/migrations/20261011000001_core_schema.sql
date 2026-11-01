-- ============================================================================
-- Migration: 20261011000001_core_schema.sql
-- Description: Core Normalized PostgreSQL Schema for ProcureOS (FITCO & Arabitra)
-- Security: Multi-tenant tenant-isolation enforced via compound primary/unique
--           keys and foreign keys.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean schema types if rerunning
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'admin',
    'procurement_manager',
    'buyer',
    'approver',
    'viewer'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 1. COMPANIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL CHECK (code IN ('FITCO', 'ARABITRA')),
  name text NOT NULL,
  legal_name text,
  cr_number text,
  tax_id text,
  currency text NOT NULL DEFAULT 'SAR',
  headquarters text DEFAULT 'Eastern Province, Kingdom of Saudi Arabia',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. COMPANY MEMBERSHIPS (Multi-tenant RBAC with Supabase Auth)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'viewer',
  department text,
  title text,
  is_active boolean NOT NULL DEFAULT true,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_company_membership UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.company_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_company_id ON public.company_memberships(company_id);

-- ----------------------------------------------------------------------------
-- 3. VENDORS & SUPPLIERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  vendor_code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  contact_person text,
  contact_email text,
  contact_phone text,
  cr_number text,
  vat_number text,
  aramco_vendor_id text,
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Under Review', 'Suspended', 'Blacklisted')),
  rating numeric(3,2) CHECK (rating >= 0 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_vendor_id_company UNIQUE (id, company_id),
  CONSTRAINT uq_vendor_code_company UNIQUE (company_id, vendor_code)
);

CREATE INDEX IF NOT EXISTS idx_vendors_company_id ON public.vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON public.vendors(company_id, status);

-- ----------------------------------------------------------------------------
-- 4. ITEMS & CATALOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  unit_of_measure text NOT NULL DEFAULT 'EA',
  stock_level numeric(14,2) NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
  reorder_point numeric(14,2) NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
  unit_price_sar numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_price_sar >= 0),
  primary_vendor_id uuid,
  location text,
  status text NOT NULL DEFAULT 'In Stock' CHECK (status IN ('In Stock', 'Low Stock', 'Critical', 'Discontinued')),
  lead_time_days integer DEFAULT 0 CHECK (lead_time_days >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_item_id_company UNIQUE (id, company_id),
  CONSTRAINT uq_item_sku_company UNIQUE (company_id, sku),
  -- Enforce compound foreign key to prevent cross-company vendor assignment
  CONSTRAINT fk_item_vendor_company FOREIGN KEY (primary_vendor_id, company_id)
    REFERENCES public.vendors(id, company_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_items_company_id ON public.items(company_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items(company_id, category);
CREATE INDEX IF NOT EXISTS idx_items_stock_status ON public.items(company_id, status);

-- ----------------------------------------------------------------------------
-- 5. RFQs & TENDERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  rfq_number text NOT NULL,
  title text NOT NULL,
  project_name text NOT NULL,
  target_item_id uuid,
  quantity numeric(14,2) NOT NULL CHECK (quantity > 0),
  estimated_budget_sar numeric(14,2) CHECK (estimated_budget_sar >= 0),
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Open', 'Evaluating', 'Awarded', 'Closed', 'Cancelled')),
  due_date date NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_rfq_id_company UNIQUE (id, company_id),
  CONSTRAINT uq_rfq_number_company UNIQUE (company_id, rfq_number),
  -- Enforce compound foreign key to prevent cross-company item referencing
  CONSTRAINT fk_rfq_item_company FOREIGN KEY (target_item_id, company_id)
    REFERENCES public.items(id, company_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rfqs_company_id ON public.rfqs(company_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_status ON public.rfqs(company_id, status);

-- ----------------------------------------------------------------------------
-- 6. QUOTATIONS & BIDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  rfq_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  quote_reference text NOT NULL,
  unit_price_sar numeric(14,2) NOT NULL CHECK (unit_price_sar >= 0),
  total_price_sar numeric(14,2) NOT NULL CHECK (total_price_sar >= 0),
  delivery_lead_weeks integer CHECK (delivery_lead_weeks >= 0),
  validity_date date NOT NULL,
  compliance_rating numeric(3,2) CHECK (compliance_rating >= 0 AND compliance_rating <= 5),
  status text NOT NULL DEFAULT 'Received' CHECK (status IN ('Received', 'Shortlisted', 'Awarded', 'Rejected', 'Expired')),
  proposal_document_url text,
  notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_quotation_id_company UNIQUE (id, company_id),
  -- Enforce compound foreign keys to prevent cross-company relationships
  CONSTRAINT fk_quotation_rfq_company FOREIGN KEY (rfq_id, company_id)
    REFERENCES public.rfqs(id, company_id) ON DELETE CASCADE,
  CONSTRAINT fk_quotation_vendor_company FOREIGN KEY (vendor_id, company_id)
    REFERENCES public.vendors(id, company_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_quotations_company_id ON public.quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_rfq ON public.quotations(company_id, rfq_id);
CREATE INDEX IF NOT EXISTS idx_quotations_vendor ON public.quotations(company_id, vendor_id);

-- ----------------------------------------------------------------------------
-- 7. PURCHASE ORDERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  po_number text NOT NULL,
  rfq_id uuid,
  quotation_id uuid,
  vendor_id uuid NOT NULL,
  project_name text NOT NULL,
  total_amount_sar numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount_sar >= 0),
  status text NOT NULL DEFAULT 'Draft' CHECK (
    status IN ('Draft', 'Pending Approval', 'Executive Review', 'Issued', 'Partially Received', 'Fulfilled', 'Cancelled')
  ),
  payment_terms text NOT NULL,
  delivery_deadline date,
  requires_executive_approval boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_po_id_company UNIQUE (id, company_id),
  CONSTRAINT uq_po_number_company UNIQUE (company_id, po_number),
  -- Enforce compound foreign keys to prevent cross-company relationships
  CONSTRAINT fk_po_vendor_company FOREIGN KEY (vendor_id, company_id)
    REFERENCES public.vendors(id, company_id) ON DELETE RESTRICT,
  CONSTRAINT fk_po_rfq_company FOREIGN KEY (rfq_id, company_id)
    REFERENCES public.rfqs(id, company_id) ON DELETE SET NULL,
  CONSTRAINT fk_po_quotation_company FOREIGN KEY (quotation_id, company_id)
    REFERENCES public.quotations(id, company_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pos_company_id ON public.purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_vendor ON public.purchase_orders(company_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_pos_status ON public.purchase_orders(company_id, status);

-- ----------------------------------------------------------------------------
-- 8. PO LINES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.po_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  po_id uuid NOT NULL,
  item_id uuid,
  line_number integer NOT NULL CHECK (line_number > 0),
  description text NOT NULL,
  quantity numeric(14,2) NOT NULL CHECK (quantity > 0),
  unit_price_sar numeric(14,2) NOT NULL CHECK (unit_price_sar >= 0),
  total_price_sar numeric(14,2) NOT NULL CHECK (total_price_sar >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_po_line_id_company UNIQUE (id, company_id),
  CONSTRAINT uq_po_line_number UNIQUE (po_id, line_number),
  -- Enforce compound foreign keys to prevent cross-company PO line relationships
  CONSTRAINT fk_poline_po_company FOREIGN KEY (po_id, company_id)
    REFERENCES public.purchase_orders(id, company_id) ON DELETE CASCADE,
  CONSTRAINT fk_poline_item_company FOREIGN KEY (item_id, company_id)
    REFERENCES public.items(id, company_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_polines_po_id ON public.po_lines(company_id, po_id);

-- ----------------------------------------------------------------------------
-- 9. DELIVERIES & LOGISTICS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  delivery_tracking_number text NOT NULL,
  po_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  grn_number text,
  status text NOT NULL DEFAULT 'In Transit' CHECK (
    status IN ('Scheduled', 'In Transit', 'Customs Clearance', 'Delivered', 'Delayed', 'Rejected')
  ),
  destination_site text NOT NULL,
  carrier_name text,
  expected_delivery_date date NOT NULL,
  actual_delivery_date date,
  qc_passed boolean,
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_delivery_id_company UNIQUE (id, company_id),
  CONSTRAINT uq_delivery_tracking_company UNIQUE (company_id, delivery_tracking_number),
  -- Compound foreign keys
  CONSTRAINT fk_delivery_po_company FOREIGN KEY (po_id, company_id)
    REFERENCES public.purchase_orders(id, company_id) ON DELETE RESTRICT,
  CONSTRAINT fk_delivery_vendor_company FOREIGN KEY (vendor_id, company_id)
    REFERENCES public.vendors(id, company_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_deliveries_company_id ON public.deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(company_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_po ON public.deliveries(company_id, po_id);

-- ----------------------------------------------------------------------------
-- 10. INVOICES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  invoice_number text NOT NULL,
  po_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  amount_sar numeric(14,2) NOT NULL CHECK (amount_sar >= 0),
  tax_amount_sar numeric(14,2) NOT NULL DEFAULT 0 CHECK (tax_amount_sar >= 0),
  status text NOT NULL DEFAULT 'Pending Review' CHECK (
    status IN ('Pending Review', 'Approved', 'Partially Paid', 'Paid', 'Disputed', 'Void')
  ),
  due_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_invoice_id_company UNIQUE (id, company_id),
  CONSTRAINT uq_invoice_number_company UNIQUE (company_id, invoice_number),
  -- Compound foreign keys
  CONSTRAINT fk_invoice_po_company FOREIGN KEY (po_id, company_id)
    REFERENCES public.purchase_orders(id, company_id) ON DELETE RESTRICT,
  CONSTRAINT fk_invoice_vendor_company FOREIGN KEY (vendor_id, company_id)
    REFERENCES public.vendors(id, company_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(company_id, status);

-- ----------------------------------------------------------------------------
-- 11. PAYMENTS & MILESTONES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  payment_reference text NOT NULL,
  invoice_id uuid NOT NULL,
  po_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  milestone_label text NOT NULL,
  amount_sar numeric(14,2) NOT NULL CHECK (amount_sar > 0),
  payment_method text NOT NULL DEFAULT 'SARIE Wire Transfer' CHECK (
    payment_method IN ('SARIE Wire Transfer', 'Letter of Credit', 'Corporate Cheque', 'Escrow')
  ),
  bank_reference text,
  status text NOT NULL DEFAULT 'Scheduled' CHECK (
    status IN ('Scheduled', 'Approved', 'Processing', 'Released', 'Failed', 'Cancelled')
  ),
  scheduled_date date NOT NULL,
  released_at timestamptz,
  released_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_id_company UNIQUE (id, company_id),
  CONSTRAINT uq_payment_ref_company UNIQUE (company_id, payment_reference),
  -- Compound foreign keys
  CONSTRAINT fk_payment_invoice_company FOREIGN KEY (invoice_id, company_id)
    REFERENCES public.invoices(id, company_id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_po_company FOREIGN KEY (po_id, company_id)
    REFERENCES public.purchase_orders(id, company_id) ON DELETE RESTRICT,
  CONSTRAINT fk_payment_vendor_company FOREIGN KEY (vendor_id, company_id)
    REFERENCES public.vendors(id, company_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_payments_company_id ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(company_id, status);

-- ----------------------------------------------------------------------------
-- 12. ASSETS & EQUIPMENT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  asset_tag text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  po_id uuid,
  vendor_id uuid,
  assigned_location text NOT NULL,
  current_operator text,
  condition text NOT NULL DEFAULT 'Operational' CHECK (
    condition IN ('Operational', 'Maintenance Required', 'In Repair', 'Decommissioned')
  ),
  next_maintenance_date date,
  telematics_serial text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_asset_id_company UNIQUE (id, company_id),
  CONSTRAINT uq_asset_tag_company UNIQUE (company_id, asset_tag),
  -- Compound foreign keys
  CONSTRAINT fk_asset_po_company FOREIGN KEY (po_id, company_id)
    REFERENCES public.purchase_orders(id, company_id) ON DELETE SET NULL,
  CONSTRAINT fk_asset_vendor_company FOREIGN KEY (vendor_id, company_id)
    REFERENCES public.vendors(id, company_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_assets_company_id ON public.assets(company_id);
CREATE INDEX IF NOT EXISTS idx_assets_condition ON public.assets(company_id, condition);

-- ----------------------------------------------------------------------------
-- 13. AUDIT EVENTS (Append-Only Immutable Event Ledger)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (
    action IN ('INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'APPROVAL', 'PAYMENT_RELEASE')
  ),
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_company_entity ON public.audit_events(company_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON public.audit_events(company_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- AUTOMATED UPDATED_AT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'companies', 'company_memberships', 'vendors', 'items', 'rfqs',
        'quotations', 'purchase_orders', 'po_lines', 'deliveries',
        'invoices', 'payments', 'assets'
      )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
      CREATE TRIGGER trg_%I_updated_at
      BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;
