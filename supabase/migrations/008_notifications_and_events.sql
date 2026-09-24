-- =========================================================
-- E-KABAADI PLATFORM — MIGRATION 008
-- Phase 4G: Real-Time Notifications, Communication & Event Intelligence
-- =========================================================

-- 1. ADDITIVE EXTENSIONS TO NOTIFICATIONS TABLE
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS entity_id TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS pickup_id TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'sms', 'push')),
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    ADD COLUMN IF NOT EXISTS action_url TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Unique constraint on idempotency_key to prevent duplicate deliveries
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_idempotency_key 
    ON notifications(idempotency_key) 
    WHERE idempotency_key IS NOT NULL AND idempotency_key != '';

CREATE INDEX IF NOT EXISTS idx_notifications_event_type ON notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;

-- 2. NOTIFICATION PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    pickup_updates BOOLEAN DEFAULT TRUE,
    payment_updates BOOLEAN DEFAULT TRUE,
    reward_updates BOOLEAN DEFAULT TRUE,
    account_updates BOOLEAN DEFAULT TRUE,
    issue_updates BOOLEAN DEFAULT TRUE,
    marketing_updates BOOLEAN DEFAULT FALSE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TEXT DEFAULT '22:00',
    quiet_hours_end TEXT DEFAULT '07:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- 3. NOTIFICATION OUTBOX TABLE (Transactional Outbox Pattern)
CREATE TABLE IF NOT EXISTS notification_outbox (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    idempotency_key TEXT UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_pending ON notification_outbox(status, created_at) WHERE status = 'pending';

-- 4. NOTIFICATION DELIVERY ATTEMPTS AUDIT TABLE
CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
    id TEXT PRIMARY KEY,
    notification_id TEXT REFERENCES notifications(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push')),
    status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    provider TEXT NOT NULL,
    error_message TEXT,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_notif ON notification_delivery_attempts(notification_id);

-- 5. IMMUTABILITY TRIGGER ON NOTIFICATIONS
-- Prevents clients or attackers from rewriting recipient, event type, or timestamp
CREATE OR REPLACE FUNCTION prevent_notification_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.user_id != NEW.user_id THEN
        RAISE EXCEPTION 'Security violation: Notification recipient is immutable.';
    END IF;
    IF OLD.event_type != NEW.event_type THEN
        RAISE EXCEPTION 'Security violation: Notification event type is immutable.';
    END IF;
    IF OLD.created_at != NEW.created_at THEN
        RAISE EXCEPTION 'Security violation: Notification creation timestamp is immutable.';
    END IF;
    IF OLD.idempotency_key IS NOT NULL AND OLD.idempotency_key != NEW.idempotency_key THEN
        RAISE EXCEPTION 'Security violation: Notification idempotency key is immutable.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_notification_tampering ON notifications;
CREATE TRIGGER trg_prevent_notification_tampering
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION prevent_notification_tampering();

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_attempts ENABLE ROW LEVEL SECURITY;

-- Preferences: Users manage only their own
DROP POLICY IF EXISTS "Users can read own notification preferences" ON notification_preferences;
CREATE POLICY "Users can read own notification preferences"
    ON notification_preferences FOR SELECT
    USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
CREATE POLICY "Users can update own notification preferences"
    ON notification_preferences FOR UPDATE
    USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
    ON notification_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);

-- Delivery attempts: Users can inspect attempts for their own notifications
DROP POLICY IF EXISTS "Users can read own notification delivery attempts" ON notification_delivery_attempts;
CREATE POLICY "Users can read own notification delivery attempts"
    ON notification_delivery_attempts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM notifications n 
        WHERE n.id = notification_delivery_attempts.notification_id 
        AND n.user_id = auth.uid()::text
    ));

-- Outbox: Accessible strictly by service role / backend functions (no public policies)

-- 7. ENSURE REALTIME SUBSCRIPTION FOR NOTIFICATIONS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;

-- 8. ATOMIC STORED PROCEDURES / RPCS
-- Atomic Event Outbox Emission
CREATE OR REPLACE FUNCTION emit_business_event_atomic(
    p_event_type TEXT,
    p_aggregate_type TEXT,
    p_aggregate_id TEXT,
    p_recipient_id TEXT,
    p_payload JSONB DEFAULT '{}',
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_outbox_id TEXT;
    v_existing_id TEXT;
BEGIN
    -- Check idempotency
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key != '' THEN
        SELECT id INTO v_existing_id FROM notification_outbox WHERE idempotency_key = p_idempotency_key;
        IF v_existing_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', TRUE,
                'outboxId', v_existing_id,
                'duplicate', TRUE
            );
        END IF;
    END IF;

    v_outbox_id := 'EVT-' || floor(random() * 900000 + 100000)::text;

    INSERT INTO notification_outbox (
        id,
        event_type,
        aggregate_type,
        aggregate_id,
        recipient_id,
        payload,
        idempotency_key,
        status,
        created_at
    ) VALUES (
        v_outbox_id,
        p_event_type,
        p_aggregate_type,
        p_aggregate_id,
        p_recipient_id,
        p_payload,
        p_idempotency_key,
        'pending',
        NOW()
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'outboxId', v_outbox_id,
        'duplicate', FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Authoritative Unread Notification Count
CREATE OR REPLACE FUNCTION get_authoritative_unread_count(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM notifications
    WHERE user_id = p_user_id AND read = FALSE;

    RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
