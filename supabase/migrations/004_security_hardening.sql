-- =========================================================
-- E-KABAADI PLATFORM
-- Phase 4C: Security & Data Integrity Hardening
-- File: supabase/migrations/004_security_hardening.sql
--
-- Run this in the Supabase SQL Editor to enforce:
-- 1. Privilege escalation defense on profiles (protect role/status)
-- 2. System field tampering protection on citizens and collectors
-- 3. Restrict direct table mutations on payments & reward_transactions
-- 4. Atomic RPC state machine for pickup transitions & concurrency safety
-- 5. Atomic RPC for administrative approvals with tamper-proof audit trail
-- 6. Safe public collector view (no bank, aadhaar, or internal IDs exposed)
-- 7. Account status validation helper (active vs suspended/deactivated)
-- 8. Explicit deletion restrictions on critical audit & operational records
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. ACCOUNT STATUS HELPER
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_account_active()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT status = 'active' FROM profiles WHERE id = auth.uid()),
        FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────
-- 2. PROFILES: PREVENT PRIVILEGE ESCALATION
-- ─────────────────────────────────────────────
-- Ordinary authenticated users must NEVER be able to promote themselves
-- to admin or switch their status to 'active' or bypass email/phone verification.
CREATE OR REPLACE FUNCTION prevent_profile_tampering()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    v_caller_role := get_user_role();

    -- Admins can update system fields
    IF v_caller_role = 'admin' THEN
        RETURN NEW;
    END IF;

    -- Block non-admin modification of role
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        RAISE EXCEPTION 'Security violation: Unauthorized attempt to modify user role.';
    END IF;

    -- Block non-admin modification of status
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        RAISE EXCEPTION 'Security violation: Unauthorized attempt to modify account status.';
    END IF;

    -- Block non-admin modification of application_status
    IF OLD.application_status IS DISTINCT FROM NEW.application_status THEN
        RAISE EXCEPTION 'Security violation: Unauthorized attempt to modify application verification status.';
    END IF;

    -- Block non-admin modification of verification flags
    IF OLD.email_verified IS DISTINCT FROM NEW.email_verified THEN
        RAISE EXCEPTION 'Security violation: Email verification flag cannot be self-asserted.';
    END IF;

    IF OLD.phone_verified IS DISTINCT FROM NEW.phone_verified THEN
        RAISE EXCEPTION 'Security violation: Phone verification flag cannot be self-asserted.';
    END IF;

    IF OLD.masked_aadhaar IS DISTINCT FROM NEW.masked_aadhaar THEN
        RAISE EXCEPTION 'Security violation: Identity document fields cannot be modified directly.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_profile_tampering ON profiles;
CREATE TRIGGER trg_prevent_profile_tampering
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_profile_tampering();

-- Harden profiles INSERT: self-registration only allows citizen/collector in pending_approval
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Users can insert own profile on signup"
    ON profiles FOR INSERT
    WITH CHECK (
        id = auth.uid()
        AND role IN ('citizen', 'collector')
        AND status = 'pending_approval'
        AND application_status = 'pending_approval'
    );

-- ─────────────────────────────────────────────
-- 3. CITIZENS: PREVENT BALANCE & SYSTEM TAMPERING
-- ─────────────────────────────────────────────
-- Citizens cannot directly modify coins, earnings, stats, or status.
CREATE OR REPLACE FUNCTION prevent_citizen_tampering()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    v_caller_role := get_user_role();

    -- Allow admin or SECURITY DEFINER RPCs (which set local role context)
    IF v_caller_role = 'admin' THEN
        RETURN NEW;
    END IF;

    -- Check if system fields were altered by client
    IF OLD.eco_coins IS DISTINCT FROM NEW.eco_coins THEN
        RAISE EXCEPTION 'Security violation: Eco Coins balance cannot be modified directly.';
    END IF;

    IF OLD.total_earnings IS DISTINCT FROM NEW.total_earnings THEN
        RAISE EXCEPTION 'Security violation: Total earnings cannot be modified directly.';
    END IF;

    IF OLD.total_waste_sold IS DISTINCT FROM NEW.total_waste_sold THEN
        RAISE EXCEPTION 'Security violation: Waste sold metrics cannot be modified directly.';
    END IF;

    IF OLD.completed_pickups IS DISTINCT FROM NEW.completed_pickups THEN
        RAISE EXCEPTION 'Security violation: Pickup metrics cannot be modified directly.';
    END IF;

    IF OLD.kyc_status IS DISTINCT FROM NEW.kyc_status THEN
        RAISE EXCEPTION 'Security violation: KYC verification status cannot be self-asserted.';
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
        RAISE EXCEPTION 'Security violation: Citizen account status cannot be self-asserted.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_citizen_tampering ON citizens;
