-- =========================================================
-- E-KABAADI PLATFORM — MIGRATION 009
-- Phase 5: Real-Time Fleet Tracking, Routing, ETA & Geo-Spatial Operations
-- File: supabase/migrations/009_fleet_tracking_and_routing.sql
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. COLLECTOR LIVE LOCATIONS (CURRENT OPERATIONAL STATE)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.collector_live_locations (
    collector_id TEXT PRIMARY KEY REFERENCES public.collectors(id) ON DELETE CASCADE,
    pickup_id TEXT REFERENCES public.pickups(id) ON DELETE SET NULL,
    latitude DECIMAL(9,6) NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DECIMAL(9,6) NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    heading DECIMAL(5,2) DEFAULT NULL CHECK (heading IS NULL OR (heading >= 0.0 AND heading <= 360.0)),
    speed_kmh DECIMAL(5,2) DEFAULT NULL CHECK (speed_kmh IS NULL OR speed_kmh >= 0.0),
    accuracy_meters DECIMAL(6,2) DEFAULT NULL,
    source TEXT DEFAULT 'browser_gps',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'offline', 'stale')),
    freshness_status TEXT DEFAULT 'LIVE' CHECK (freshness_status IN ('LIVE', 'RECENT', 'STALE', 'OFFLINE')),
    is_simulated BOOLEAN DEFAULT FALSE,
    anomaly_flag TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collector_live_locations_pickup ON public.collector_live_locations(pickup_id);
CREATE INDEX IF NOT EXISTS idx_collector_live_locations_freshness ON public.collector_live_locations(freshness_status);

-- ─────────────────────────────────────────────
-- 2. PICKUP TRACKING SESSIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pickup_tracking_sessions (
    id TEXT PRIMARY KEY,
    pickup_id TEXT NOT NULL UNIQUE REFERENCES public.pickups(id) ON DELETE CASCADE,
    collector_id TEXT NOT NULL REFERENCES public.collectors(id) ON DELETE CASCADE,
    citizen_id TEXT NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'requested', 'active', 'paused', 'stopped')),
    location_freshness TEXT DEFAULT 'OFFLINE' CHECK (location_freshness IN ('LIVE', 'RECENT', 'STALE', 'OFFLINE')),
    route_freshness TEXT DEFAULT 'UNAVAILABLE' CHECK (route_freshness IN ('FRESH', 'STALE', 'UNAVAILABLE')),
    eta_status TEXT DEFAULT 'UNAVAILABLE' CHECK (eta_status IN ('AVAILABLE', 'STALE', 'UNAVAILABLE', 'ROUTE_UNAVAILABLE')),
    eta_seconds INTEGER DEFAULT NULL,
    distance_meters INTEGER DEFAULT NULL,
    route_geometry JSONB DEFAULT NULL,
    is_near_destination BOOLEAN DEFAULT FALSE,
    deviation_status TEXT DEFAULT 'ON_ROUTE' CHECK (deviation_status IN ('ON_ROUTE', 'MINOR_DEVIATION', 'OFF_ROUTE', 'ROUTE_UNKNOWN')),
    is_simulated BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ DEFAULT NULL,
    ended_at TIMESTAMPTZ DEFAULT NULL,
    last_location_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_tracking_sessions_collector ON public.pickup_tracking_sessions(collector_id);
CREATE INDEX IF NOT EXISTS idx_pickup_tracking_sessions_citizen ON public.pickup_tracking_sessions(citizen_id);
CREATE INDEX IF NOT EXISTS idx_pickup_tracking_sessions_status ON public.pickup_tracking_sessions(status);

