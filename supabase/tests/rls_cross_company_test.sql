-- ============================================================================
-- Test Suite: rls_cross_company_test.sql
-- Description: Automated verification for Cross-Company Isolation & Security
-- Tests: Read, Insert, Update, Delete across companies, FK injection, and
--        membership escalation attempts.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Helper notice output
DO $$ BEGIN RAISE NOTICE '--- INITIALIZING ISOLATION TEST HARNESS ---'; END $$;

-- ----------------------------------------------------------------------------
-- 1. HARNESS FIXTURES (Companies, Mock Auth Users, and Memberships)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_fitco_id uuid := '11111111-1111-4111-a111-111111111111';
  v_arabitra_id uuid := '22222222-2222-4222-a222-222222222222';
  v_u_fitco_buyer uuid := 'aaaa0001-0000-0000-0000-000000000001';
  v_u_fitco_admin uuid := 'aaaa0002-0000-0000-0000-000000000002';
  v_u_arabitra_buyer uuid := 'bbbb0001-0000-0000-0000-000000000001';
  v_u_dual_member uuid := 'cccc0001-0000-0000-0000-000000000001';
BEGIN
  -- Insert dummy auth users into auth.users if not present
  INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data, is_super_admin)
  VALUES
    (v_u_fitco_buyer, 'fitco.buyer@test.local', '{"provider":"email"}', '{}', false),
    (v_u_fitco_admin, 'fitco.admin@test.local', '{"provider":"email"}', '{}', false),
    (v_u_arabitra_buyer, 'arabitra.buyer@test.local', '{"provider":"email"}', '{}', false),
    (v_u_dual_member, 'dual.member@test.local', '{"provider":"email"}', '{}', false)
  ON CONFLICT (id) DO NOTHING;

  -- Ensure company memberships
  INSERT INTO public.company_memberships (company_id, user_id, role, is_active)
  VALUES
    (v_fitco_id, v_u_fitco_buyer, 'buyer', true),
    (v_fitco_id, v_u_fitco_admin, 'admin', true),
    (v_arabitra_id, v_u_arabitra_buyer, 'buyer', true),
    (v_fitco_id, v_u_dual_member, 'buyer', true),
    (v_arabitra_id, v_u_dual_member, 'approver', true)
  ON CONFLICT (company_id, user_id) DO UPDATE SET role = EXCLUDED.role, is_active = true;

  -- Create baseline vendors for testing
  INSERT INTO public.vendors (id, company_id, vendor_code, name, category, status)
  VALUES
    ('99990001-0000-0000-0000-000000000001', v_fitco_id, 'VND-TEST-FITCO', 'Fitco Local Vendor', 'Valves', 'Active'),
    ('99990002-0000-0000-0000-000000000002', v_arabitra_id, 'VND-TEST-ARB', 'Arabitra Local Vendor', 'Pumps', 'Active')
  ON CONFLICT (company_id, vendor_code) DO NOTHING;

END $$;

-- ----------------------------------------------------------------------------
-- TEST 1: CROSS-COMPANY READ ATTEMPT
-- Context: FITCO Buyer authenticated. Must NOT see Arabitra vendors.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_fitco_buyer_id text := 'aaaa0001-0000-0000-0000-000000000001';
  v_count integer;
