-- ============================================================================
-- Migration: 20261011000002_security_and_rls.sql
-- Description: Server-Enforced RLS Policies, Immutability Guards, and RBAC
-- Multi-Tenancy: FITCO & Arabitra Strict Isolation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SECURITY HELPER FUNCTIONS (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- Check if current authenticated user has active membership with allowed roles
CREATE OR REPLACE FUNCTION public.has_company_membership(
  target_company_id uuid,
  allowed_roles public.user_role[] DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.company_memberships cm
    WHERE cm.user_id = auth.uid()
      AND cm.company_id = target_company_id
      AND cm.is_active = true
      AND (
        allowed_roles IS NULL
        OR cm.role = ANY(allowed_roles)
      )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Check if current authenticated user is an administrator for the target company
CREATE OR REPLACE FUNCTION public.is_company_admin(target_company_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN public.has_company_membership(target_company_id, ARRAY['admin'::public.user_role]);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Return all company IDs that the authenticated user belongs to
CREATE OR REPLACE FUNCTION public.get_authenticated_user_company_ids()
RETURNS TABLE (company_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT cm.company_id
  FROM public.company_memberships cm
  WHERE cm.user_id = auth.uid()
    AND cm.is_active = true;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 2. IMMUTABILITY GUARDS (PREVENT COMPANY_ID MUTATION)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_company_id_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'Security Violation: company_id is strictly immutable once assigned (attempted change from % to %)',
      OLD.company_id, NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Prevent tampering with audit trail events
CREATE OR REPLACE FUNCTION public.prevent_audit_event_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Security Violation: Audit log records are append-only and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach company_id immutability trigger to all tenant-owned tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'company_memberships', 'vendors', 'items', 'rfqs', 'quotations',
        'purchase_orders', 'po_lines', 'deliveries', 'invoices',
        'payments', 'assets'
      )
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%I_prevent_company_mutation ON public.%I;
      CREATE TRIGGER trg_%I_prevent_company_mutation
      BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.prevent_company_id_mutation();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- Attach append-only immutability trigger to audit_events
DROP TRIGGER IF EXISTS trg_audit_events_immutable_update ON public.audit_events;
CREATE TRIGGER trg_audit_events_immutable_update
BEFORE UPDATE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_event_mutation();

DROP TRIGGER IF EXISTS trg_audit_events_immutable_delete ON public.audit_events;
CREATE TRIGGER trg_audit_events_immutable_delete
BEFORE DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_event_mutation();

-- ----------------------------------------------------------------------------
-- 3. ENABLE RLS ON ALL TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners to avoid accidental bypass in application sessions
ALTER TABLE public.companies FORCE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vendors FORCE ROW LEVEL SECURITY;
ALTER TABLE public.items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rfqs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.quotations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.po_lines FORCE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.assets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events FORCE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 4. RLS POLICIES: COMPANIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "companies_select_members" ON public.companies;
CREATE POLICY "companies_select_members"
ON public.companies
FOR SELECT
TO authenticated
USING (
  public.has_company_membership(id)
);

DROP POLICY IF EXISTS "companies_update_admin" ON public.companies;
CREATE POLICY "companies_update_admin"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  public.is_company_admin(id)
)
WITH CHECK (
  public.is_company_admin(id)
);

-- ----------------------------------------------------------------------------
-- 5. RLS POLICIES: COMPANY MEMBERSHIPS (Admin-Restricted)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "memberships_select" ON public.company_memberships;
CREATE POLICY "memberships_select"
ON public.company_memberships
FOR SELECT
TO authenticated
USING (
  -- Users can view their own membership or company managers/admins can view their company roster
  user_id = auth.uid()
  OR public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role])
);

DROP POLICY IF EXISTS "memberships_insert_admin" ON public.company_memberships;
CREATE POLICY "memberships_insert_admin"
ON public.company_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_company_admin(company_id)
);

DROP POLICY IF EXISTS "memberships_update_admin" ON public.company_memberships;
CREATE POLICY "memberships_update_admin"
ON public.company_memberships
FOR UPDATE
TO authenticated
USING (
  public.is_company_admin(company_id)
)
WITH CHECK (
  public.is_company_admin(company_id)
);