CREATE TRIGGER trg_prevent_citizen_tampering
    BEFORE UPDATE ON citizens
    FOR EACH ROW
    EXECUTE FUNCTION prevent_citizen_tampering();

-- ─────────────────────────────────────────────
-- 4. COLLECTORS: PREVENT STATS & METRICS TAMPERING
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_collector_tampering()
RETURNS TRIGGER AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    v_caller_role := get_user_role();

    IF v_caller_role = 'admin' THEN
        RETURN NEW;
    END IF;

    IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
        RAISE EXCEPTION 'Security violation: Verification status cannot be self-asserted.';
    END IF;

    IF OLD.scale_status IS DISTINCT FROM NEW.scale_status THEN
        RAISE EXCEPTION 'Security violation: Scale certification cannot be modified directly.';
    END IF;

    IF OLD.rating IS DISTINCT FROM NEW.rating THEN
        RAISE EXCEPTION 'Security violation: Rating cannot be self-asserted.';
    END IF;

    IF OLD.total_pickups IS DISTINCT FROM NEW.total_pickups OR OLD.completed_pickups IS DISTINCT FROM NEW.completed_pickups THEN
        RAISE EXCEPTION 'Security violation: Pickup metrics cannot be modified directly.';
    END IF;

    IF OLD.total_earnings IS DISTINCT FROM NEW.total_earnings OR OLD.total_waste_collected IS DISTINCT FROM NEW.total_waste_collected THEN
        RAISE EXCEPTION 'Security violation: Financial/waste collection metrics cannot be modified directly.';
    END IF;

    IF OLD.eco_coins IS DISTINCT FROM NEW.eco_coins THEN
        RAISE EXCEPTION 'Security violation: Eco Coins balance cannot be modified directly.';
    END IF;

    IF OLD.status IS DISTINCT FROM NEW.status THEN
        RAISE EXCEPTION 'Security violation: Collector account status cannot be self-asserted.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_collector_tampering ON collectors;
CREATE TRIGGER trg_prevent_collector_tampering
    BEFORE UPDATE ON collectors
    FOR EACH ROW
    EXECUTE FUNCTION prevent_collector_tampering();

-- ─────────────────────────────────────────────
-- 5. SAFE PUBLIC COLLECTORS VIEW
-- ─────────────────────────────────────────────
-- Exposes ONLY public directory fields to citizens and guests.
-- Strips masked_bank, full phone, internal system notes, and private user_id.
CREATE OR REPLACE VIEW public_collectors_directory AS
SELECT 
    id,
    name,
    business_name,
    vehicle_type,
    vehicle_number,
    service_area,
    service_radius,
    rating,
    response_time,
    accepted_materials,
    scrap_categories,
    total_pickups,
    completed_pickups,
    is_online,
    status
FROM collectors
WHERE status = 'active';

GRANT SELECT ON public_collectors_directory TO authenticated, anon;

-- Function wrapper for programmatic query
CREATE OR REPLACE FUNCTION get_public_collectors()
RETURNS SETOF public_collectors_directory AS $$
    SELECT * FROM public_collectors_directory WHERE status = 'active';
$$ LANGUAGE sql STABLE;

-- ─────────────────────────────────────────────
-- 6. PAYMENTS & REWARDS RLS HARDENING
-- ─────────────────────────────────────────────
-- Disallow arbitrary direct INSERT on payments.
-- Payments may ONLY be inserted by atomic RPCs or Admins.
DROP POLICY IF EXISTS "Service can insert payments" ON payments;
CREATE POLICY "Admin can insert payments"
    ON payments FOR INSERT
    WITH CHECK (get_user_role() = 'admin');

