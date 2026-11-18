-- ============================================================================
-- Migration: Unify Enterprise Roles Across ProcureOS Architecture
-- Standardizes PostgreSQL user_role enum to match frontend & business specifications:
-- 1. Super Admin
-- 2. Procurement Director
-- 3. Procurement Engineer
-- 4. Purchasing Specialist
-- 5. Site Receiving Officer
-- 6. Financial Controller
-- 7. Internal Auditor
-- ============================================================================

DO $$
BEGIN
  -- Add each new role to the enum if not already present
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'Super Admin') THEN
    ALTER TYPE public.user_role ADD VALUE 'Super Admin';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'Procurement Director') THEN
    ALTER TYPE public.user_role ADD VALUE 'Procurement Director';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'Procurement Engineer') THEN
    ALTER TYPE public.user_role ADD VALUE 'Procurement Engineer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'Purchasing Specialist') THEN
    ALTER TYPE public.user_role ADD VALUE 'Purchasing Specialist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'Site Receiving Officer') THEN
    ALTER TYPE public.user_role ADD VALUE 'Site Receiving Officer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'Financial Controller') THEN
    ALTER TYPE public.user_role ADD VALUE 'Financial Controller';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'Internal Auditor') THEN
    ALTER TYPE public.user_role ADD VALUE 'Internal Auditor';
  END IF;
END $$;