DROP POLICY IF EXISTS "memberships_delete_admin" ON public.company_memberships;
CREATE POLICY "memberships_delete_admin"
ON public.company_memberships
FOR DELETE
TO authenticated
USING (
  public.is_company_admin(company_id)
);

-- ----------------------------------------------------------------------------
-- 6. RLS POLICIES: VENDORS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "vendors_select" ON public.vendors;
CREATE POLICY "vendors_select"
ON public.vendors
FOR SELECT
TO authenticated
USING (
  public.has_company_membership(company_id)
);

DROP POLICY IF EXISTS "vendors_insert" ON public.vendors;
CREATE POLICY "vendors_insert"
ON public.vendors
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

DROP POLICY IF EXISTS "vendors_update" ON public.vendors;
CREATE POLICY "vendors_update"
ON public.vendors
FOR UPDATE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
)
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

DROP POLICY IF EXISTS "vendors_delete" ON public.vendors;
CREATE POLICY "vendors_delete"
ON public.vendors
FOR DELETE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role])
);

-- ----------------------------------------------------------------------------
-- 7. RLS POLICIES: ITEMS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "items_select" ON public.items;
CREATE POLICY "items_select"
ON public.items
FOR SELECT
TO authenticated
USING (
  public.has_company_membership(company_id)
);

DROP POLICY IF EXISTS "items_insert" ON public.items;
CREATE POLICY "items_insert"
ON public.items
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

DROP POLICY IF EXISTS "items_update" ON public.items;
CREATE POLICY "items_update"
ON public.items
FOR UPDATE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
)
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

DROP POLICY IF EXISTS "items_delete" ON public.items;
CREATE POLICY "items_delete"
ON public.items
FOR DELETE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role])
);

-- ----------------------------------------------------------------------------
-- 8. RLS POLICIES: RFQs
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rfqs_select" ON public.rfqs;
CREATE POLICY "rfqs_select"
ON public.rfqs
FOR SELECT
TO authenticated
USING (
  public.has_company_membership(company_id)
);

DROP POLICY IF EXISTS "rfqs_insert" ON public.rfqs;
CREATE POLICY "rfqs_insert"
ON public.rfqs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

DROP POLICY IF EXISTS "rfqs_update" ON public.rfqs;
CREATE POLICY "rfqs_update"
ON public.rfqs
FOR UPDATE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
)
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

DROP POLICY IF EXISTS "rfqs_delete" ON public.rfqs;
CREATE POLICY "rfqs_delete"
ON public.rfqs
FOR DELETE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role])
);

-- ----------------------------------------------------------------------------
-- 9. RLS POLICIES: QUOTATIONS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "quotations_select" ON public.quotations;
CREATE POLICY "quotations_select"
ON public.quotations
FOR SELECT
TO authenticated
USING (
  public.has_company_membership(company_id)
);

DROP POLICY IF EXISTS "quotations_insert" ON public.quotations;
CREATE POLICY "quotations_insert"
ON public.quotations
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

DROP POLICY IF EXISTS "quotations_update" ON public.quotations;
CREATE POLICY "quotations_update"
ON public.quotations
FOR UPDATE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role, 'approver'::public.user_role])
)
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role, 'approver'::public.user_role])
);

DROP POLICY IF EXISTS "quotations_delete" ON public.quotations;
CREATE POLICY "quotations_delete"
ON public.quotations
FOR DELETE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role])
);

-- ----------------------------------------------------------------------------
-- 10. RLS POLICIES: PURCHASE ORDERS & PO LINES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "purchase_orders_select" ON public.purchase_orders;
CREATE POLICY "purchase_orders_select"
ON public.purchase_orders
FOR SELECT
TO authenticated
USING (
  public.has_company_membership(company_id)
);

DROP POLICY IF EXISTS "purchase_orders_insert" ON public.purchase_orders;
CREATE POLICY "purchase_orders_insert"
ON public.purchase_orders
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

DROP POLICY IF EXISTS "purchase_orders_update" ON public.purchase_orders;
CREATE POLICY "purchase_orders_update"
ON public.purchase_orders
FOR UPDATE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role, 'approver'::public.user_role])
)
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role, 'approver'::public.user_role])
);

