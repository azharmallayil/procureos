-- ============================================================================
-- Migration: 20261103_quotation_analysis_and_lifecycle.sql
-- Description: Quotation lifecycle, line items extraction, matching, and deletion governance
-- Enforces:
-- 1. Storage DELETE policy for quote-documents bucket
-- 2. Extended quotation header columns (subtotal, tax, currency, terms, AI status)
-- 3. Granular quotation_line_items table preserving all supplier-quoted line items,
--    exact SKUs, models, quantities, and RFQ-to-quotation matching results
-- 4. Cascading referential integrity on RFQ and Quotation deletion
-- ============================================================================

-- 1. Storage DELETE policy for quote-documents
DO $$
BEGIN
  DROP POLICY IF EXISTS "Private Delete Quote Documents" ON storage.objects;
  CREATE POLICY "Private Delete Quote Documents"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'quote-documents');
END $$;

-- 2. Extend public.quotations with commercial header & AI processing metadata
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS subtotal_sar numeric(14,2),
  ADD COLUMN IF NOT EXISTS tax_amount_sar numeric(14,2),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'SAR',
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS delivery_terms text,
  ADD COLUMN IF NOT EXISTS ai_confidence_score numeric(5,2),
  ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'Completed';

-- 3. Create public.quotation_line_items table for itemized extraction & matching
CREATE TABLE IF NOT EXISTS public.quotation_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rfq_id uuid REFERENCES public.rfqs(id) ON DELETE CASCADE,
  line_number integer,
  item_name text,
  sku text,
  model_number text,
  brand text,
  description text NOT NULL,
  quoted_quantity numeric(14,2) NOT NULL DEFAULT 1 CHECK (quoted_quantity >= 0),
  requested_quantity numeric(14,2),
  uom text NOT NULL DEFAULT 'EA',
  unit_price_sar numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_price_sar >= 0),
  discount_percent numeric(5,2) DEFAULT 0,
  tax_percent numeric(5,2) DEFAULT 15,
  total_price_sar numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_price_sar >= 0),
  remarks text,
  match_status text NOT NULL DEFAULT 'Additional Quoted Item'
    CHECK (match_status IN ('Exact Match', 'Possible Match / Alternative', 'Additional Quoted Item', 'Unmatched / Needs Review')),
  matched_rfq_line_id text,
  match_confidence numeric(5,2) DEFAULT 100,
  match_reason text,
  needs_verification boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for lightning-fast retrieval and join queries
CREATE INDEX IF NOT EXISTS idx_qli_quotation_id ON public.quotation_line_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_qli_company_id ON public.quotation_line_items(company_id);
CREATE INDEX IF NOT EXISTS idx_qli_rfq_id ON public.quotation_line_items(rfq_id);
CREATE INDEX IF NOT EXISTS idx_qli_match_status ON public.quotation_line_items(match_status);

-- 4. Enable Row Level Security (RLS) on quotation_line_items
ALTER TABLE public.quotation_line_items ENABLE ROW LEVEL SECURITY;

-- Select policy
DROP POLICY IF EXISTS "Allow select quotation line items" ON public.quotation_line_items;
CREATE POLICY "Allow select quotation line items"
ON public.quotation_line_items FOR SELECT
TO anon, authenticated
USING (true);

-- Insert policy
DROP POLICY IF EXISTS "Allow insert quotation line items" ON public.quotation_line_items;
CREATE POLICY "Allow insert quotation line items"
ON public.quotation_line_items FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Update policy
DROP POLICY IF EXISTS "Allow update quotation line items" ON public.quotation_line_items;
CREATE POLICY "Allow update quotation line items"
ON public.quotation_line_items FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Delete policy
DROP POLICY IF EXISTS "Allow delete quotation line items" ON public.quotation_line_items;
CREATE POLICY "Allow delete quotation line items"
ON public.quotation_line_items FOR DELETE
TO anon, authenticated
USING (true);

