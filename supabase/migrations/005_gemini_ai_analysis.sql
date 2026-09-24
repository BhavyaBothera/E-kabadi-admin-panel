-- =========================================================
-- E-KABAADI PLATFORM — Database Migration 005
-- Phase 4D: Gemini AI Scrap Analysis & Valuation Schema
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. AI ANALYSES TABLE
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_analyses (
    id TEXT PRIMARY KEY,
    citizen_id TEXT NOT NULL REFERENCES citizens(id),
    pickup_id TEXT REFERENCES pickups(id),
    provider TEXT NOT NULL DEFAULT 'gemini',
    model TEXT DEFAULT 'gemini-1.5-flash',
    detected_category TEXT NOT NULL,
    mapped_category TEXT NOT NULL,
    confidence DECIMAL(4,3) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    confidence_tier TEXT NOT NULL CHECK (confidence_tier IN ('high', 'medium', 'low')),
    estimated_weight DECIMAL(8,2) NOT NULL CHECK (estimated_weight >= 0.0),
    official_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estimated_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'analyzed'
        CHECK (status IN ('analyzed', 'confirmed', 'corrected', 'discarded', 'booked')),
    user_confirmed BOOLEAN DEFAULT FALSE,
    user_corrected BOOLEAN DEFAULT FALSE,
    corrected_category TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    notes TEXT DEFAULT '',
    image_storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_citizen_id ON ai_analyses(citizen_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_pickup_id ON ai_analyses(pickup_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_status ON ai_analyses(status);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_analyses(created_at);

-- ─────────────────────────────────────────────
-- 2. ENHANCE PICKUPS TABLE WITH AI METADATA
-- ─────────────────────────────────────────────
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pickups' AND column_name = 'ai_analysis_id'
    ) THEN
        ALTER TABLE pickups ADD COLUMN ai_analysis_id TEXT REFERENCES ai_analyses(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pickups' AND column_name = 'ai_metadata'
    ) THEN
        ALTER TABLE pickups ADD COLUMN ai_metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY (RLS) FOR AI ANALYSES
-- ─────────────────────────────────────────────
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

-- Citizens can view their own AI analyses
CREATE POLICY "Citizens read own ai analyses"
    ON ai_analyses FOR SELECT
    USING (
        citizen_id = get_citizen_id() OR
        get_user_role() = 'admin'
    );

-- Citizens can insert their own AI analyses
CREATE POLICY "Citizens create own ai analyses"
    ON ai_analyses FOR INSERT
    WITH CHECK (
        citizen_id = get_citizen_id() OR
        get_user_role() = 'admin'
    );

-- Citizens can update their own AI analyses (e.g., mark confirmed / corrected)
CREATE POLICY "Citizens update own ai analyses"
    ON ai_analyses FOR UPDATE
    USING (
        citizen_id = get_citizen_id() OR
        get_user_role() = 'admin'
    );

-- Collectors can view analyses associated with pickups assigned to them
CREATE POLICY "Collectors read assigned pickup ai analyses"
    ON ai_analyses FOR SELECT
    USING (
        pickup_id IN (
            SELECT id FROM pickups WHERE collector_id = get_collector_id()
        )
    );

-- ─────────────────────────────────────────────
-- 4. ADMIN ANALYTICS FUNCTION FOR AI PERFORMANCE
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_ai_analysis_stats()
RETURNS JSONB AS $$
DECLARE
    v_total_analyses BIGINT;
    v_confirmed_count BIGINT;
    v_corrected_count BIGINT;
    v_high_confidence_count BIGINT;
    v_avg_confidence NUMERIC;
    v_avg_weight_diff NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_total_analyses FROM ai_analyses;
    SELECT COUNT(*) INTO v_confirmed_count FROM ai_analyses WHERE user_confirmed = TRUE;
    SELECT COUNT(*) INTO v_corrected_count FROM ai_analyses WHERE user_corrected = TRUE;
    SELECT COUNT(*) INTO v_high_confidence_count FROM ai_analyses WHERE confidence >= 0.85;
    SELECT COALESCE(ROUND(AVG(confidence)::numeric, 2), 0.00) INTO v_avg_confidence FROM ai_analyses;

    -- Compute variance between AI estimated weight and final scale weight on completed pickups
    SELECT COALESCE(ROUND(AVG(ABS(p.final_weight - a.estimated_weight))::numeric, 2), 0.00)
    INTO v_avg_weight_diff
    FROM pickups p
    JOIN ai_analyses a ON p.ai_analysis_id = a.id
    WHERE p.status IN ('completed', 'paid') AND p.final_weight IS NOT NULL;

    RETURN jsonb_build_object(
        'total_analyses', v_total_analyses,
        'confirmed_analyses', v_confirmed_count,
        'corrected_analyses', v_corrected_count,
        'high_confidence_analyses', v_high_confidence_count,
        'average_confidence', v_avg_confidence,
        'average_weight_variance_kg', v_avg_weight_diff
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
