-- =========================================================
-- E-KABAADI PLATFORM
-- Phase 4A: Initial Database Schema
-- File: supabase/migrations/001_initial_schema.sql
--
-- Run this in the Supabase SQL Editor to create all tables,
-- RLS policies, functions, triggers, and indexes.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. PROFILES (maps Supabase Auth → App Role)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'collector', 'admin')),
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending_approval'
        CHECK (status IN ('active', 'pending_approval', 'rejected', 'suspended')),
    application_status TEXT NOT NULL DEFAULT 'pending_approval'
        CHECK (application_status IN ('draft', 'pending_approval', 'approved', 'rejected', 'correction_required')),
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    masked_aadhaar TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- ─────────────────────────────────────────────
-- 2. CITIZENS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS citizens (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    addresses JSONB DEFAULT '[]'::jsonb,
    location JSONB DEFAULT '{}'::jsonb,
    kyc_status TEXT DEFAULT 'pending'
        CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
    payout_method TEXT DEFAULT 'UPI',
    upi_id TEXT DEFAULT '',
    eco_coins INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    total_pickups INTEGER DEFAULT 0,
    completed_pickups INTEGER DEFAULT 0,
    total_waste_sold DECIMAL(8,2) DEFAULT 0.00,
    rating DECIMAL(3,2) DEFAULT 5.00,
    joined_date TEXT DEFAULT '',
    status TEXT DEFAULT 'pending_approval',
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citizens_user_id ON citizens(user_id);
CREATE INDEX IF NOT EXISTS idx_citizens_status ON citizens(status);

-- ─────────────────────────────────────────────
-- 3. COLLECTORS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS collectors (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    business_name TEXT DEFAULT '',
    vehicle_type TEXT DEFAULT '',
    vehicle_number TEXT DEFAULT '',
    service_radius INTEGER DEFAULT 8,
    service_area TEXT DEFAULT '',
    location JSONB DEFAULT '{}'::jsonb,
    distance DECIMAL(5,2) DEFAULT 0,
    accepted_materials JSONB DEFAULT '[]'::jsonb,
    scrap_categories JSONB DEFAULT '[]'::jsonb,
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_pickups INTEGER DEFAULT 0,
    completed_pickups INTEGER DEFAULT 0,
    pending_pickups INTEGER DEFAULT 0,
    queue_length INTEGER DEFAULT 0,
    response_time TEXT DEFAULT '~20 min',
    total_waste_collected DECIMAL(8,2) DEFAULT 0.00,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    eco_coins INTEGER DEFAULT 0,
    is_online BOOLEAN DEFAULT FALSE,
    verification_status TEXT DEFAULT 'pending'
        CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    scale_status TEXT DEFAULT 'certified',
    scale_id TEXT DEFAULT '',
    masked_bank TEXT DEFAULT '',
    status TEXT DEFAULT 'pending_approval',
    joined_date TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collectors_user_id ON collectors(user_id);
CREATE INDEX IF NOT EXISTS idx_collectors_status ON collectors(status);
CREATE INDEX IF NOT EXISTS idx_collectors_is_online ON collectors(is_online);

-- ─────────────────────────────────────────────
-- 4. KYC DOCUMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL
        CHECK (document_type IN ('aadhaar', 'address_proof', 'business_license', 'vehicle_rc', 'pan_card')),
    document_status TEXT DEFAULT 'pending'
        CHECK (document_status IN ('pending', 'approved', 'rejected')),
    storage_path TEXT DEFAULT '',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES profiles(id),
    rejection_reason TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_kyc_user_id ON kyc_documents(user_id);

-- ─────────────────────────────────────────────
-- 5. SCRAP CATEGORIES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrap_categories (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    icon TEXT DEFAULT '',
    rate_per_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unit TEXT DEFAULT 'kg',
    description TEXT DEFAULT '',
    recyclability TEXT DEFAULT '',
    co2_saved_per_kg DECIMAL(5,2) DEFAULT 0.00,
    active BOOLEAN DEFAULT TRUE,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 6. PICKUPS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pickups (
    id TEXT PRIMARY KEY,
    citizen_id TEXT NOT NULL REFERENCES citizens(id),
    collector_id TEXT NOT NULL REFERENCES collectors(id),
    citizen_name TEXT DEFAULT '',
    collector_name TEXT DEFAULT '',
    address TEXT DEFAULT '',
    scheduled_date TEXT DEFAULT '',
    scheduled_time TEXT DEFAULT '',
    date TEXT DEFAULT '',
    time_slot TEXT DEFAULT '',
    scrap_type TEXT DEFAULT '',
    items JSONB DEFAULT '[]'::jsonb,
    estimated_weight DECIMAL(8,2) DEFAULT 0,
    estimated_value DECIMAL(10,2) DEFAULT 0,
    final_weight DECIMAL(8,2),
    final_value DECIMAL(10,2),
    status TEXT NOT NULL DEFAULT 'requested'
        CHECK (status IN ('requested', 'accepted', 'on_the_way', 'arrived', 'collecting', 'completed', 'payment_pending', 'paid', 'cancelled')),
    payment_status TEXT DEFAULT 'pending'
        CHECK (payment_status IN ('pending', 'paid', 'failed')),
    payment_method TEXT DEFAULT 'UPI',
    eco_coins_awarded INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    enroute_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickups_citizen_id ON pickups(citizen_id);
CREATE INDEX IF NOT EXISTS idx_pickups_collector_id ON pickups(collector_id);
CREATE INDEX IF NOT EXISTS idx_pickups_status ON pickups(status);

-- ─────────────────────────────────────────────
-- 7. PAYMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    pickup_id TEXT UNIQUE REFERENCES pickups(id),
    citizen_id TEXT REFERENCES citizens(id),
    collector_id TEXT REFERENCES collectors(id),
    citizen_name TEXT DEFAULT '',
    collector_name TEXT DEFAULT '',
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    method TEXT DEFAULT 'UPI',
    status TEXT DEFAULT 'paid'
        CHECK (status IN ('pending', 'paid', 'failed')),
    transaction_id TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_pickup_id ON payments(pickup_id);
CREATE INDEX IF NOT EXISTS idx_payments_citizen_id ON payments(citizen_id);
CREATE INDEX IF NOT EXISTS idx_payments_collector_id ON payments(collector_id);

-- ─────────────────────────────────────────────
-- 8. REWARD CATALOG
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_catalog (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    cost INTEGER NOT NULL DEFAULT 0,
    icon TEXT DEFAULT '',
    category TEXT DEFAULT '',
    active BOOLEAN DEFAULT TRUE
);

-- ─────────────────────────────────────────────
-- 9. REWARD TRANSACTIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL
        CHECK (type IN ('earned_pickup', 'redeemed_perk', 'bonus')),
    points INTEGER NOT NULL DEFAULT 0,
    pickup_id TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate eco coins for the same pickup
CREATE UNIQUE INDEX IF NOT EXISTS idx_reward_unique_pickup
    ON reward_transactions(pickup_id, type) WHERE type = 'earned_pickup' AND pickup_id != '';

CREATE INDEX IF NOT EXISTS idx_reward_user_id ON reward_transactions(user_id);

-- ─────────────────────────────────────────────
-- 10. NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT '',
    type TEXT DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    message TEXT DEFAULT '',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ─────────────────────────────────────────────
-- 11. ISSUES (Support Tickets)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    raised_by TEXT DEFAULT '',
    user_id TEXT DEFAULT '',
    citizen_id TEXT DEFAULT '',
    pickup_id TEXT DEFAULT '',
    role TEXT DEFAULT '',
    category TEXT DEFAULT '',
    type TEXT DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'open'
        CHECK (status IN ('open', 'investigating', 'under_review', 'resolved', 'closed')),
    assigned_to TEXT DEFAULT 'Customer Support',
    resolution TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_user_id ON issues(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);

-- ─────────────────────────────────────────────
-- 12. APPROVAL AUDIT TRAIL
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_audit_trail (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('citizen', 'collector')),
    entity_id TEXT NOT NULL,
    reviewer_name TEXT DEFAULT '',
    reviewer_admin_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL
        CHECK (action IN ('APPROVE', 'REJECT', 'REQUEST_CORRECTION', 'SUSPEND', 'REACTIVATE')),
    previous_status TEXT DEFAULT '',
    new_status TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity_id ON approval_audit_trail(entity_id);

-- =========================================================
-- FUNCTIONS & TRIGGERS
-- =========================================================

-- ── Auto-update timestamp trigger ──
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$ 
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'profiles', 'citizens', 'collectors', 'pickups', 
        'scrap_categories', 'issues'
    ]) LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_update_%I ON %I; 
             CREATE TRIGGER trg_update_%I BEFORE UPDATE ON %I 
             FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
            tbl, tbl, tbl, tbl
        );
    END LOOP;
END $$;

-- ── Pickup State Machine Validation ──
CREATE OR REPLACE FUNCTION validate_pickup_transition()
RETURNS TRIGGER AS $$
DECLARE
    allowed_transitions JSONB := '{
        "requested": ["accepted", "cancelled"],
        "accepted": ["on_the_way", "cancelled"],
        "on_the_way": ["arrived", "cancelled"],
        "arrived": ["collecting"],
        "collecting": ["completed"],
        "completed": ["paid", "payment_pending"],
        "payment_pending": ["paid"],
        "paid": [],
        "cancelled": []
    }'::jsonb;
    allowed JSONB;
