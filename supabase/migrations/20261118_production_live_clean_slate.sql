-- ============================================================================
-- Migration: 20261118_production_live_clean_slate.sql
-- Description: Transition Database to Live Office Production Stage
-- 1. Purge all test transactions and mock records from Supabase tables
-- 2. Preserve authoritative Master Company Entities (FITCO & ARABITRA)
-- 3. Initialize procureos_records key-value store to clean production state
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PURGE DEMO & TESTING TRANSACTIONS
-- ----------------------------------------------------------------------------
TRUNCATE TABLE public.audit_events CASCADE;
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.invoices CASCADE;
TRUNCATE TABLE public.deliveries CASCADE;
TRUNCATE TABLE public.po_lines CASCADE;
TRUNCATE TABLE public.purchase_orders CASCADE;
TRUNCATE TABLE public.quotations CASCADE;
TRUNCATE TABLE public.rfqs CASCADE;
TRUNCATE TABLE public.assets CASCADE;

-- Clear items and vendors (ready for genuine corporate catalog import)
TRUNCATE TABLE public.items CASCADE;
TRUNCATE TABLE public.vendors CASCADE;

-- ----------------------------------------------------------------------------
-- 2. RESET PROCUREOS LIVE KEY-VALUE CLOUD STORE
-- ----------------------------------------------------------------------------
INSERT INTO public.procureos_records (key, data, updated_at)
VALUES
  ('procureos_requisitions', '[]'::jsonb, now()),
  ('procureos_rfqs', '[]'::jsonb, now()),
  ('procureos_quotations', '[]'::jsonb, now()),
  ('procureos_purchase_orders', '[]'::jsonb, now()),
  ('procureos_deliveries', '[]'::jsonb, now()),
  ('procureos_payments', '[]'::jsonb, now()),
  ('procureos_assets', '[]'::jsonb, now()),
  ('procureos_items', '[]'::jsonb, now()),
  ('procureos_vendors', '[]'::jsonb, now()),
  ('procureos_db_version', '"2026.11.18.production_live"'::jsonb, now()),
  ('procureos_environment', '"production"'::jsonb, now())
ON CONFLICT (key) DO UPDATE SET
  data = EXCLUDED.data,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 3. ENSURE ACTIVE LEGAL CORPORATE ENTITIES
-- ----------------------------------------------------------------------------
INSERT INTO public.companies (
  id,
  code,
  name,
  legal_name,
  cr_number,
  tax_id,
  currency,
  headquarters,
  is_active
) VALUES
(
  '11111111-1111-4111-a111-111111111111',
  'FITCO',
  'FITCO (First Industrial Technologies)',
  'First Industrial Technologies & Commercial Operations Ltd.',
  '2050012345',
  '310234567800003',
  'SAR',
  'Al Khobar, Eastern Province, Kingdom of Saudi Arabia',
  true
),
(
  '22222222-2222-4222-a222-222222222222',
  'ARABITRA',
  'ARABITRA (Arabian Infrastructure & Trading)',
  'Arabian Infrastructure & Trading Contracting Co.',
  '2051098765',
  '310987654300003',
  'SAR',
  'Dammam, Eastern Province, Kingdom of Saudi Arabia',
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  legal_name = EXCLUDED.legal_name,
  cr_number = EXCLUDED.cr_number,
  tax_id = EXCLUDED.tax_id,
  headquarters = EXCLUDED.headquarters,
  is_active = true,
  updated_at = now();

-- ----------------------------------------------------------------------------
-- 4. LOG IMMUTABLE AUDIT RECORD
-- ----------------------------------------------------------------------------
INSERT INTO public.audit_events (
  event_type,
  entity_type,
  entity_id,
  details,
  actor_name,
  actor_role
) VALUES (
  'PROD_CUTOVER',
  'System',
  'PROD-2026-LIVE',
  jsonb_build_object(
    'action', 'Transition to Live Office Production Stage',
    'status', 'Clean Slate Initialized',
    'entities', ARRAY['FITCO', 'ARABITRA'],
    'timestamp', now()
  ),
  'System Administrator',
  'Super Admin'
);
