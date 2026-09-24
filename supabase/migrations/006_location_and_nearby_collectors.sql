-- =========================================================
-- E-KABAADI PLATFORM — MIGRATION 006
-- Phase 4E: Location, Maps & Nearby Collector Intelligence
-- File: supabase/migrations/006_location_and_nearby_collectors.sql
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. EXTEND COLLECTORS WITH PUBLIC LOCATION FIELDS
-- ─────────────────────────────────────────────
ALTER TABLE public.collectors
    ADD COLUMN IF NOT EXISTS service_radius_km DECIMAL(5,2) DEFAULT 8.0,
    ADD COLUMN IF NOT EXISTS service_area_locality TEXT DEFAULT 'Noida',
    ADD COLUMN IF NOT EXISTS approx_latitude DECIMAL(9,6) DEFAULT 28.6215,
    ADD COLUMN IF NOT EXISTS approx_longitude DECIMAL(9,6) DEFAULT 77.3645;

-- ─────────────────────────────────────────────
-- 2. EXTEND PICKUPS WITH IMMUTABLE LOCATION SNAPSHOT
-- ─────────────────────────────────────────────
ALTER TABLE public.pickups
    ADD COLUMN IF NOT EXISTS pickup_latitude DECIMAL(9,6),
    ADD COLUMN IF NOT EXISTS pickup_longitude DECIMAL(9,6),
    ADD COLUMN IF NOT EXISTS pickup_locality TEXT,
    ADD COLUMN IF NOT EXISTS pickup_address_snapshot TEXT;

-- ─────────────────────────────────────────────
-- 3. CITIZEN SAVED LOCATIONS TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.citizen_saved_locations (
    id TEXT PRIMARY KEY,
    citizen_id TEXT NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'Home',
    address_line TEXT NOT NULL,
    locality TEXT DEFAULT '',
    city TEXT DEFAULT 'Noida',
    state TEXT DEFAULT 'Uttar Pradesh',
    postal_code TEXT DEFAULT '',
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_citizen_saved_locations_cid ON public.citizen_saved_locations(citizen_id);

-- Enable RLS on saved locations
ALTER TABLE public.citizen_saved_locations ENABLE ROW LEVEL SECURITY;

-- Citizen can only view their own saved locations
DROP POLICY IF EXISTS "Citizens view own saved locations" ON public.citizen_saved_locations;
CREATE POLICY "Citizens view own saved locations"
    ON public.citizen_saved_locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.citizens c
            WHERE c.id = citizen_saved_locations.citizen_id
            AND c.user_id = auth.uid()
        )
    );

-- Citizen can insert own saved locations
DROP POLICY IF EXISTS "Citizens insert own saved locations" ON public.citizen_saved_locations;
CREATE POLICY "Citizens insert own saved locations"
    ON public.citizen_saved_locations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.citizens c
            WHERE c.id = citizen_saved_locations.citizen_id
            AND c.user_id = auth.uid()
        )
    );

-- Citizen can update own saved locations
DROP POLICY IF EXISTS "Citizens update own saved locations" ON public.citizen_saved_locations;
CREATE POLICY "Citizens update own saved locations"
    ON public.citizen_saved_locations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.citizens c
            WHERE c.id = citizen_saved_locations.citizen_id
            AND c.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.citizens c
            WHERE c.id = citizen_saved_locations.citizen_id
            AND c.user_id = auth.uid()
        )
    );

-- Citizen can delete own saved locations
DROP POLICY IF EXISTS "Citizens delete own saved locations" ON public.citizen_saved_locations;
CREATE POLICY "Citizens delete own saved locations"
    ON public.citizen_saved_locations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.citizens c
            WHERE c.id = citizen_saved_locations.citizen_id
            AND c.user_id = auth.uid()
        )
    );

-- Admins can view for customer support
DROP POLICY IF EXISTS "Admins view all saved locations" ON public.citizen_saved_locations;
CREATE POLICY "Admins view all saved locations"
    ON public.citizen_saved_locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ─────────────────────────────────────────────
-- 4. IMMUTABLE SELECTED COLLECTOR RULE
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_pickup_collector_reassignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Strict immutability: Once created, collector_id can NEVER be altered.
    IF OLD.collector_id IS DISTINCT FROM NEW.collector_id THEN
        RAISE EXCEPTION 'Security violation: Selected collector cannot be reassigned once pickup is created.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_pickup_collector_reassignment ON public.pickups;
CREATE TRIGGER trg_prevent_pickup_collector_reassignment
    BEFORE UPDATE ON public.pickups
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_pickup_collector_reassignment();