BEGIN
    -- Only validate if status actually changed
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    allowed := allowed_transitions -> OLD.status;
    
    IF allowed IS NULL OR NOT (allowed ? NEW.status) THEN
        RAISE EXCEPTION 'Invalid pickup transition from % to %', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_pickup_transition
    BEFORE UPDATE ON pickups
    FOR EACH ROW
    EXECUTE FUNCTION validate_pickup_transition();

-- ── Atomic Collection Completion RPC ──
-- Idempotent: safe to call multiple times for the same pickup
CREATE OR REPLACE FUNCTION process_collection_completion(
    p_pickup_id TEXT,
    p_final_weight DECIMAL,
    p_final_value DECIMAL,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_pickup RECORD;
    v_payment_id TEXT;
    v_reward_id TEXT;
    v_eco_coins INTEGER;
    v_existing_payment RECORD;
    v_existing_reward RECORD;
BEGIN
    -- 1. Fetch pickup
    SELECT * INTO v_pickup FROM pickups WHERE id = p_pickup_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pickup not found');
    END IF;

    -- 2. Idempotency: already completed?
    IF v_pickup.status IN ('completed', 'paid') THEN
        SELECT * INTO v_existing_payment FROM payments WHERE pickup_id = p_pickup_id LIMIT 1;
        RETURN jsonb_build_object(
            'success', true, 
            'already_completed', true,
            'pickup_id', p_pickup_id,
            'payment_id', COALESCE(v_existing_payment.id, '')
        );
    END IF;

    -- 3. Calculate eco coins (2 per kg, minimum 10)
    v_eco_coins := GREATEST(10, ROUND(p_final_weight * 2));

    -- 4. Update pickup to completed + paid
    UPDATE pickups SET
        status = 'completed',
        payment_status = 'paid',
        final_weight = p_final_weight,
        final_value = p_final_value,
        items = CASE WHEN p_items != '[]'::jsonb THEN p_items ELSE items END,
        eco_coins_awarded = v_eco_coins,
        completed_at = NOW(),
        paid_at = NOW()
    WHERE id = p_pickup_id
      AND status NOT IN ('completed', 'paid');

    -- 5. Create payment record (idempotent via UNIQUE on pickup_id)
    v_payment_id := 'TXN-' || floor(random() * 9000 + 1000)::text;
    INSERT INTO payments (id, pickup_id, citizen_id, collector_id, citizen_name, collector_name, amount, method, status, transaction_id, created_at)
    VALUES (
        v_payment_id, p_pickup_id, v_pickup.citizen_id, v_pickup.collector_id,
        v_pickup.citizen_name, v_pickup.collector_name, p_final_value,
        COALESCE(v_pickup.payment_method, 'UPI'), 'paid',
        'UPI-' || floor(random() * 9000 + 1000)::text || '-' || floor(random() * 90000 + 10000)::text,
        NOW()
    )
    ON CONFLICT (pickup_id) DO NOTHING;

    -- 6. Award eco coins (idempotent via unique index)
    v_reward_id := 'RWD-TXN-' || floor(random() * 9000 + 1000)::text;
    INSERT INTO reward_transactions (id, user_id, type, points, pickup_id, description, created_at)
    VALUES (
        v_reward_id,
        (SELECT user_id::text FROM citizens WHERE id = v_pickup.citizen_id),
        'earned_pickup', v_eco_coins, p_pickup_id,
        'Eco Coins earned from Pickup ' || p_pickup_id,
        NOW()
    )
    ON CONFLICT (pickup_id, type) WHERE type = 'earned_pickup' AND pickup_id != '' DO NOTHING;

    -- 7. Update citizen stats
    UPDATE citizens SET
        eco_coins = eco_coins + v_eco_coins,
        total_earnings = total_earnings + p_final_value,
        total_waste_sold = total_waste_sold + p_final_weight,
        completed_pickups = completed_pickups + 1
    WHERE id = v_pickup.citizen_id;

    -- 8. Update collector stats
    UPDATE collectors SET
        total_earnings = total_earnings + p_final_value,
        total_waste_collected = total_waste_collected + p_final_weight,
        completed_pickups = completed_pickups + 1
    WHERE id = v_pickup.collector_id;

    RETURN jsonb_build_object(
        'success', true,
        'pickup_id', p_pickup_id,
        'payment_id', v_payment_id,
        'eco_coins_awarded', v_eco_coins,
        'final_weight', p_final_weight,
        'final_value', p_final_value
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================

-- Enable RLS on all application tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrap_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_audit_trail ENABLE ROW LEVEL SECURITY;

-- ── Helper: get current user's role ──
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper: get current user's citizen_id ──
CREATE OR REPLACE FUNCTION get_citizen_id()
RETURNS TEXT AS $$
    SELECT id FROM citizens WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Helper: get current user's collector_id ──
CREATE OR REPLACE FUNCTION get_collector_id()
RETURNS TEXT AS $$
    SELECT id FROM collectors WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────
-- PROFILES POLICIES
-- ─────────────────────────────────────────────
CREATE POLICY "Users can read own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admin can read all profiles"
    ON profiles FOR SELECT
    USING (get_user_role() = 'admin');

CREATE POLICY "Admin can update all profiles"
    ON profiles FOR UPDATE
    USING (get_user_role() = 'admin');

CREATE POLICY "Service role can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (TRUE);

-- ─────────────────────────────────────────────
-- CITIZENS POLICIES
-- ─────────────────────────────────────────────
CREATE POLICY "Citizens can read own record"
    ON citizens FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Citizens can update own record"
    ON citizens FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can read all citizens"
    ON citizens FOR SELECT
    USING (get_user_role() = 'admin');

CREATE POLICY "Admin can update all citizens"
    ON citizens FOR UPDATE
    USING (get_user_role() = 'admin');

CREATE POLICY "Service role can insert citizens"
    ON citizens FOR INSERT
    WITH CHECK (TRUE);

-- ─────────────────────────────────────────────
-- COLLECTORS POLICIES
-- ─────────────────────────────────────────────
-- Citizens need to see collector public info to choose one
CREATE POLICY "Active citizens can view active collectors"
    ON collectors FOR SELECT
    USING (
        get_user_role() = 'citizen' 
        AND status = 'active'
    );

CREATE POLICY "Collectors can read own record"
    ON collectors FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Collectors can update own record"
    ON collectors FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can read all collectors"
    ON collectors FOR SELECT
    USING (get_user_role() = 'admin');

CREATE POLICY "Admin can update all collectors"
    ON collectors FOR UPDATE
    USING (get_user_role() = 'admin');

CREATE POLICY "Service role can insert collectors"
    ON collectors FOR INSERT
    WITH CHECK (TRUE);

-- ─────────────────────────────────────────────
-- KYC DOCUMENTS POLICIES
-- ─────────────────────────────────────────────
CREATE POLICY "Users can read own KYC docs"
    ON kyc_documents FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own KYC docs"
    ON kyc_documents FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can read all KYC docs"
    ON kyc_documents FOR SELECT
    USING (get_user_role() = 'admin');

CREATE POLICY "Admin can update KYC docs"
    ON kyc_documents FOR UPDATE
    USING (get_user_role() = 'admin');

-- ─────────────────────────────────────────────
-- PICKUPS POLICIES
-- ─────────────────────────────────────────────
CREATE POLICY "Citizens can read own pickups"
    ON pickups FOR SELECT
    USING (citizen_id = get_citizen_id());

CREATE POLICY "Citizens can create pickups"
    ON pickups FOR INSERT
    WITH CHECK (citizen_id = get_citizen_id());

CREATE POLICY "Collectors can read assigned pickups"
    ON pickups FOR SELECT
    USING (collector_id = get_collector_id());

CREATE POLICY "Collectors can update assigned pickups"
    ON pickups FOR UPDATE
    USING (collector_id = get_collector_id());

CREATE POLICY "Admin can read all pickups"
    ON pickups FOR SELECT
    USING (get_user_role() = 'admin');

-- ─────────────────────────────────────────────
-- SCRAP CATEGORIES POLICIES
-- ─────────────────────────────────────────────
CREATE POLICY "Anyone authenticated can read scrap categories"
    ON scrap_categories FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage scrap categories"
    ON scrap_categories FOR ALL
    USING (get_user_role() = 'admin');

-- ─────────────────────────────────────────────
-- PAYMENTS POLICIES
-- ─────────────────────────────────────────────
CREATE POLICY "Citizens can read own payments"
    ON payments FOR SELECT
    USING (citizen_id = get_citizen_id());

CREATE POLICY "Collectors can read own payments"
    ON payments FOR SELECT
    USING (collector_id = get_collector_id());

CREATE POLICY "Admin can read all payments"
    ON payments FOR SELECT
    USING (get_user_role() = 'admin');

CREATE POLICY "Service can insert payments"
    ON payments FOR INSERT
    WITH CHECK (TRUE);

-- ─────────────────────────────────────────────
-- REWARD CATALOG POLICIES
-- ─────────────────────────────────────────────
CREATE POLICY "Anyone authenticated can read reward catalog"
    ON reward_catalog FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can manage reward catalog"
    ON reward_catalog FOR ALL
    USING (get_user_role() = 'admin');

-- ─────────────────────────────────────────────
-- REWARD TRANSACTIONS POLICIES
-- ─────────────────────────────────────────────
CREATE POLICY "Users can read own reward transactions"
    ON reward_transactions FOR SELECT
    USING (user_id = auth.uid()::text);

CREATE POLICY "Admin can read all reward transactions"
    ON reward_transactions FOR SELECT
    USING (get_user_role() = 'admin');

CREATE POLICY "Service can insert reward transactions"
    ON reward_transactions FOR INSERT
    WITH CHECK (TRUE);

-- ─────────────────────────────────────────────
-- NOTIFICATIONS POLICIES
-- ─────────────────────────────────────────────
CREATE POLICY "Users can read own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid()::text);

CREATE POLICY "Admin can read admin notifications"
    ON notifications FOR SELECT
    USING (get_user_role() = 'admin' AND role = 'admin');

CREATE POLICY "Service can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (TRUE);

-- ─────────────────────────────────────────────
-- ISSUES POLICIES
-- ─────────────────────────────────────────────
CREATE POLICY "Users can read own issues"
    ON issues FOR SELECT
    USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create issues"
    ON issues FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Admin can read all issues"
    ON issues FOR SELECT
    USING (get_user_role() = 'admin');

CREATE POLICY "Admin can update all issues"
    ON issues FOR UPDATE
    USING (get_user_role() = 'admin');

-- ─────────────────────────────────────────────
-- APPROVAL AUDIT TRAIL POLICIES
-- ─────────────────────────────────────────────
CREATE POLICY "Admin can read audit trail"
    ON approval_audit_trail FOR SELECT
    USING (get_user_role() = 'admin');

CREATE POLICY "Admin can insert audit records"
    ON approval_audit_trail FOR INSERT
    WITH CHECK (get_user_role() = 'admin');

-- =========================================================
-- REALTIME: Enable for key tables
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE pickups;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