DROP POLICY IF EXISTS "purchase_orders_delete" ON public.purchase_orders;
CREATE POLICY "purchase_orders_delete"
ON public.purchase_orders
FOR DELETE
TO authenticated
USING (
  -- Only unissued drafts can be deleted by admin or procurement manager
  status = 'Draft'
  AND public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role])
);

-- PO LINES
DROP POLICY IF EXISTS "po_lines_select" ON public.po_lines;
CREATE POLICY "po_lines_select"
ON public.po_lines
FOR SELECT
TO authenticated
USING (
  public.has_company_membership(company_id)
);

DROP POLICY IF EXISTS "po_lines_insert" ON public.po_lines;
CREATE POLICY "po_lines_insert"
ON public.po_lines
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

DROP POLICY IF EXISTS "po_lines_update" ON public.po_lines;
CREATE POLICY "po_lines_update"
ON public.po_lines
FOR UPDATE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
)
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

DROP POLICY IF EXISTS "po_lines_delete" ON public.po_lines;
CREATE POLICY "po_lines_delete"
ON public.po_lines
FOR DELETE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role])
);

-- ----------------------------------------------------------------------------
-- 11. RLS POLICIES: DELIVERIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "deliveries_select" ON public.deliveries;
CREATE POLICY "deliveries_select"
ON public.deliveries
FOR SELECT
TO authenticated
USING (
  public.has_company_membership(company_id)
);

DROP POLICY IF EXISTS "deliveries_insert" ON public.deliveries;
CREATE POLICY "deliveries_insert"
ON public.deliveries
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

DROP POLICY IF EXISTS "deliveries_update" ON public.deliveries;
CREATE POLICY "deliveries_update"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role, 'approver'::public.user_role])
)
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role, 'approver'::public.user_role])
);

-- ----------------------------------------------------------------------------
-- 12. RLS POLICIES: INVOICES & PAYMENTS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
CREATE POLICY "invoices_select"
ON public.invoices
FOR SELECT
TO authenticated
USING (
  public.has_company_membership(company_id)
);

DROP POLICY IF EXISTS "invoices_insert" ON public.invoices;
CREATE POLICY "invoices_insert"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

DROP POLICY IF EXISTS "invoices_update" ON public.invoices;
CREATE POLICY "invoices_update"
ON public.invoices
FOR UPDATE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'approver'::public.user_role])
)
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'approver'::public.user_role])
);

-- PAYMENTS
DROP POLICY IF EXISTS "payments_select" ON public.payments;
CREATE POLICY "payments_select"
ON public.payments
FOR SELECT
TO authenticated
USING (
  public.has_company_membership(company_id)
);

DROP POLICY IF EXISTS "payments_insert" ON public.payments;
CREATE POLICY "payments_insert"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role])
);

DROP POLICY IF EXISTS "payments_update" ON public.payments;
CREATE POLICY "payments_update"
ON public.payments
FOR UPDATE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'approver'::public.user_role])
)
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'approver'::public.user_role])
);

-- ----------------------------------------------------------------------------
-- 13. RLS POLICIES: ASSETS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "assets_select" ON public.assets;
CREATE POLICY "assets_select"
ON public.assets
FOR SELECT
TO authenticated
USING (
  public.has_company_membership(company_id)
);

DROP POLICY IF EXISTS "assets_insert" ON public.assets;
CREATE POLICY "assets_insert"
ON public.assets
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

DROP POLICY IF EXISTS "assets_update" ON public.assets;
CREATE POLICY "assets_update"
ON public.assets
FOR UPDATE
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
)
WITH CHECK (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role, 'buyer'::public.user_role])
);

-- ----------------------------------------------------------------------------
-- 14. RLS POLICIES: AUDIT EVENTS (Append-Only Ledger)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_events_select" ON public.audit_events;
CREATE POLICY "audit_events_select"
ON public.audit_events
FOR SELECT
TO authenticated
USING (
  public.has_company_membership(company_id, ARRAY['admin'::public.user_role, 'procurement_manager'::public.user_role])
);

DROP POLICY IF EXISTS "audit_events_insert" ON public.audit_events;
CREATE POLICY "audit_events_insert"
ON public.audit_events
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_company_membership(company_id)
);
-- Note: NO UPDATE OR DELETE policies are created for audit_events.
