-- ============================================================================
-- Migration: 20261103_secure_document_storage.sql
-- Description: Strictly Private & Protected Storage for Quotation Documents
-- Enforces zero public unauthenticated access to commercial quotes and supplier PDFs.
-- ============================================================================

-- 1. Ensure bucket 'quote-documents' is set to strictly PRIVATE (public = false)
UPDATE storage.buckets
SET public = false
WHERE id = 'quote-documents';

-- 2. Drop any legacy public policies
DROP POLICY IF EXISTS "Public Access Quote Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload Quote Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update Quote Documents" ON storage.objects;
DROP POLICY IF EXISTS "Private Read Quote Documents" ON storage.objects;
DROP POLICY IF EXISTS "Private Insert Quote Documents" ON storage.objects;
DROP POLICY IF EXISTS "Private Update Quote Documents" ON storage.objects;

-- 3. Configure secure access policies:
-- Only authenticated users and app client can read/download quote objects
CREATE POLICY "Private Read Quote Documents"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'quote-documents');

-- Only authenticated users and app client can upload quote objects
CREATE POLICY "Private Insert Quote Documents"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'quote-documents');

-- Only authenticated users and app client can update quote objects
CREATE POLICY "Private Update Quote Documents"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'quote-documents')
WITH CHECK (bucket_id = 'quote-documents');