-- Disallow arbitrary direct INSERT on reward_transactions.
-- Rewards may ONLY be awarded by atomic RPCs or Admins.
DROP POLICY IF EXISTS "Service can insert reward transactions" ON reward_transactions;
CREATE POLICY "Admin can insert reward transactions"
    ON reward_transactions FOR INSERT
    WITH CHECK (get_user_role() = 'admin');

-- ─────────────────────────────────────────────
-- 7. ATOMIC STATE MACHINE RPCs (PICKUPS)
-- ─────────────────────────────────────────────

-- 7.1 Collector Accepts Pickup (Concurrency Safe)
CREATE OR REPLACE FUNCTION pickup_accept(
    p_pickup_id TEXT,
    p_collector_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_pickup RECORD;
    v_caller_col_id TEXT;
    v_caller_role TEXT;
BEGIN
    v_caller_role := get_user_role();
    v_caller_col_id := get_collector_id();

    -- Authorization check
    IF v_caller_role != 'collector' OR v_caller_col_id IS NULL OR v_caller_col_id != p_collector_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Collector identity mismatch.');
    END IF;

    -- Concurrency row lock
    SELECT * INTO v_pickup FROM pickups WHERE id = p_pickup_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pickup not found.');
    END IF;

    -- Verify assigned collector
    IF v_pickup.collector_id != p_collector_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pickup is not assigned to you.');
    END IF;

    -- Idempotency check
    IF v_pickup.status = 'accepted' THEN
        RETURN jsonb_build_object('success', true, 'already_accepted', true, 'pickup_id', p_pickup_id);
    END IF;

    IF v_pickup.status != 'requested' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pickup is not in requested state.');
    END IF;

    UPDATE pickups SET
        status = 'accepted',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_pickup_id;

    RETURN jsonb_build_object('success', true, 'pickup_id', p_pickup_id, 'status', 'accepted');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2 Collector Starts Transit (on_the_way)
CREATE OR REPLACE FUNCTION pickup_start_transit(p_pickup_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_pickup RECORD;
    v_caller_col_id TEXT;
BEGIN
    v_caller_col_id := get_collector_id();

    SELECT * INTO v_pickup FROM pickups WHERE id = p_pickup_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pickup not found.');
    END IF;

    IF v_pickup.collector_id != v_caller_col_id AND get_user_role() != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Not assigned to this pickup.');
    END IF;

    IF v_pickup.status != 'accepted' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transit can only begin from accepted state.');
    END IF;

    UPDATE pickups SET
        status = 'on_the_way',
        enroute_at = NOW(),
        updated_at = NOW()
    WHERE id = p_pickup_id;

    RETURN jsonb_build_object('success', true, 'pickup_id', p_pickup_id, 'status', 'on_the_way');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.3 Collector Arrives at Doorstep (arrived)
CREATE OR REPLACE FUNCTION pickup_arrive(p_pickup_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_pickup RECORD;
    v_caller_col_id TEXT;
BEGIN
    v_caller_col_id := get_collector_id();

    SELECT * INTO v_pickup FROM pickups WHERE id = p_pickup_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pickup not found.');
    END IF;

    IF v_pickup.collector_id != v_caller_col_id AND get_user_role() != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Not assigned to this pickup.');
    END IF;

    IF v_pickup.status != 'on_the_way' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Arrival can only be recorded after en route.');
    END IF;

    UPDATE pickups SET
        status = 'arrived',
        arrived_at = NOW(),
        updated_at = NOW()
    WHERE id = p_pickup_id;

    RETURN jsonb_build_object('success', true, 'pickup_id', p_pickup_id, 'status', 'arrived');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.4 Collector Starts Weighing Session (collecting)
CREATE OR REPLACE FUNCTION pickup_start_collection(p_pickup_id TEXT)
RETURNS JSONB AS $$
DECLARE
    v_pickup RECORD;
    v_caller_col_id TEXT;
BEGIN
    v_caller_col_id := get_collector_id();

    SELECT * INTO v_pickup FROM pickups WHERE id = p_pickup_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pickup not found.');
    END IF;

    IF v_pickup.collector_id != v_caller_col_id AND get_user_role() != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Not assigned to this pickup.');
    END IF;

    IF v_pickup.status != 'arrived' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Collection can only begin once arrived.');
    END IF;

    UPDATE pickups SET
        status = 'collecting',
        updated_at = NOW()
    WHERE id = p_pickup_id;

    RETURN jsonb_build_object('success', true, 'pickup_id', p_pickup_id, 'status', 'collecting');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.5 Strict Pickup Cancellation (Prior to arrival only)
CREATE OR REPLACE FUNCTION pickup_cancel(
    p_pickup_id TEXT,
    p_reason TEXT DEFAULT 'Cancelled by user'
)
RETURNS JSONB AS $$
DECLARE
    v_pickup RECORD;
    v_caller_role TEXT;
    v_caller_cit_id TEXT;
    v_caller_col_id TEXT;
BEGIN
    v_caller_role := get_user_role();
    v_caller_cit_id := get_citizen_id();
    v_caller_col_id := get_collector_id();

    SELECT * INTO v_pickup FROM pickups WHERE id = p_pickup_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pickup not found.');
    END IF;

    -- Ownership verification: Citizen can cancel own; Collector can cancel assigned; Admin can cancel any
    IF v_caller_role = 'citizen' AND v_pickup.citizen_id != v_caller_cit_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You do not own this pickup.');
    ELSIF v_caller_role = 'collector' AND v_pickup.collector_id != v_caller_col_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: You are not assigned to this pickup.');
    ELSIF v_caller_role NOT IN ('citizen', 'collector', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized role.');
    END IF;

    -- Strict business rule: Cancellation forbidden once arrived, collecting, completed, or paid
    IF v_pickup.status IN ('arrived', 'collecting', 'completed', 'paid', 'payment_pending') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel pickup once collector has arrived or collection is active/complete.');
    END IF;

    IF v_pickup.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', true, 'already_cancelled', true, 'pickup_id', p_pickup_id);
    END IF;

    UPDATE pickups SET
        status = 'cancelled',
        cancellation_reason = p_reason,
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_pickup_id;

    RETURN jsonb_build_object('success', true, 'pickup_id', p_pickup_id, 'status', 'cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 8. ATOMIC ADMIN APPROVAL & IMMUTABLE AUDIT TRAIL
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_process_application(
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_action TEXT,
    p_reason TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
    v_admin_role TEXT;
    v_admin_user RECORD;
    v_user_id UUID;
    v_new_status TEXT;
    v_new_app_status TEXT;
    v_prev_status TEXT;
    v_audit_id TEXT;
BEGIN
    v_admin_role := get_user_role();
    IF v_admin_role != 'admin' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied: Administrator privileges required.');
    END IF;

    IF p_action NOT IN ('APPROVE', 'REJECT', 'REQUEST_CORRECTION') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid action: Must be APPROVE, REJECT, or REQUEST_CORRECTION.');
    END IF;

    IF p_entity_type NOT IN ('citizen', 'collector') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid entity type: Must be citizen or collector.');
    END IF;

    -- Fetch entity and target user_id
    IF p_entity_type = 'citizen' THEN
        SELECT user_id, status INTO v_user_id, v_prev_status FROM citizens WHERE id = p_entity_id;
    ELSE
        SELECT user_id, status INTO v_user_id, v_prev_status FROM collectors WHERE id = p_entity_id;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Target applicant entity not found.');
    END IF;

    -- Calculate target statuses
    IF p_action = 'APPROVE' THEN
        v_new_status := 'active';
        v_new_app_status := 'approved';
    ELSIF p_action = 'REJECT' THEN
        v_new_status := 'rejected';
        v_new_app_status := 'rejected';
    ELSE
        v_new_status := 'pending_approval';
        v_new_app_status := 'correction_required';
    END IF;

    -- Idempotency: Already in requested state?
    IF v_prev_status = v_new_status THEN
        RETURN jsonb_build_object('success', true, 'already_processed', true, 'status', v_new_status);
    END IF;

    -- 1. Update role table
    IF p_entity_type = 'citizen' THEN
        UPDATE citizens SET
            status = v_new_status,
            kyc_status = CASE WHEN p_action = 'APPROVE' THEN 'verified' WHEN p_action = 'REJECT' THEN 'rejected' ELSE 'pending' END,
            updated_at = NOW()
        WHERE id = p_entity_id;
    ELSE
        UPDATE collectors SET
            status = v_new_status,
            verification_status = CASE WHEN p_action = 'APPROVE' THEN 'verified' WHEN p_action = 'REJECT' THEN 'rejected' ELSE 'pending' END,
            is_online = CASE WHEN p_action = 'APPROVE' THEN TRUE ELSE is_online END,
            updated_at = NOW()
        WHERE id = p_entity_id;
    END IF;

    -- 2. Update profiles table
    UPDATE profiles SET
        status = v_new_status,
        application_status = v_new_app_status,
        updated_at = NOW()
    WHERE id = v_user_id;

    -- 3. Fetch admin display name
    SELECT first_name, last_name, email INTO v_admin_user FROM profiles WHERE id = auth.uid();

    -- 4. Atomically record immutable audit trail entry
    v_audit_id := 'AUD-' || floor(random() * 90000 + 10000)::text;
    INSERT INTO approval_audit_trail (
        id,
        entity_type,
        entity_id,
        reviewer_id,
        reviewer_name,
        action,
        previous_status,
        new_status,
        reason,
        created_at
    ) VALUES (
        v_audit_id,
        p_entity_type,
        p_entity_id,
        auth.uid(),
        COALESCE(TRIM(v_admin_user.first_name || ' ' || v_admin_user.last_name), v_admin_user.email, 'Admin Reviewer'),
        p_action,
        v_prev_status,
        v_new_status,
        p_reason,
        NOW()
    );

    -- 5. Send notification to applicant
    INSERT INTO notifications (
        id,
        user_id,
        role,
        type,
        title,
        message,
        read,
        created_at
    ) VALUES (
        'NOTIF-' || floor(random() * 90000 + 10000)::text,
        v_user_id::text,
        p_entity_type,
        'verification',
        CASE WHEN p_action = 'APPROVE' THEN 'Application Approved! 🎉' WHEN p_action = 'REJECT' THEN 'Application Update' ELSE 'Correction Requested' END,
        CASE 
            WHEN p_action = 'APPROVE' THEN 'Your application has been verified. Welcome to E-Kabaadi!'
            WHEN p_action = 'REJECT' THEN 'Your application was not approved. Reason: ' || COALESCE(p_reason, 'Discrepancy in documentation.')
            ELSE 'Additional information required: ' || COALESCE(p_reason, 'Please update identity documents.')
        END,
        FALSE,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'entity_type', p_entity_type,
        'entity_id', p_entity_id,
        'status', v_new_status,
        'audit_id', v_audit_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 9. IMMUTABLE AUDIT TRAIL: PREVENT UPDATE & DELETE
-- ─────────────────────────────────────────────
-- No one, not even an Admin, can update or delete audit records once written.
CREATE OR REPLACE FUNCTION prevent_audit_tampering()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security violation: Approval audit trail entries are immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_audit_update ON approval_audit_trail;
CREATE TRIGGER trg_prevent_audit_update
    BEFORE UPDATE ON approval_audit_trail
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_tampering();

DROP TRIGGER IF EXISTS trg_prevent_audit_delete ON approval_audit_trail;
CREATE TRIGGER trg_prevent_audit_delete
    BEFORE DELETE ON approval_audit_trail
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_tampering();

-- ─────────────────────────────────────────────
-- 10. PREVENT DELETION OF FINANCIAL & OPERATIONAL RECORDS
-- ─────────────────────────────────────────────
-- Critical financial and pickup history must be preserved.
CREATE OR REPLACE FUNCTION prevent_core_record_deletion()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security violation: Operational history and financial transactions cannot be deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_payment_delete ON payments;
CREATE TRIGGER trg_prevent_payment_delete
    BEFORE DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_core_record_deletion();

DROP TRIGGER IF EXISTS trg_prevent_pickup_delete ON pickups;
CREATE TRIGGER trg_prevent_pickup_delete
    BEFORE DELETE ON pickups
    FOR EACH ROW
    EXECUTE FUNCTION prevent_core_record_deletion();

DROP TRIGGER IF EXISTS trg_prevent_reward_delete ON reward_transactions;
CREATE TRIGGER trg_prevent_reward_delete
    BEFORE DELETE ON reward_transactions
    FOR EACH ROW
    EXECUTE FUNCTION prevent_core_record_deletion();
