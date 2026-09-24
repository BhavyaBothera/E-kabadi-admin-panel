-- =========================================================
-- E-KABAADI PLATFORM — MIGRATION 007: REAL PAYMENT INFRASTRUCTURE & SETTLEMENT
-- Phase 4F: Real Payment Infrastructure, Settlement & Financial Ledger
-- File: supabase/migrations/007_real_payments.sql
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. EXTEND PAYMENTS TABLE WITH PROVIDER & SNAPSHOT FIELDS
-- ─────────────────────────────────────────────

-- Add provider and order tracking columns
ALTER TABLE payments 
    ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'razorpay',
    ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
    ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
    ADD COLUMN IF NOT EXISTS provider_signature TEXT,
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS amount_paise BIGINT,
    ADD COLUMN IF NOT EXISTS rate_per_kg_snapshot DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS final_weight_kg_snapshot DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS scrap_category_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS rate_version TEXT DEFAULT 'v1',
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS provider_refund_id TEXT;

-- Create indexes on provider identifiers for O(1) lookup
CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id ON payments(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_payment_id ON payments(provider_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Update status check constraint to support complete payment lifecycle while preserving legacy values
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
    CHECK (status IN (
        'created', 'order_created', 'payment_pending', 'pending',
        'authorized', 'captured', 'verified', 'paid', 'settled',
        'failed', 'cancelled', 'refunded'
    ));

-- ─────────────────────────────────────────────
-- 2. PROVIDER EVENTS TABLE (WEBHOOK IDEMPOTENCY)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_provider_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'razorpay',
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    order_id TEXT,
    payment_id TEXT,
    payload_hash TEXT,
    processing_status TEXT DEFAULT 'processed'
        CHECK (processing_status IN ('received', 'processed', 'failed', 'ignored')),
    error_message TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_provider_event UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_events_order_id ON payment_provider_events(order_id);
CREATE INDEX IF NOT EXISTS idx_provider_events_payment_id ON payment_provider_events(payment_id);

-- ─────────────────────────────────────────────
-- 3. FINANCIAL LEDGER (IMMUTABLE DOUBLE-ENTRY JOURNAL)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS financial_ledger (
    id TEXT PRIMARY KEY,
    pickup_id TEXT REFERENCES pickups(id),
    payment_id TEXT REFERENCES payments(id),
    entry_type TEXT NOT NULL 
        CHECK (entry_type IN ('payout', 'platform_fee', 'adjustment', 'refund', 'reversal')),
    account_type TEXT NOT NULL 
        CHECK (account_type IN ('citizen', 'collector', 'platform', 'escrow')),
    account_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    amount_paise BIGINT NOT NULL,
    currency TEXT DEFAULT 'INR',
    direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_pickup_id ON financial_ledger(pickup_id);
CREATE INDEX IF NOT EXISTS idx_ledger_payment_id ON financial_ledger(payment_id);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON financial_ledger(account_type, account_id);

-- Enforce financial ledger immutability: NO UPDATES OR DELETES PERMITTED
CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Security violation: Financial ledger entries are strictly immutable.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_ledger_update ON financial_ledger;
CREATE TRIGGER trg_prevent_ledger_update
    BEFORE UPDATE ON financial_ledger
    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

DROP TRIGGER IF EXISTS trg_prevent_ledger_delete ON financial_ledger;
CREATE TRIGGER trg_prevent_ledger_delete
    BEFORE DELETE ON financial_ledger
    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

-- ─────────────────────────────────────────────
-- 4. PAYMENT ADJUSTMENTS (EXPLICIT AUDITED ADJUSTMENTS)
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_adjustments (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL REFERENCES payments(id),
    pickup_id TEXT NOT NULL REFERENCES pickups(id),
    adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('correction', 'refund', 'dispute', 'fee_waiver')),
    amount_delta DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adjustments_payment_id ON payment_adjustments(payment_id);

-- ─────────────────────────────────────────────
-- 5. ATOMIC PAYMENT ORDER CREATION RPC
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_payment_order_atomic(
    p_pickup_id TEXT,
    p_provider TEXT,
    p_provider_order_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_pickup RECORD;
    v_existing_payment RECORD;
    v_rate DECIMAL(10,2);
    v_category_name TEXT;
    v_calculated_amount DECIMAL(10,2);
    v_amount_paise BIGINT;
    v_payment_id TEXT;
BEGIN
    -- 1. Fetch pickup
    SELECT * INTO v_pickup FROM pickups WHERE id = p_pickup_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pickup not found');
    END IF;

    -- 2. Validate pickup state
    IF v_pickup.status IN ('paid') OR v_pickup.payment_status = 'paid' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pickup has already been paid and settled.');
    END IF;

    -- 3. Check for existing payment order
    SELECT * INTO v_existing_payment FROM payments WHERE pickup_id = p_pickup_id LIMIT 1;
    IF FOUND AND v_existing_payment.status IN ('paid', 'settled', 'verified') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment already settled for this pickup.');
    END IF;

    -- 4. Calculate authoritative amount from final weight and trusted scrap rate
    -- Determine dominant category name
    v_category_name := COALESCE(v_pickup.scrap_type, 'Mixed Recyclables');
    
    -- Lookup trusted catalog rate
    SELECT rate_per_kg INTO v_rate FROM scrap_categories 
    WHERE LOWER(name) = LOWER(v_category_name) LIMIT 1;
    
    IF v_rate IS NULL OR v_rate <= 0 THEN
        v_rate := 14.00; -- Default certified catalog rate fallback
    END IF;

    -- Authoritative calculation: weight * rate
    v_calculated_amount := ROUND((COALESCE(v_pickup.final_weight, v_pickup.estimated_weight, 1.0) * v_rate)::numeric, 2);
    v_amount_paise := ROUND(v_calculated_amount * 100);

    -- 5. Insert or update payment record with order
    IF FOUND THEN
        v_payment_id := v_existing_payment.id;
        UPDATE payments SET
            provider = COALESCE(p_provider, 'razorpay'),
            provider_order_id = p_provider_order_id,
            amount = v_calculated_amount,
            amount_paise = v_amount_paise,
            rate_per_kg_snapshot = v_rate,
            final_weight_kg_snapshot = COALESCE(v_pickup.final_weight, v_pickup.estimated_weight),
            scrap_category_snapshot = v_category_name,
            status = 'order_created',
            updated_at = NOW()
        WHERE id = v_payment_id;
    ELSE
        v_payment_id := 'TXN-' || floor(random() * 9000 + 1000)::text;
        INSERT INTO payments (
            id, pickup_id, citizen_id, collector_id, citizen_name, collector_name,
            amount, amount_paise, method, status, provider, provider_order_id,
            rate_per_kg_snapshot, final_weight_kg_snapshot, scrap_category_snapshot,
            currency, created_at
        ) VALUES (
            v_payment_id, p_pickup_id, v_pickup.citizen_id, v_pickup.collector_id,
            v_pickup.citizen_name, v_pickup.collector_name,
            v_calculated_amount, v_amount_paise, COALESCE(v_pickup.payment_method, 'UPI'),
            'order_created', COALESCE(p_provider, 'razorpay'), p_provider_order_id,
            v_rate, COALESCE(v_pickup.final_weight, v_pickup.estimated_weight), v_category_name,
            'INR', NOW()
        );
    END IF;

    -- Transition pickup payment_status to payment_pending
    UPDATE pickups SET
        payment_status = 'pending',
        final_value = v_calculated_amount
    WHERE id = p_pickup_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'pickup_id', p_pickup_id,
        'order_id', p_provider_order_id,
        'amount', v_calculated_amount,
        'amount_paise', v_amount_paise,
        'rate_per_kg', v_rate,
        'currency', 'INR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 6. ATOMIC PAYMENT VERIFICATION & SETTLEMENT RPC
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION verify_and_settle_payment_atomic(
    p_pickup_id TEXT,
    p_payment_id TEXT,
    p_provider_payment_id TEXT,
    p_provider_signature TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_pickup RECORD;
    v_payment RECORD;
    v_eco_coins INTEGER;
    v_ledger_id TEXT;
    v_reward_id TEXT;
BEGIN
    -- 1. Fetch and lock payment record
    SELECT * INTO v_payment FROM payments WHERE id = p_payment_id OR pickup_id = p_pickup_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment record not found.');
    END IF;

    -- 2. Idempotency: If already settled or paid, return existing success state
    IF v_payment.status IN ('paid', 'settled', 'verified') THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_settled', true,
            'payment_id', v_payment.id,
            'pickup_id', v_payment.pickup_id,
            'amount', v_payment.amount
        );
    END IF;

    -- 3. Fetch pickup record
    SELECT * INTO v_pickup FROM pickups WHERE id = v_payment.pickup_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Associated pickup not found.');
    END IF;

    -- 4. Calculate Eco Coins (2 coins per kg, min 10)
    v_eco_coins := GREATEST(10, ROUND(COALESCE(v_payment.final_weight_kg_snapshot, v_pickup.final_weight, 1.0) * 2));

    -- 5. Mark payment as settled
    UPDATE payments SET
        status = 'settled',
        provider_payment_id = COALESCE(p_provider_payment_id, transaction_id),
        provider_signature = p_provider_signature,
        verified_at = NOW(),
        settled_at = NOW(),
        completed_at = NOW()
    WHERE id = v_payment.id;

    -- 6. Mark pickup as paid and completed
    UPDATE pickups SET
        status = 'completed',
        payment_status = 'paid',
        paid_at = NOW(),
        eco_coins_awarded = v_eco_coins
    WHERE id = v_pickup.id;

    -- 7. Add financial ledger entry (credit to citizen payout account)
    v_ledger_id := 'LDG-' || floor(random() * 900000 + 100000)::text;
    INSERT INTO financial_ledger (
        id, pickup_id, payment_id, entry_type, account_type, account_id,
        amount, amount_paise, currency, direction, description, created_at
    ) VALUES (
        v_ledger_id, v_pickup.id, v_payment.id, 'payout', 'citizen', v_pickup.citizen_id,
        v_payment.amount, COALESCE(v_payment.amount_paise, ROUND(v_payment.amount * 100)),
        'INR', 'credit',
        'Scrap payout for pickup ' || v_pickup.id || ' (' || COALESCE(v_payment.final_weight_kg_snapshot, v_pickup.final_weight, 0) || ' kg)',
        NOW()
    );

    -- 8. Add Eco Coins reward transaction (idempotent via unique constraint)
    v_reward_id := 'RWD-TXN-' || floor(random() * 9000 + 1000)::text;
    INSERT INTO reward_transactions (id, user_id, type, points, pickup_id, description, created_at)
    VALUES (
        v_reward_id,
        (SELECT user_id::text FROM citizens WHERE id = v_pickup.citizen_id),
        'earned_pickup', v_eco_coins, v_pickup.id,
        'Eco Coins earned from Pickup ' || v_pickup.id,
        NOW()
    )
    ON CONFLICT (pickup_id, type) WHERE type = 'earned_pickup' AND pickup_id != '' DO NOTHING;

    -- 9. Update citizen stats
    UPDATE citizens SET
        total_earnings = COALESCE(total_earnings, 0) + v_payment.amount,
        total_waste_sold = COALESCE(total_waste_sold, 0) + COALESCE(v_payment.final_weight_kg_snapshot, v_pickup.final_weight, 0),
        completed_pickups = COALESCE(completed_pickups, 0) + 1,
        eco_coins = COALESCE(eco_coins, 0) + v_eco_coins
    WHERE id = v_pickup.citizen_id;

    -- 10. Record immutable audit entry
    INSERT INTO approval_audit_trail (id, entity_type, entity_id, reviewer_name, action, reason, created_at)
    VALUES (
        'AUD-PAY-' || floor(random() * 9000 + 1000)::text,
        'payment', v_payment.id, 'Razorpay Payment Gateway (System)',
        'SETTLE', 'Payment verified and settled atomically. Eco coins: ' || v_eco_coins,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'settled', true,
        'payment_id', v_payment.id,
        'pickup_id', v_pickup.id,
        'amount', v_payment.amount,
        'eco_coins_awarded', v_eco_coins,
        'provider_payment_id', p_provider_payment_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
-- ─────────────────────────────────────────────

ALTER TABLE payment_provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_adjustments ENABLE ROW LEVEL SECURITY;

-- Provider events: Admin read-only, service inserts via Edge Function
DROP POLICY IF EXISTS "Admin can read provider events" ON payment_provider_events;
CREATE POLICY "Admin can read provider events"
    ON payment_provider_events FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Financial ledger: Citizens read own entries, Collectors read own entries, Admin reads all
DROP POLICY IF EXISTS "Citizens can read own ledger entries" ON financial_ledger;
CREATE POLICY "Citizens can read own ledger entries"
    ON financial_ledger FOR SELECT
    USING (
        account_type = 'citizen' AND account_id IN (
            SELECT id FROM citizens WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Collectors can read own ledger entries" ON financial_ledger;
CREATE POLICY "Collectors can read own ledger entries"
    ON financial_ledger FOR SELECT
    USING (
        account_type = 'collector' AND account_id IN (
            SELECT id FROM collectors WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admin can read all ledger entries" ON financial_ledger;
CREATE POLICY "Admin can read all ledger entries"
    ON financial_ledger FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Payment Adjustments: Admin view and create only
DROP POLICY IF EXISTS "Admin can manage adjustments" ON payment_adjustments;
CREATE POLICY "Admin can manage adjustments"
    ON payment_adjustments FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Add to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE financial_ledger;
