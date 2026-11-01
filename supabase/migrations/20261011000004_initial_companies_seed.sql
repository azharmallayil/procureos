-- ============================================================================
-- Migration: 20261011000004_initial_companies_seed.sql
-- Description: Baseline Company Entities Setup (Zero Production Data)
-- Note: PRODUCTION DATA MUST NOT BE CONNECTED UNTIL SECURITY POLICIES
--       AND RLS SUITES HAVE BEEN FULLY AUDITED.
-- ============================================================================

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
  'FITCO',
  'First Industrial Technologies & Commercial Operations Ltd.',
  '2050012345',
  '310234567800003',
  'SAR',
  'Al Khobar, Eastern Province, KSA',
  true
),
(
  '22222222-2222-4222-a222-222222222222',
  'ARABITRA',
  'ARABITRA',
  'Arabian Infrastructure & Trading Contracting Co.',
  '2051098765',
  '310987654300003',
  'SAR',
  'Dammam, Eastern Province, KSA',
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  legal_name = EXCLUDED.legal_name,
  updated_at = now();