-- ─────────────────────────────────────────────
-- 3. EPHEMERAL COLLECTOR LOCATION HISTORY (AUDIT & TELEMETRY RETENTION)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.collector_location_history (
    id BIGSERIAL PRIMARY KEY,
    collector_id TEXT NOT NULL REFERENCES public.collectors(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES public.pickup_tracking_sessions(id) ON DELETE CASCADE,
    latitude DECIMAL(9,6) NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
    longitude DECIMAL(9,6) NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
    speed_kmh DECIMAL(5,2) DEFAULT NULL,
    heading DECIMAL(5,2) DEFAULT NULL,
    accuracy_meters DECIMAL(6,2) DEFAULT NULL,
    anomaly_flag TEXT DEFAULT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collector_loc_hist_col_time ON public.collector_location_history(collector_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_collector_loc_hist_session ON public.collector_location_history(session_id);

-- ─────────────────────────────────────────────
-- 4. RETENTION CLEANUP PROCEDURE (NO PERMANENT SURVEILLANCE DATABASE)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_stale_location_history(p_retention_hours INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.collector_location_history
    WHERE recorded_at < (NOW() - (p_retention_hours || ' hours')::INTERVAL);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────
-- 5. IMMUTABILITY TRIGGER ON TRACKING SESSIONS
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_tracking_session_tampering()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent changing collector_id, citizen_id, or pickup_id once established
    IF OLD.collector_id IS DISTINCT FROM NEW.collector_id THEN
        RAISE EXCEPTION 'Security violation: Collector cannot be changed on a tracking session.';
    END IF;
    IF OLD.citizen_id IS DISTINCT FROM NEW.citizen_id THEN
        RAISE EXCEPTION 'Security violation: Citizen cannot be changed on a tracking session.';
    END IF;
    IF OLD.pickup_id IS DISTINCT FROM NEW.pickup_id THEN
        RAISE EXCEPTION 'Security violation: Pickup reference is immutable on a tracking session.';
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_tracking_session_tampering ON public.pickup_tracking_sessions;
CREATE TRIGGER trg_prevent_tracking_session_tampering
    BEFORE UPDATE ON public.pickup_tracking_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_tracking_session_tampering();

-- ─────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────
ALTER TABLE public.collector_live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collector_location_history ENABLE ROW LEVEL SECURITY;

-- ── 6.1 collector_live_locations RLS ──
DROP POLICY IF EXISTS "Authorized users view collector live location" ON public.collector_live_locations;
CREATE POLICY "Authorized users view collector live location"
    ON public.collector_live_locations FOR SELECT
    USING (
        -- 1. Collector views their own live location
        EXISTS (
            SELECT 1 FROM public.collectors c
            WHERE c.id = collector_live_locations.collector_id
            AND c.user_id = auth.uid()
        )
        OR
        -- 2. Citizen views ONLY if collector is handling an active pickup for that citizen
        EXISTS (
            SELECT 1 FROM public.pickups p
            JOIN public.citizens cit ON cit.id = p.citizen_id
            WHERE p.id = collector_live_locations.pickup_id
            AND p.collector_id = collector_live_locations.collector_id
            AND cit.user_id = auth.uid()
            AND p.status IN ('accepted', 'on_the_way', 'arrived', 'collecting')
        )
        OR
        -- 3. Admin views for fleet operations
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Collector updates own live location" ON public.collector_live_locations;
CREATE POLICY "Collector updates own live location"
    ON public.collector_live_locations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.collectors c
            WHERE c.id = collector_live_locations.collector_id
            AND c.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Collector modifies own live location" ON public.collector_live_locations;
CREATE POLICY "Collector modifies own live location"
    ON public.collector_live_locations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.collectors c
            WHERE c.id = collector_live_locations.collector_id
            AND c.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.collectors c
            WHERE c.id = collector_live_locations.collector_id
            AND c.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ── 6.2 pickup_tracking_sessions RLS ──
DROP POLICY IF EXISTS "Participants view pickup tracking session" ON public.pickup_tracking_sessions;
CREATE POLICY "Participants view pickup tracking session"
    ON public.pickup_tracking_sessions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.citizens cit
            WHERE cit.id = pickup_tracking_sessions.citizen_id
            AND cit.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.collectors col
            WHERE col.id = pickup_tracking_sessions.collector_id
            AND col.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Collector or Admin manages tracking session" ON public.pickup_tracking_sessions;
CREATE POLICY "Collector or Admin manages tracking session"
    ON public.pickup_tracking_sessions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.collectors col
            WHERE col.id = pickup_tracking_sessions.collector_id
            AND col.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ── 6.3 collector_location_history RLS ──
DROP POLICY IF EXISTS "Collector or Admin views location history" ON public.collector_location_history;
CREATE POLICY "Collector or Admin views location history"
    ON public.collector_location_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.collectors col
            WHERE col.id = collector_location_history.collector_id
            AND col.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ─────────────────────────────────────────────
-- 7. SUPABASE REALTIME CONFIGURATION
-- ─────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.collector_live_locations;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_tracking_sessions;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Table may already be in publication
    NULL;
END;
$$;