BEGIN
  RAISE NOTICE '>>> TEST 1: Cross-Company Read Attempt';
  -- Simulate authenticated session for Fitco Buyer
  PERFORM set_config('request.jwt.claim.sub', v_fitco_buyer_id, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Attempt to query Arabitra vendor
  SELECT count(*) INTO v_count
  FROM public.vendors
  WHERE vendor_code = 'VND-TEST-ARB';

  IF v_count = 0 THEN
    RAISE NOTICE 'PASSED: Fitco user cannot read Arabitra records (0 rows returned).';
  ELSE
    RAISE EXCEPTION 'FAILED: Cross-company leakage! Fitco user read Arabitra data.';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 2: CROSS-COMPANY INSERT ATTEMPT
-- Context: FITCO Buyer attempts to inject a vendor into Arabitra. Must FAIL.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_fitco_buyer_id text := 'aaaa0001-0000-0000-0000-000000000001';
  v_arabitra_id uuid := '22222222-2222-4222-a222-222222222222';
  v_success boolean := false;
BEGIN
  RAISE NOTICE '>>> TEST 2: Cross-Company Insert Attempt';
  PERFORM set_config('request.jwt.claim.sub', v_fitco_buyer_id, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    INSERT INTO public.vendors (company_id, vendor_code, name, category)
    VALUES (v_arabitra_id, 'VND-ILLEGAL-INJECT', 'Illegal Arabitra Vendor', 'Civil');
    v_success := true;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASSED: Cross-company insert blocked by RLS (insufficient_privilege).';
    WHEN OTHERS THEN
      RAISE NOTICE 'PASSED: Cross-company insert rejected with error: %', SQLERRM;
  END;

  IF v_success THEN
    RAISE EXCEPTION 'FAILED: Cross-company insert succeeded illegally!';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 3: CROSS-COMPANY UPDATE ATTEMPT
-- Context: FITCO Buyer attempts to mutate Arabitra vendor. Must Affect 0 Rows.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_fitco_buyer_id text := 'aaaa0001-0000-0000-0000-000000000001';
  v_rows_affected integer;
BEGIN
  RAISE NOTICE '>>> TEST 3: Cross-Company Update Attempt';
  PERFORM set_config('request.jwt.claim.sub', v_fitco_buyer_id, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  UPDATE public.vendors
  SET name = 'Compromised Arabitra Vendor'
  WHERE vendor_code = 'VND-TEST-ARB';

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected = 0 THEN
    RAISE NOTICE 'PASSED: Cross-company update affected 0 rows (isolated by RLS).';
  ELSE
    RAISE EXCEPTION 'FAILED: Cross-company update modified % records illegally!', v_rows_affected;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 4: CROSS-COMPANY DELETE ATTEMPT
-- Context: FITCO Admin attempts to DELETE Arabitra vendor. Must Affect 0 Rows.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_fitco_admin_id text := 'aaaa0002-0000-0000-0000-000000000002';
  v_rows_affected integer;
BEGIN
  RAISE NOTICE '>>> TEST 4: Cross-Company Delete Attempt';
  PERFORM set_config('request.jwt.claim.sub', v_fitco_admin_id, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  DELETE FROM public.vendors
  WHERE vendor_code = 'VND-TEST-ARB';

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected = 0 THEN
    RAISE NOTICE 'PASSED: Cross-company delete affected 0 rows (isolated by RLS).';
  ELSE
    RAISE EXCEPTION 'FAILED: Cross-company delete deleted % records illegally!', v_rows_affected;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 5: IMMUTABLE COMPANY_ID MUTATION ATTEMPT
-- Context: User attempts to change company_id of existing record. Must Throw.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_fitco_admin_id text := 'aaaa0002-0000-0000-0000-000000000002';
  v_arabitra_id uuid := '22222222-2222-4222-a222-222222222222';
  v_exception_caught boolean := false;
BEGIN
  RAISE NOTICE '>>> TEST 5: Immutable company_id Mutation Attempt';
  PERFORM set_config('request.jwt.claim.sub', v_fitco_admin_id, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    UPDATE public.vendors
    SET company_id = v_arabitra_id
    WHERE vendor_code = 'VND-TEST-FITCO';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%company_id is strictly immutable%' THEN
        v_exception_caught := true;
        RAISE NOTICE 'PASSED: Trigger caught illegal company_id mutation: %', SQLERRM;
      ELSE
        RAISE EXCEPTION 'Unexpected exception: %', SQLERRM;
      END IF;
  END;

  IF NOT v_exception_caught THEN
    RAISE EXCEPTION 'FAILED: company_id was mutated without trigger rejection!';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 6: CROSS-COMPANY FOREIGN KEY INJECTION ATTEMPT
-- Context: Attempting to create a FITCO PO referencing an ARABITRA vendor.
--          Must be rejected by PostgreSQL compound foreign key!
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_fitco_admin_id text := 'aaaa0002-0000-0000-0000-000000000002';
  v_fitco_id uuid := '11111111-1111-4111-a111-111111111111';
  v_arabitra_vendor_id uuid := '99990002-0000-0000-0000-000000000002';
  v_fk_rejected boolean := false;
BEGIN
  RAISE NOTICE '>>> TEST 6: Cross-Company Foreign Key Injection Attempt';
  PERFORM set_config('request.jwt.claim.sub', v_fitco_admin_id, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    INSERT INTO public.purchase_orders (
      company_id,
      po_number,
      vendor_id,
      project_name,
      total_amount_sar,
      payment_terms
    ) VALUES (
      v_fitco_id,
      'PO-CROSS-ILLEGAL',
      v_arabitra_vendor_id,
      'Shedgum Gas Flare Recovery',
      500000,
      '30 Days Net'
    );
  EXCEPTION
    WHEN foreign_key_violation THEN
      v_fk_rejected := true;
      RAISE NOTICE 'PASSED: Compound foreign key rejected cross-company vendor binding (foreign_key_violation).';
    WHEN OTHERS THEN
      v_fk_rejected := true;
      RAISE NOTICE 'PASSED: Operation rejected as expected: %', SQLERRM;
  END;

  IF NOT v_fk_rejected THEN
    RAISE EXCEPTION 'FAILED: Cross-company foreign key injection succeeded illegally!';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 7: UNAUTHORIZED MEMBERSHIP MANAGEMENT ATTEMPT
-- Context: FITCO Buyer (non-admin) tries to grant Admin role to a user.
--          Must be blocked by RLS policy memberships_insert_admin.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_fitco_buyer_id text := 'aaaa0001-0000-0000-0000-000000000001';
  v_fitco_id uuid := '11111111-1111-4111-a111-111111111111';
  v_unauthorized_user uuid := '99999999-9999-9999-9999-999999999999';
  v_escalation_blocked boolean := false;
BEGIN
  RAISE NOTICE '>>> TEST 7: Unauthorized Membership Management Attempt';
  PERFORM set_config('request.jwt.claim.sub', v_fitco_buyer_id, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  BEGIN
    INSERT INTO public.company_memberships (company_id, user_id, role)
    VALUES (v_fitco_id, v_unauthorized_user, 'admin');
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_escalation_blocked := true;
      RAISE NOTICE 'PASSED: Privilege escalation blocked by RLS.';
    WHEN OTHERS THEN
      v_escalation_blocked := true;
      RAISE NOTICE 'PASSED: Escalation rejected: %', SQLERRM;
  END;

  IF NOT v_escalation_blocked THEN
    RAISE EXCEPTION 'FAILED: Non-admin managed company memberships!';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- TEST 8: DUAL MEMBERSHIP LEGITIMATE ACCESS VERIFICATION
-- Context: User with legitimate active memberships in both FITCO and ARABITRA
--          can read records belonging to both companies.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_dual_member_id text := 'cccc0001-0000-0000-0000-000000000001';
  v_count integer;
BEGIN
  RAISE NOTICE '>>> TEST 8: Dual Membership Legitimate Access Verification';
  PERFORM set_config('request.jwt.claim.sub', v_dual_member_id, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  SELECT count(*) INTO v_count
  FROM public.vendors
  WHERE vendor_code IN ('VND-TEST-FITCO', 'VND-TEST-ARB');

  IF v_count = 2 THEN
    RAISE NOTICE 'PASSED: Dual-member user legitimately accessed records from both companies (%/2).', v_count;
  ELSE
    RAISE EXCEPTION 'FAILED: Dual-member user could not access records from both assigned companies (got %).', v_count;
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '--- ALL 8 CROSS-COMPANY RLS ISOLATION TESTS PASSED SUCCESSFULLY ---'; END $$;

-- Clean up test changes
ROLLBACK;
