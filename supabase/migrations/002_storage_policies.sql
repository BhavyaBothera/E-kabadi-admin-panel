-- =========================================================
-- E-KABAADI PLATFORM
-- Phase 4A: Storage Bucket & Policies for KYC Documents
-- File: supabase/migrations/002_storage_policies.sql
--
-- IMPORTANT: The bucket must be PRIVATE.
-- Do NOT use public URLs for Aadhaar/address proof.
-- =========================================================

-- 1. Create private bucket for KYC documents
-- NOTE: Run this via Supabase Dashboard > Storage > New Bucket
-- or via the Supabase CLI. The SQL below documents the policy.

-- Bucket name: kyc-documents
-- Public: FALSE
-- File size limit: 10MB
-- Allowed MIME types: image/jpeg, image/png, application/pdf

-- ─────────────────────────────────────────────
-- STORAGE POLICIES
-- ─────────────────────────────────────────────

-- Storage path convention:
-- kyc-documents/{user_id}/{document_type}_{timestamp}.{ext}
-- Example: kyc-documents/abc123-uuid/aadhaar_1695820800.pdf

-- Policy 1: Users can upload their own documents
CREATE POLICY "Users can upload own KYC documents"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'kyc-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy 2: Users can view their own documents
CREATE POLICY "Users can view own KYC documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'kyc-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy 3: Users can delete their own documents (re-upload)
CREATE POLICY "Users can delete own KYC documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'kyc-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Policy 4: Admin can view ALL KYC documents (for review)
CREATE POLICY "Admin can view all KYC documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'kyc-documents'
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy 5: Admin can update KYC document metadata
CREATE POLICY "Admin can update KYC documents"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'kyc-documents'
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ─────────────────────────────────────────────
-- DOCUMENTATION
-- ─────────────────────────────────────────────
-- Allowed document types:
--   - aadhaar         (Aadhaar card scan/photo)
--   - address_proof   (Utility bill, rental agreement)
--   - business_license (Collector business registration)
--   - vehicle_rc      (Collector vehicle registration)
--   - pan_card        (PAN card for payment compliance)
--
-- Access rules:
--   - Citizen/Collector: Can upload, view, and replace their OWN documents only
--   - Admin: Can view ALL documents for verification review
--   - Public: NO access (bucket is private)
--   - Signed URLs: Used when admin needs to display a document in the review UI
--
-- Storage path convention:
--   kyc-documents/{user_uuid}/{type}_{unix_timestamp}.{ext}
--
-- IMPORTANT: During development, continue using demo/mock documents.
-- Do NOT upload real identity documents to development environments.
