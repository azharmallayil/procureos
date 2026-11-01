-- ============================================================================
-- Migration: 20261011000003_audit_triggers.sql
-- Description: Automated Audit Trail Event Triggers for ProcureOS
-- Compliance: Aramco & Saudi SEC Auditability Standards
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_entity_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_entity_id uuid;
  v_action text;
  v_details jsonb;
  v_role text;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_company_id := OLD.company_id;
    v_entity_id := OLD.id;
    v_action := 'DELETE';
    v_details := jsonb_build_object('old_state', to_jsonb(OLD));
  ELSIF (TG_OP = 'INSERT') THEN
    v_company_id := NEW.company_id;
    v_entity_id := NEW.id;
    v_action := 'INSERT';
    v_details := jsonb_build_object('new_state', to_jsonb(NEW));
  ELSIF (TG_OP = 'UPDATE') THEN
    v_company_id := NEW.company_id;
    v_entity_id := NEW.id;
    v_action := 'UPDATE';

    -- Check for special domain actions
    IF TG_TABLE_NAME = 'purchase_orders' AND OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'Approved' OR NEW.status = 'Issued' THEN
        v_action := 'APPROVAL';
      ELSE
        v_action := 'STATUS_CHANGE';
      END IF;
    ELSIF TG_TABLE_NAME = 'payments' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Released' THEN
      v_action := 'PAYMENT_RELEASE';
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'STATUS_CHANGE';
    END IF;

    v_details := jsonb_build_object(
      'old_state', to_jsonb(OLD),
      'new_state', to_jsonb(NEW)
    );
  END IF;

  -- Attempt to get user role in this company
  SELECT role::text INTO v_role
  FROM public.company_memberships
  WHERE user_id = auth.uid()
    AND company_id = v_company_id
    AND is_active = true
  LIMIT 1;

  INSERT INTO public.audit_events (
    company_id,
    entity_type,
    entity_id,
    action,
    performed_by,
    user_role,
    details
  ) VALUES (
    v_company_id,
    TG_TABLE_NAME,
    v_entity_id,
    v_action,
    auth.uid(),
    COALESCE(v_role, 'system'),
    v_details
  );

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Attach automated audit triggers to critical procurement workflows
DROP TRIGGER IF EXISTS trg_audit_purchase_orders ON public.purchase_orders;
CREATE TRIGGER trg_audit_purchase_orders
AFTER INSERT OR UPDATE OR DELETE ON public.purchase_orders
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit_event();

DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
CREATE TRIGGER trg_audit_payments
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit_event();

DROP TRIGGER IF EXISTS trg_audit_rfqs ON public.rfqs;
CREATE TRIGGER trg_audit_rfqs
AFTER INSERT OR UPDATE OR DELETE ON public.rfqs
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit_event();

DROP TRIGGER IF EXISTS trg_audit_quotations ON public.quotations;
CREATE TRIGGER trg_audit_quotations
AFTER INSERT OR UPDATE OR DELETE ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit_event();

DROP TRIGGER IF EXISTS trg_audit_deliveries ON public.deliveries;
CREATE TRIGGER trg_audit_deliveries
AFTER INSERT OR UPDATE OR DELETE ON public.deliveries
FOR EACH ROW EXECUTE FUNCTION public.log_entity_audit_event();