-- ─────────────────────────────────────────────
-- 5. UPDATE PUBLIC COLLECTOR DIRECTORY VIEW
-- ─────────────────────────────────────────────
-- Drop dependent wrapper and view to allow changing column names/order
DROP FUNCTION IF EXISTS public.get_public_collectors() CASCADE;
DROP VIEW IF EXISTS public.public_collectors_directory CASCADE;

CREATE VIEW public.public_collectors_directory
WITH (security_barrier = true) AS
SELECT
    id,
    name,
    business_name,
    vehicle_type,
    vehicle_number,
    service_area,
    COALESCE(service_radius_km, service_radius, 8.0) AS service_radius_km,
    COALESCE(service_radius_km, service_radius, 8.0) AS service_radius,
    COALESCE(service_area_locality, 'Noida') AS service_area_locality,
    approx_latitude,
    approx_longitude,
    rating,
    response_time,
    accepted_materials,
    scrap_categories,
    total_pickups,
    completed_pickups,
    is_online,
    status
FROM public.collectors
WHERE status = 'active';

GRANT SELECT ON public.public_collectors_directory TO authenticated, anon;

-- Recreate function wrapper for programmatic query
CREATE OR REPLACE FUNCTION public.get_public_collectors()
RETURNS SETOF public.public_collectors_directory AS $$
    SELECT * FROM public.public_collectors_directory WHERE status = 'active';
$$ LANGUAGE sql STABLE;

-- ─────────────────────────────────────────────
-- 6. GEOGRAPHIC PROXIMITY RPC (HAVERSINE)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_nearby_collectors(
    p_lat DECIMAL(9,6),
    p_lng DECIMAL(9,6),
    p_max_radius_km DECIMAL(5,2) DEFAULT 25.0
)
RETURNS TABLE (
    id TEXT,
    name TEXT,
    business_name TEXT,
    vehicle_type TEXT,
    vehicle_number TEXT,
    service_area TEXT,
    service_radius_km DECIMAL(5,2),
    service_area_locality TEXT,
    approx_latitude DECIMAL(9,6),
    approx_longitude DECIMAL(9,6),
    rating DECIMAL(3,2),
    response_time TEXT,
    accepted_materials TEXT[],
    scrap_categories TEXT[],
    total_pickups INTEGER,
    completed_pickups INTEGER,
    is_online BOOLEAN,
    status TEXT,
    distance_km DECIMAL(6,2),
    in_service_radius BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    -- Validate input coordinates
    IF p_lat IS NULL OR p_lng IS NULL OR p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
        RAISE EXCEPTION 'Invalid coordinates provided: lat %, lng %', p_lat, p_lng;
    END IF;

    RETURN QUERY
    WITH calculated AS (
        SELECT
            c.id,
            c.name,
            c.business_name,
            c.vehicle_type,
            c.vehicle_number,
            c.service_area,
            c.service_radius_km,
            c.service_area_locality,
            c.approx_latitude,
            c.approx_longitude,
            c.rating,
            c.response_time,
            c.accepted_materials,
            c.scrap_categories,
            c.total_pickups,
            c.completed_pickups,
            c.is_online,
            c.status,
            -- Haversine formula calculation in kilometers
            ROUND((
                6371.0 * 2.0 * ASIN(
                    SQRT(
                        POWER(SIN(RADIANS(c.approx_latitude - p_lat) / 2.0), 2) +
                        COS(RADIANS(p_lat)) * COS(RADIANS(c.approx_latitude)) *
                        POWER(SIN(RADIANS(c.approx_longitude - p_lng) / 2.0), 2)
                    )
                )
            )::numeric, 2) AS calc_dist_km
        FROM public.public_collectors_directory c
        WHERE c.status = 'active'
          AND c.approx_latitude IS NOT NULL
          AND c.approx_longitude IS NOT NULL
    )
    SELECT
        calc.id,
        calc.name,
        calc.business_name,
        calc.vehicle_type,
        calc.vehicle_number,
        calc.service_area,
        calc.service_radius_km,
        calc.service_area_locality,
        calc.approx_latitude,
        calc.approx_longitude,
        calc.rating,
        calc.response_time,
        calc.accepted_materials,
        calc.scrap_categories,
        calc.total_pickups,
        calc.completed_pickups,
        calc.is_online,
        calc.status,
        calc.calc_dist_km AS distance_km,
        (calc.calc_dist_km <= calc.service_radius_km) AS in_service_radius
    FROM calculated calc
    WHERE calc.calc_dist_km <= p_max_radius_km
    ORDER BY calc.is_online DESC, calc.calc_dist_km ASC;
END;
$$;
