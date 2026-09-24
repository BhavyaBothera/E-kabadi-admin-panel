-- =========================================================
-- E-KABAADI PLATFORM
-- Phase 4A: Development Seed Data
-- File: supabase/migrations/003_seed_data.sql
--
-- All data is clearly fictional/demo. No real personal info.
-- These mirror the mock-*.js files for consistent testing.
--
-- NOTE: Auth users must be created via Supabase Auth API first.
-- This script populates the application tables only.
-- Use the companion seed script (seed-auth-users.js) to create
-- auth accounts, then run this SQL.
-- =========================================================

-- ─────────────────────────────────────────────
-- SCRAP CATEGORIES (no auth dependency)
-- ─────────────────────────────────────────────
INSERT INTO scrap_categories (id, category, name, code, icon, rate_per_kg, unit, description, recyclability, co2_saved_per_kg) VALUES
    ('SCRAP-01', 'Paper', 'Newspaper & Notebooks', 'PPR-NEWS', '📄', 14.0, 'kg', 'Old newspapers, magazines, notebooks, and office printing papers.', '100% Recyclable', 2.1),
    ('SCRAP-02', 'Cardboard', 'Corrugated Cardboard (Patti)', 'PPR-CART', '📦', 11.5, 'kg', 'Clean dry cardboard packaging, cartons, brown shipping boxes.', '100% Recyclable', 1.8),
    ('SCRAP-03', 'Plastic', 'PET Bottles & Rigid Plastics', 'PLS-PET', '♻️', 18.0, 'kg', 'Beverage bottles, milk pouches, plastic tubs, shampoo bottles.', 'Grade 1 & 2 Polyethylene', 2.8),
    ('SCRAP-04', 'Metal', 'Iron & Heavy Steel Scrap', 'MTL-IRON', '🔩', 32.0, 'kg', 'Pipes, rods, utensils, broken furniture frames, sheet metal.', 'Indefinitely Recyclable', 4.2),
    ('SCRAP-05', 'Metal', 'Aluminium & Beverage Cans', 'MTL-ALUM', '🥫', 145.0, 'kg', 'Drink cans, aluminium foils, cookware, frames.', '95% Energy Saving', 9.1),
    ('SCRAP-06', 'Metal', 'Brass / Pital Scrap', 'MTL-BRSS', '🟨', 380.0, 'kg', 'Pooja utensils, taps, locks, brass valves, decorative hardware.', 'High Value Alloy', 5.5),
    ('SCRAP-07', 'E-waste', 'Electronic Waste & Peripherals', 'EWS-PERI', '💻', 45.0, 'kg', 'Keyboards, chargers, cables, circuit boards, old adapters, CPU parts.', 'Certified Formal Recycler', 6.8),
    ('SCRAP-08', 'Glass', 'Glass Bottles & Jars', 'GLS-BOTT', '🫙', 4.5, 'kg', 'Beer bottles, pickle jars, beverage glass (unbroken).', '100% Recyclable', 0.9)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- REWARD CATALOG (no auth dependency)
-- ─────────────────────────────────────────────
INSERT INTO reward_catalog (id, name, description, cost, icon, category) VALUES
    ('RWD-001', 'Plant a Sapling in Noida City', 'Verified tree planted via Swachh Noida initiative', 100, '🌳', 'environment'),
    ('RWD-002', '₹50 Direct UPI Cashback', 'Direct credit to your linked UPI address', 200, '💰', 'cashback'),
    ('RWD-003', 'Eco Champion Bronze Badge', 'Digital verifiable green certificate', 500, '🥉', 'badge'),
    ('RWD-004', '₹100 Direct UPI Cashback', 'Instant transfer to your linked bank UPI', 400, '💰', 'cashback'),
    ('RWD-005', 'Eco Champion Silver Badge', 'Top 5% sustainable household recognition', 1000, '🥈', 'badge'),
    ('RWD-006', 'Eco Champion Gold Badge', 'Verified net-zero consumer recycler certification', 2500, '🥇', 'badge'),
    ('RWD-007', 'Donate ₹75 to Swachh Bharat Mission', 'Support local sanitation workers welfare fund', 150, '🇮🇳', 'donation')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- SEED DATA NOTES
-- ─────────────────────────────────────────────
-- The following tables require auth users to be created FIRST:
--   profiles, citizens, collectors
--
-- After running seed-auth-users.js, use the returned UUIDs
-- to populate these tables. The seed script handles this.
--
-- For reference, the demo accounts are:
--
-- ADMIN:
--   email: admin@ekabadi.demo
--   password: admin123
--   role: admin
--
-- CITIZEN 1:
--   email: citizen@ekabadi.demo
--   password: citizen123
--   role: citizen, citizenId: CIT-1001
--
-- CITIZEN 2:
--   email: priya.verma@email.com
--   password: password123
--   role: citizen, citizenId: CIT-1002
--
-- COLLECTOR 1:
--   email: collector@ekabadi.demo
--   password: collector123
--   role: collector, collectorId: COL-2001
--
-- COLLECTOR 2:
--   email: suresh.y@email.com
--   password: password123
--   role: collector, collectorId: COL-2002
--
-- PENDING CITIZEN:
--   email: vikas.applicant@email.com
--   password: password123
--   role: citizen, status: pending_approval
--
-- PENDING COLLECTOR:
--   email: manoj.scrap@email.com
--   password: password123
--   role: collector, status: pending_approval
--
-- See docs/environment-setup.md for the full seed process.
