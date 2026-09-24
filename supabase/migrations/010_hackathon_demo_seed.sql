-- =========================================================
-- E-KABAADI PLATFORM — MIGRATION 010
-- Complete Hackathon Demo Dataset & Seed Data
-- File: supabase/migrations/010_hackathon_demo_seed.sql
--
-- PURPOSE:
-- Populates a comprehensive, realistic operational dataset into Supabase
-- for Hackathon Judges and Evaluators. Includes fully configured Demo
-- accounts with active credentials, profiles, citizens, collectors,
-- live tracking sessions, verified pickups, UPI settlements, double-entry
-- financial ledger, Eco Coins reward transactions, notifications, and KYC audit trail.
--
-- DEMO ACCOUNTS FOR JUDGES:
-- ┌────────────┬─────────────────────────────┬──────────────┬───────────────────────────────┐
-- │ Role       │ Email                       │ Password     │ Demo Identity / Details       │
-- ├────────────┼─────────────────────────────┼──────────────┼───────────────────────────────┤
-- │ Admin      │ admin@ekabadi.demo          │ admin123     │ Bhavya Bothera (Platform Ops) │
-- │ Citizen    │ citizen@ekabadi.demo        │ citizen123   │ Aarav Sharma (Sec 62, Noida)  │
-- │ Citizen 2  │ priya.verma@email.com       │ password123  │ Priya Verma (Sec 18, Noida)   │
-- │ Citizen 3  │ vikas.applicant@email.com   │ password123  │ Vikas Malhotra (Pending KYC)  │
-- │ Collector  │ collector@ekabadi.demo      │ collector123 │ Ramesh Kumar (Tata Ace Tempo) │
-- │ Collector 2│ suresh.y@email.com          │ password123  │ Suresh Yadav (Pickup Truck)   │
-- │ Collector 3│ manoj.scrap@email.com       │ password123  │ Manoj Tiwari (Pending Review) │
-- └────────────┴─────────────────────────────┴──────────────┴───────────────────────────────┘
--
-- HOW TO RUN:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Paste this entire file and click "Run" (Ctrl+Enter)
-- 3. All tables, accounts, relationships, and stats will be seeded instantly!
-- =========================================================

-- Ensure required extensions and search path
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
EXCEPTION
    WHEN OTHERS THEN
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
END $$;

SET search_path TO public, extensions, auth;

-- ─────────────────────────────────────────────────────────
-- 1. CLEANUP PREVIOUS SEED CONFLICTS (SAFE & IDEMPOTENT)
-- ─────────────────────────────────────────────────────────
-- If accounts with demo emails were previously created with different UUIDs,
-- rename their emails so unique constraints are never violated.
UPDATE auth.users 
SET email = email || '.old.' || SUBSTRING(id::text, 1, 8)
WHERE email IN (
    'admin@ekabadi.demo',
    'citizen@ekabadi.demo',
    'priya.verma@email.com',
    'vikas.applicant@email.com',
    'collector@ekabadi.demo',
    'suresh.y@email.com',
    'manoj.scrap@email.com'
) AND id NOT IN (
    'a0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000003'
);

-- ─────────────────────────────────────────────────────────
-- 2. AUTH USERS (DEMO CREDENTIALS WITH BCRYPT PASSWORDS)
-- ─────────────────────────────────────────────────────────
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at
) VALUES
    -- ADMIN
    ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin@ekabadi.demo', crypt('admin123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"first_name":"Bhavya","last_name":"Bothera","role":"admin"}'::jsonb, FALSE, NOW(), NOW()),
    -- CITIZEN 1 (Aarav Sharma)
    ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'citizen@ekabadi.demo', crypt('citizen123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"first_name":"Aarav","last_name":"Sharma","role":"citizen"}'::jsonb, FALSE, NOW(), NOW()),
    -- CITIZEN 2 (Priya Verma)
    ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'priya.verma@email.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"first_name":"Priya","last_name":"Verma","role":"citizen"}'::jsonb, FALSE, NOW(), NOW()),
    -- CITIZEN 3 (Vikas Malhotra - Pending)
    ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'vikas.applicant@email.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"first_name":"Vikas","last_name":"Malhotra","role":"citizen"}'::jsonb, FALSE, NOW(), NOW()),
    -- COLLECTOR 1 (Ramesh Kumar)
    ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'collector@ekabadi.demo', crypt('collector123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"first_name":"Ramesh","last_name":"Kumar","role":"collector"}'::jsonb, FALSE, NOW(), NOW()),
    -- COLLECTOR 2 (Suresh Yadav)
    ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'suresh.y@email.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"first_name":"Suresh","last_name":"Yadav","role":"collector"}'::jsonb, FALSE, NOW(), NOW()),
    -- COLLECTOR 3 (Manoj Tiwari - Pending)
    ('00000000-0000-0000-0000-000000000000', 'd0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'manoj.scrap@email.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"first_name":"Manoj","last_name":"Tiwari","role":"collector"}'::jsonb, FALSE, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
    updated_at = NOW();

-- ─────────────────────────────────────────────────────────
-- 3. AUTH IDENTITIES (COMPATIBILITY WITH SUPABASE GOTRUE)
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'identities') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id') THEN
            INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
            VALUES
                ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@ekabadi.demo"}'::jsonb, 'email', 'admin@ekabadi.demo', NOW(), NOW(), NOW()),
                ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '{"sub":"c0000000-0000-0000-0000-000000000001","email":"citizen@ekabadi.demo"}'::jsonb, 'email', 'citizen@ekabadi.demo', NOW(), NOW(), NOW()),
                ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '{"sub":"c0000000-0000-0000-0000-000000000002","email":"priya.verma@email.com"}'::jsonb, 'email', 'priya.verma@email.com', NOW(), NOW(), NOW()),
                ('c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', '{"sub":"c0000000-0000-0000-0000-000000000003","email":"vikas.applicant@email.com"}'::jsonb, 'email', 'vikas.applicant@email.com', NOW(), NOW(), NOW()),
                ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '{"sub":"d0000000-0000-0000-0000-000000000001","email":"collector@ekabadi.demo"}'::jsonb, 'email', 'collector@ekabadi.demo', NOW(), NOW(), NOW()),
                ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', '{"sub":"d0000000-0000-0000-0000-000000000002","email":"suresh.y@email.com"}'::jsonb, 'email', 'suresh.y@email.com', NOW(), NOW(), NOW()),
                ('d0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', '{"sub":"d0000000-0000-0000-0000-000000000003","email":"manoj.scrap@email.com"}'::jsonb, 'email', 'manoj.scrap@email.com', NOW(), NOW(), NOW())
            ON CONFLICT DO NOTHING;
        ELSE
            INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
            VALUES
                ('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@ekabadi.demo"}'::jsonb, 'email', NOW(), NOW(), NOW()),
                ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '{"sub":"c0000000-0000-0000-0000-000000000001","email":"citizen@ekabadi.demo"}'::jsonb, 'email', NOW(), NOW(), NOW()),
                ('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '{"sub":"c0000000-0000-0000-0000-000000000002","email":"priya.verma@email.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
                ('c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', '{"sub":"c0000000-0000-0000-0000-000000000003","email":"vikas.applicant@email.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
                ('d0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '{"sub":"d0000000-0000-0000-0000-000000000001","email":"collector@ekabadi.demo"}'::jsonb, 'email', NOW(), NOW(), NOW()),
                ('d0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', '{"sub":"d0000000-0000-0000-0000-000000000002","email":"suresh.y@email.com"}'::jsonb, 'email', NOW(), NOW(), NOW()),
                ('d0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', '{"sub":"d0000000-0000-0000-0000-000000000003","email":"manoj.scrap@email.com"}'::jsonb, 'email', NOW(), NOW(), NOW())
            ON CONFLICT DO NOTHING;
    END IF;

    -- Ensure confirmed_at is populated if present in this Supabase schema version
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'confirmed_at') THEN
        UPDATE auth.users 
        SET confirmed_at = COALESCE(confirmed_at, email_confirmed_at, NOW())
        WHERE id IN (
            'a0000000-0000-0000-0000-000000000001',
            'c0000000-0000-0000-0000-000000000001',
            'c0000000-0000-0000-0000-000000000002',
            'c0000000-0000-0000-0000-000000000003',
            'd0000000-0000-0000-0000-000000000001',
            'd0000000-0000-0000-0000-000000000002',
            'd0000000-0000-0000-0000-000000000003'
        );
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────
-- 4. APPLICATION PROFILES
-- ─────────────────────────────────────────────────────────
INSERT INTO profiles (
    id, role, first_name, last_name, email, phone, avatar,
    status, application_status, phone_verified, email_verified, masked_aadhaar, created_at
) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin', 'Bhavya', 'Bothera', 'admin@ekabadi.demo', '+91 99999 00000', 'BB', 'active', 'approved', TRUE, TRUE, '', '2025-10-01T08:00:00Z'),
    ('c0000000-0000-0000-0000-000000000001', 'citizen', 'Aarav', 'Sharma', 'citizen@ekabadi.demo', '+91 98765 43210', 'AS', 'active', 'approved', TRUE, TRUE, 'XXXX-XXXX-4821', '2026-01-14T10:30:00Z'),
    ('c0000000-0000-0000-0000-000000000002', 'citizen', 'Priya', 'Verma', 'priya.verma@email.com', '+91 98111 22445', 'PV', 'active', 'approved', TRUE, TRUE, 'XXXX-XXXX-6632', '2026-02-03T11:20:00Z'),
    ('c0000000-0000-0000-0000-000000000003', 'citizen', 'Vikas', 'Malhotra', 'vikas.applicant@email.com', '+91 98199 44321', 'VM', 'pending_approval', 'pending_approval', TRUE, TRUE, 'XXXX-XXXX-9901', '2026-09-21T15:20:00Z'),
    ('d0000000-0000-0000-0000-000000000001', 'collector', 'Ramesh', 'Kumar', 'collector@ekabadi.demo', '+91 98765 11223', 'RK', 'active', 'approved', TRUE, TRUE, 'XXXX-XXXX-8912', '2025-12-11T09:15:00Z'),
    ('d0000000-0000-0000-0000-000000000002', 'collector', 'Suresh', 'Yadav', 'suresh.y@email.com', '+91 98100 88776', 'SY', 'active', 'approved', TRUE, TRUE, 'XXXX-XXXX-3341', '2026-01-06T14:45:00Z'),
    ('d0000000-0000-0000-0000-000000000003', 'collector', 'Manoj', 'Tiwari', 'manoj.scrap@email.com', '+91 98222 77112', 'MT', 'pending_approval', 'pending_approval', TRUE, TRUE, 'XXXX-XXXX-1288', '2026-09-22T09:40:00Z')
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    status = EXCLUDED.status,
    application_status = EXCLUDED.application_status,
    updated_at = NOW();

-- ─────────────────────────────────────────────────────────
-- 5. CITIZENS
-- ─────────────────────────────────────────────────────────
INSERT INTO citizens (
    id, user_id, name, phone, email, avatar, addresses, location,
    kyc_status, payout_method, upi_id, eco_coins, total_earnings,
    total_pickups, completed_pickups, total_waste_sold, rating, joined_date, status
) VALUES
    ('CIT-1001', 'c0000000-0000-0000-0000-000000000001', 'Aarav Sharma', '+91 98765 43210', 'citizen@ekabadi.demo', 'AS',
     '[{"id":"ADDR-1","label":"Home","address":"Flat B-402, Green Valley Apartments, Sector 62","city":"Noida","state":"Uttar Pradesh","pincode":"201309","isDefault":true},{"id":"ADDR-2","label":"Office","address":"Tower 3, Logix Cyber Park, Sector 62","city":"Noida","state":"Uttar Pradesh","pincode":"201309","isDefault":false}]'::jsonb,
     '{"address":"Sector 62, Noida","city":"Noida","state":"Uttar Pradesh","pincode":"201309","lat":28.6208,"lng":77.3639}'::jsonb,
     'verified', 'UPI', 'aarav.sharma@okhdfcbank', 860, 3240.00, 18, 16, 42.60, 4.80, '2026-01-14', 'active'),
    ('CIT-1002', 'c0000000-0000-0000-0000-000000000002', 'Priya Verma', '+91 98111 22445', 'priya.verma@email.com', 'PV',
     '[{"id":"ADDR-3","label":"Residence","address":"House 24, Sector 18","city":"Noida","state":"Uttar Pradesh","pincode":"201301","isDefault":true}]'::jsonb,
     '{"address":"Sector 18, Noida","city":"Noida","state":"Uttar Pradesh","pincode":"201301","lat":28.5708,"lng":77.3219}'::jsonb,
     'verified', 'UPI', 'priya.verma@okaxis', 450, 1890.00, 8, 7, 28.30, 4.90, '2026-02-03', 'active'),
    ('CIT-1007', 'c0000000-0000-0000-0000-000000000003', 'Vikas Malhotra', '+91 98199 44321', 'vikas.applicant@email.com', 'VM',
     '[{"id":"ADDR-5","label":"Home","address":"A-12, Sector 15","city":"Noida","state":"Uttar Pradesh","pincode":"201301","isDefault":true}]'::jsonb,
     '{"address":"Sector 15, Noida","city":"Noida","state":"Uttar Pradesh","pincode":"201301","lat":28.5830,"lng":77.3120}'::jsonb,
     'pending', 'UPI', 'vikas.m@paytm', 0, 0.00, 0, 0, 0.00, 5.00, '2026-09-21', 'pending_approval')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    addresses = EXCLUDED.addresses,
    location = EXCLUDED.location,
    kyc_status = EXCLUDED.kyc_status,
    eco_coins = EXCLUDED.eco_coins,
    total_earnings = EXCLUDED.total_earnings,
    total_pickups = EXCLUDED.total_pickups,
    completed_pickups = EXCLUDED.completed_pickups,
    total_waste_sold = EXCLUDED.total_waste_sold,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Citizen saved locations (Phase 4E schema)
INSERT INTO public.citizen_saved_locations (id, citizen_id, label, address_line, locality, city, state, postal_code, latitude, longitude, is_default) VALUES
    ('LOC-01', 'CIT-1001', 'Home', 'Flat B-402, Green Valley Apartments, Sector 62', 'Sector 62', 'Noida', 'Uttar Pradesh', '201309', 28.620800, 77.363900, TRUE),
    ('LOC-02', 'CIT-1001', 'Office', 'Tower 3, Logix Cyber Park, Sector 62', 'Sector 62', 'Noida', 'Uttar Pradesh', '201309', 28.627200, 77.371500, FALSE),
    ('LOC-03', 'CIT-1002', 'Residence', 'House 24, Sector 18', 'Sector 18', 'Noida', 'Uttar Pradesh', '201301', 28.570800, 77.321900, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 6. COLLECTORS
-- ─────────────────────────────────────────────────────────
INSERT INTO collectors (
    id, user_id, name, phone, email, avatar, business_name, vehicle_type, vehicle_number,
    service_radius, service_radius_km, service_area, service_area_locality,
    approx_latitude, approx_longitude, location, distance, accepted_materials, scrap_categories,
    rating, total_pickups, completed_pickups, pending_pickups, queue_length, response_time,
    total_waste_collected, total_earnings, eco_coins, is_online, verification_status,
    scale_status, scale_id, masked_bank, status, joined_date
) VALUES
    ('COL-2001', 'd0000000-0000-0000-0000-000000000001', 'Ramesh Kumar', '+91 98765 11223', 'collector@ekabadi.demo', 'RK',
     'Ramesh Recycling Services', 'Three-Wheeler Tempo', 'UP 16 AB 1234',
     8, 8.0, 'Sector 15-65, Noida', 'Sector 62, Noida',
     28.621500, 77.364500,
     '{"address":"Sector 62, Noida","city":"Noida","state":"Uttar Pradesh","pincode":"201309","lat":28.6215,"lng":77.3645}'::jsonb,
     1.2, '["Paper","Plastic","Metal","E-waste","Cardboard"]'::jsonb, '["Paper","Plastic","Metal","E-waste","Cardboard"]'::jsonb,
     4.80, 342, 341, 1, 1, '~15 min',
     1842.70, 128500.00, 2400, TRUE, 'verified',
     'certified', 'EKB-402', 'State Bank of India (A/C: XXXXXX4412)', 'active', '2025-12-11'),
    ('COL-2002', 'd0000000-0000-0000-0000-000000000002', 'Suresh Yadav', '+91 98100 88776', 'suresh.y@email.com', 'SY',
     'Green Waste Solutions', 'Pickup Truck', 'UP 16 T 8891',
     6, 6.0, 'Sector 1-30, Noida', 'Sector 18, Noida',
     28.571200, 77.322400,
     '{"address":"Sector 18, Noida","city":"Noida","state":"Uttar Pradesh","pincode":"201301","lat":28.5712,"lng":77.3224}'::jsonb,
     2.5, '["Metal","Cardboard","Glass","Plastic"]'::jsonb, '["Metal","Cardboard","Glass","Plastic"]'::jsonb,
     4.60, 218, 218, 0, 0, '~20 min',
     1264.30, 84200.00, 1800, TRUE, 'verified',
     'certified', 'EKB-108', 'Punjab National Bank (A/C: XXXXXX9931)', 'active', '2026-01-06'),
    ('COL-2007', 'd0000000-0000-0000-0000-000000000003', 'Manoj Tiwari', '+91 98222 77112', 'manoj.scrap@email.com', 'MT',
     'Tiwari Eco Haulers', 'Tata Ace Gold', 'UP 16 CZ 4509',
     10, 10.0, 'Sector 70-120, Noida', 'Sector 76, Noida',
     28.583000, 77.378000,
     '{"address":"Sector 76, Noida","city":"Noida","state":"Uttar Pradesh","pincode":"201307","lat":28.5830,"lng":77.3780}'::jsonb,
     4.2, '["Paper","Metal","Cardboard","E-waste"]'::jsonb, '["Paper","Metal","Cardboard","E-waste"]'::jsonb,
     5.00, 0, 0, 0, 0, '~25 min',
     0.00, 0.00, 0, FALSE, 'pending',
     'uncertified', 'EKB-911', 'HDFC Bank (A/C: XXXXXX8102)', 'pending_approval', '2026-09-22')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    business_name = EXCLUDED.business_name,
    vehicle_type = EXCLUDED.vehicle_type,
    vehicle_number = EXCLUDED.vehicle_number,
    service_radius = EXCLUDED.service_radius,
    service_radius_km = EXCLUDED.service_radius_km,
    approx_latitude = EXCLUDED.approx_latitude,
    approx_longitude = EXCLUDED.approx_longitude,
    location = EXCLUDED.location,
    is_online = EXCLUDED.is_online,
    verification_status = EXCLUDED.verification_status,
    scale_status = EXCLUDED.scale_status,
    status = EXCLUDED.status,
    updated_at = NOW();

-- ─────────────────────────────────────────────────────────
-- 7. SCRAP CATEGORIES & PRICING
-- ─────────────────────────────────────────────────────────
INSERT INTO scrap_categories (id, category, name, code, icon, rate_per_kg, unit, description, recyclability, co2_saved_per_kg) VALUES
    ('SCRAP-01', 'Paper', 'Newspaper & Notebooks', 'PPR-NEWS', '📄', 14.0, 'kg', 'Old newspapers, magazines, notebooks, and office printing papers.', '100% Recyclable', 2.1),
    ('SCRAP-02', 'Cardboard', 'Corrugated Cardboard (Patti)', 'PPR-CART', '📦', 11.5, 'kg', 'Clean dry cardboard packaging, cartons, brown shipping boxes.', '100% Recyclable', 1.8),
    ('SCRAP-03', 'Plastic', 'PET Bottles & Rigid Plastics', 'PLS-PET', '♻️', 18.0, 'kg', 'Beverage bottles, milk pouches, plastic tubs, shampoo bottles.', 'Grade 1 & 2 Polyethylene', 2.8),
    ('SCRAP-04', 'Metal', 'Iron & Heavy Steel Scrap', 'MTL-IRON', '🔩', 32.0, 'kg', 'Pipes, rods, utensils, broken furniture frames, sheet metal.', 'Indefinitely Recyclable', 4.2),
    ('SCRAP-05', 'Metal', 'Aluminium & Beverage Cans', 'MTL-ALUM', '🥫', 145.0, 'kg', 'Drink cans, aluminium foils, cookware, frames.', '95% Energy Saving', 9.1),
    ('SCRAP-06', 'Metal', 'Brass / Pital Scrap', 'MTL-BRSS', '🟨', 380.0, 'kg', 'Pooja utensils, taps, locks, brass valves, decorative hardware.', 'High Value Alloy', 5.5),
    ('SCRAP-07', 'E-waste', 'Electronic Waste & Peripherals', 'EWS-PERI', '💻', 45.0, 'kg', 'Keyboards, chargers, cables, circuit boards, old adapters, CPU parts.', 'Certified Formal Recycler', 6.8),
    ('SCRAP-08', 'Glass', 'Glass Bottles & Jars', 'GLS-BOTT', '🫙', 4.5, 'kg', 'Beer bottles, pickle jars, beverage glass (unbroken).', '100% Recyclable', 0.9)
ON CONFLICT (id) DO UPDATE SET
    rate_per_kg = EXCLUDED.rate_per_kg,
    description = EXCLUDED.description,
    co2_saved_per_kg = EXCLUDED.co2_saved_per_kg,
    updated_at = NOW();

-- ─────────────────────────────────────────────────────────
-- 8. REWARD CATALOG
-- ─────────────────────────────────────────────────────────
INSERT INTO reward_catalog (id, name, description, cost, icon, category) VALUES
    ('RWD-001', 'Plant a Sapling in Noida City', 'Verified tree planted via Swachh Noida initiative', 100, '🌳', 'environment'),
    ('RWD-002', '₹50 Direct UPI Cashback', 'Direct credit to your linked UPI address', 200, '💰', 'cashback'),
    ('RWD-003', 'Eco Champion Bronze Badge', 'Digital verifiable green certificate', 500, '🥉', 'badge'),
    ('RWD-004', '₹100 Direct UPI Cashback', 'Instant transfer to your linked bank UPI', 400, '💰', 'cashback'),
    ('RWD-005', 'Eco Champion Silver Badge', 'Top 5% sustainable household recognition', 1000, '🥈', 'badge'),
    ('RWD-006', 'Eco Champion Gold Badge', 'Verified net-zero consumer recycler certification', 2500, '🥇', 'badge'),
    ('RWD-007', 'Donate ₹75 to Swachh Bharat Mission', 'Support local sanitation workers welfare fund', 150, '🇮🇳', 'donation')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 9. OPERATIONAL PICKUPS (FULL LIFECYCLE FOR DEMO)
-- ─────────────────────────────────────────────────────────
INSERT INTO pickups (
    id, citizen_id, collector_id, citizen_name, collector_name, address,
    scheduled_date, scheduled_time, date, time_slot, scrap_type, items,
    estimated_weight, estimated_value, final_weight, final_value, status,
    payment_status, payment_method, eco_coins_awarded, notes,
    created_at, accepted_at, enroute_at, arrived_at, completed_at, paid_at,
    pickup_latitude, pickup_longitude, pickup_locality, pickup_address_snapshot
) VALUES
    -- 1. Completed & Settled Pickup (Aarav + Ramesh)
    ('PK-9481', 'CIT-1001', 'COL-2001', 'Aarav Sharma', 'Ramesh Kumar',
     'Flat B-402, Green Valley Apartments, Sector 62, Noida',
     '2026-09-17', '18:00 - 20:00', '2026-09-17', '18:00 - 20:00',
     'Paper & Cardboard',
     '[{"category":"Paper","type":"Old Newspaper & Books","estimatedWeight":15.0,"verifiedWeight":15.0,"rate":14.0},{"category":"Cardboard","type":"Corrugated Cardboard (Patti)","estimatedWeight":10.5,"verifiedWeight":10.5,"rate":11.5}]'::jsonb,
     25.5, 330.75, 25.5, 330.75, 'completed',
     'paid', 'UPI', 51, 'Please call upon arrival at society main gate',
     '2026-09-17T14:22:00Z', '2026-09-17T14:35:00Z', '2026-09-17T18:15:00Z', '2026-09-17T18:30:00Z', '2026-09-17T18:47:00Z', '2026-09-17T18:48:00Z',
     28.620800, 77.363900, 'Sector 62, Noida', 'Flat B-402, Green Valley Apartments, Sector 62, Noida'),

    -- 2. Completed & Settled Pickup (Priya + Suresh)
    ('PK-9482', 'CIT-1002', 'COL-2002', 'Priya Verma', 'Suresh Yadav',
     'House 24, Sector 18, Noida',
     '2026-09-22', '14:00 - 16:00', '2026-09-22', '14:00 - 16:00',
     'Plastic & Metal',
     '[{"category":"Plastic","type":"PET Bottles & Containers","estimatedWeight":8.0,"verifiedWeight":8.2,"rate":18.0},{"category":"Metal","type":"Mixed Aluminium Scrap","estimatedWeight":2.0,"verifiedWeight":2.1,"rate":145.0}]'::jsonb,
     10.0, 434.0, 10.3, 452.1, 'completed',
     'paid', 'UPI', 21, 'Scrap is organized in boxes in front porch',
     '2026-09-22T10:15:00Z', '2026-09-22T10:25:00Z', '2026-09-22T14:10:00Z', '2026-09-22T14:30:00Z', '2026-09-22T14:50:00Z', '2026-09-22T14:52:00Z',
     28.570800, 77.321900, 'Sector 18, Noida', 'House 24, Sector 18, Noida'),

    -- 3. ACTIVE LIVE PICKUP: On The Way! (Aarav + Ramesh) — Demonstrates Phase 5 Live Tracking
    ('PK-9483', 'CIT-1001', 'COL-2001', 'Aarav Sharma', 'Ramesh Kumar',
     'Flat B-402, Green Valley Apartments, Sector 62, Noida',
     TO_CHAR(NOW(), 'YYYY-MM-DD'), '11:30 AM - 01:30 PM', TO_CHAR(NOW(), 'YYYY-MM-DD'), '11:30 AM - 01:30 PM',
     'Paper & E-waste',
     '[{"category":"Paper","type":"Textbooks & Office Paper","estimatedWeight":12.0,"verifiedWeight":null,"rate":14.0},{"category":"E-waste","type":"Old Keyboards & Cables","estimatedWeight":2.0,"verifiedWeight":null,"rate":45.0}]'::jsonb,
     14.0, 258.0, null, null, 'on_the_way',
     'pending', 'UPI', 0, 'Ring bell twice, cartons near balcony entrance',
     NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '8 minutes', null, null, null,
     28.620800, 77.363900, 'Sector 62, Noida', 'Flat B-402, Green Valley Apartments, Sector 62, Noida'),

    -- 4. Requested Pickup (Aarav + Ramesh) — Pending collector review
    ('PKP-1001', 'CIT-1001', 'COL-2001', 'Aarav Sharma', 'Ramesh Kumar',
     'Flat B-402, Green Valley Apartments, Sector 62, Noida',
     TO_CHAR(NOW() + INTERVAL '1 day', 'YYYY-MM-DD'), '10:00 AM - 12:00 PM', TO_CHAR(NOW() + INTERVAL '1 day', 'YYYY-MM-DD'), '10:00 AM - 12:00 PM',
     'Paper',
     '[{"category":"Paper","type":"Newspaper & Notebooks","estimatedWeight":12.0,"rate":14.0}]'::jsonb,
     12.0, 168.0, null, null, 'requested',
     'pending', 'UPI', 0, 'Stacked beside main door',
     NOW() - INTERVAL '2 hours', null, null, null, null, null,
     28.620800, 77.363900, 'Sector 62, Noida', 'Flat B-402, Green Valley Apartments, Sector 62, Noida'),

    -- 5. Accepted Pickup (Priya + Suresh) — Scheduled for later
    ('PKP-1003', 'CIT-1002', 'COL-2002', 'Priya Verma', 'Suresh Yadav',
     'House 24, Sector 18, Noida',
     TO_CHAR(NOW() + INTERVAL '1 day', 'YYYY-MM-DD'), '04:00 PM - 06:00 PM', TO_CHAR(NOW() + INTERVAL '1 day', 'YYYY-MM-DD'), '04:00 PM - 06:00 PM',
     'E-waste',
     '[{"category":"E-waste","type":"Electronic Waste & Peripherals","estimatedWeight":5.0,"rate":45.0}]'::jsonb,
     5.0, 225.0, null, null, 'accepted',
     'pending', 'UPI', 0, 'Old computer monitor & printer',
     NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', null, null, null, null,
     28.570800, 77.321900, 'Sector 18, Noida', 'House 24, Sector 18, Noida')
ON CONFLICT (id) DO UPDATE SET
    citizen_name = EXCLUDED.citizen_name,
    collector_name = EXCLUDED.collector_name,
    address = EXCLUDED.address,
    status = EXCLUDED.status,
    final_weight = EXCLUDED.final_weight,
    final_value = EXCLUDED.final_value,
    payment_status = EXCLUDED.payment_status,
    eco_coins_awarded = EXCLUDED.eco_coins_awarded,
    updated_at = NOW();

-- ─────────────────────────────────────────────────────────
-- 10. REAL-TIME FLEET TRACKING & SESSIONS (PHASE 5)
-- ─────────────────────────────────────────────────────────
-- Collector live positions
INSERT INTO public.collector_live_locations (
    collector_id, pickup_id, latitude, longitude, heading, speed_kmh,
    accuracy_meters, source, status, freshness_status, is_simulated
) VALUES
    -- Ramesh Kumar is actively driving in Sector 62 Noida towards PK-9483
    ('COL-2001', 'PK-9483', 28.625500, 77.368200, 42.50, 24.50, 8.20, 'browser_gps', 'active', 'LIVE', FALSE),
    -- Suresh Yadav is available in Sector 18 Noida
    ('COL-2002', NULL, 28.571200, 77.322400, 180.00, 0.00, 12.00, 'browser_gps', 'active', 'LIVE', FALSE)
ON CONFLICT (collector_id) DO UPDATE SET
    pickup_id = EXCLUDED.pickup_id,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    heading = EXCLUDED.heading,
    speed_kmh = EXCLUDED.speed_kmh,
    freshness_status = EXCLUDED.freshness_status,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Active live tracking session for PK-9483 (Noida Sec 62)
INSERT INTO public.pickup_tracking_sessions (
    id, pickup_id, collector_id, citizen_id, status,
    location_freshness, route_freshness, eta_status,
    eta_seconds, distance_meters, route_geometry,
    is_near_destination, deviation_status, is_simulated,
    started_at, last_location_at
) VALUES (
    'TRK-PK-9483', 'PK-9483', 'COL-2001', 'CIT-1001', 'active',
    'LIVE', 'FRESH', 'AVAILABLE',
    420, 1850,
    '{"type":"LineString","coordinates":[[77.3682,28.6255],[77.3665,28.6235],[77.3639,28.6208]]}'::jsonb,
    FALSE, 'ON_ROUTE', FALSE,
    NOW() - INTERVAL '8 minutes', NOW()
)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    location_freshness = EXCLUDED.location_freshness,
    route_freshness = EXCLUDED.route_freshness,
    eta_status = EXCLUDED.eta_status,
    eta_seconds = EXCLUDED.eta_seconds,
    distance_meters = EXCLUDED.distance_meters,
    route_geometry = EXCLUDED.route_geometry,
    last_location_at = NOW(),
    updated_at = NOW();

-- Ephemeral breadcrumb history for live telemetry demonstration
INSERT INTO public.collector_location_history (
    collector_id, session_id, latitude, longitude, speed_kmh, heading, accuracy_meters, recorded_at
) VALUES
    ('COL-2001', 'TRK-PK-9483', 28.621500, 77.364500, 18.20, 35.00, 9.00, NOW() - INTERVAL '6 minutes'),
    ('COL-2001', 'TRK-PK-9483', 28.623800, 77.366200, 26.40, 40.00, 8.50, NOW() - INTERVAL '3 minutes'),
    ('COL-2001', 'TRK-PK-9483', 28.625500, 77.368200, 24.50, 42.50, 8.20, NOW());

-- ─────────────────────────────────────────────────────────
-- 11. PAYMENTS & FINANCIAL SETTLEMENTS (PHASE 4F)
-- ─────────────────────────────────────────────────────────
INSERT INTO payments (
    id, pickup_id, citizen_id, collector_id, citizen_name, collector_name,
    amount, method, status, transaction_id, provider, provider_order_id,
    provider_payment_id, currency, amount_paise, rate_per_kg_snapshot,
    final_weight_kg_snapshot, scrap_category_snapshot, verified_at, settled_at,
    created_at, completed_at
) VALUES
    ('TXN-9481', 'PK-9481', 'CIT-1001', 'COL-2001', 'Aarav Sharma', 'Ramesh Kumar',
     330.75, 'UPI', 'settled', 'UPI-9024-88412', 'razorpay', 'order_demo_9481',
     'pay_demo_9481', 'INR', 33075, 14.00,
     25.50, 'Paper & Cardboard', '2026-09-17T18:48:00Z', '2026-09-17T18:48:00Z',
     '2026-09-17T18:47:00Z', '2026-09-17T18:48:00Z'),
    ('TXN-9482', 'PK-9482', 'CIT-1002', 'COL-2002', 'Priya Verma', 'Suresh Yadav',
     452.10, 'UPI', 'settled', 'UPI-9025-99211', 'razorpay', 'order_demo_9482',
     'pay_demo_9482', 'INR', 45210, 18.00,
     10.30, 'Plastic & Metal', '2026-09-22T14:52:00Z', '2026-09-22T14:52:00Z',
     '2026-09-22T14:50:00Z', '2026-09-22T14:52:00Z')
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    amount = EXCLUDED.amount,
    settled_at = EXCLUDED.settled_at;

-- Double-Entry Financial Ledger (Immutable Journal)
INSERT INTO financial_ledger (
    id, pickup_id, payment_id, entry_type, account_type, account_id,
    amount, amount_paise, currency, direction, description, created_at
) VALUES
    ('LDG-001-A', 'PK-9481', 'TXN-9481', 'payout', 'citizen', 'CIT-1001', 330.75, 33075, 'INR', 'credit', 'Instant UPI payout for 25.5kg Paper & Cardboard', '2026-09-17T18:48:00Z'),
    ('LDG-001-B', 'PK-9481', 'TXN-9481', 'payout', 'escrow', 'ESCROW-MAIN', 330.75, 33075, 'INR', 'debit', 'Escrow release to citizen UPI', '2026-09-17T18:48:00Z'),
    ('LDG-001-C', 'PK-9481', 'TXN-9481', 'platform_fee', 'platform', 'PLATFORM-REVENUE', 16.50, 1650, 'INR', 'credit', 'Platform convenience fee (5%)', '2026-09-17T18:48:00Z'),

    ('LDG-002-A', 'PK-9482', 'TXN-9482', 'payout', 'citizen', 'CIT-1002', 452.10, 45210, 'INR', 'credit', 'Instant UPI payout for 10.3kg Plastic & Metal', '2026-09-22T14:52:00Z'),
    ('LDG-002-B', 'PK-9482', 'TXN-9482', 'payout', 'escrow', 'ESCROW-MAIN', 452.10, 45210, 'INR', 'debit', 'Escrow release to citizen UPI', '2026-09-22T14:52:00Z'),
    ('LDG-002-C', 'PK-9482', 'TXN-9482', 'platform_fee', 'platform', 'PLATFORM-REVENUE', 22.60, 2260, 'INR', 'credit', 'Platform convenience fee (5%)', '2026-09-22T14:52:00Z')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 12. REWARD TRANSACTIONS (ECO COINS)
-- ─────────────────────────────────────────────────────────
INSERT INTO reward_transactions (id, user_id, type, points, pickup_id, description, created_at) VALUES
    ('RWD-TXN-101', 'c0000000-0000-0000-0000-000000000001', 'earned_pickup', 51, 'PK-9481', 'Eco Coins earned from Pickup PK-9481 (25.5 kg paper/cardboard recycled)', '2026-09-17T18:48:00Z'),
    ('RWD-TXN-102', 'c0000000-0000-0000-0000-000000000002', 'earned_pickup', 21, 'PK-9482', 'Eco Coins earned from Pickup PK-9482 (10.3 kg plastic/metal recycled)', '2026-09-22T14:52:00Z')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 13. NOTIFICATIONS (FOR JUDGES TESTING PORTALS)
-- ─────────────────────────────────────────────────────────
INSERT INTO notifications (
    id, user_id, role, type, title, message, read,
    event_type, entity_type, entity_id, priority, channel, status, created_at
) VALUES
    -- Admin alerts
    ('NOTIF-ADM-01', 'a0000000-0000-0000-0000-000000000001', 'admin', 'system',
     'New Collector Application', 'Manoj Tiwari (Tiwari Eco Haulers) submitted onboarding KYC for Sector 76 Noida.', FALSE,
     'APPLICATION_SUBMITTED', 'collector', 'COL-2007', 'high', 'in_app', 'unread', NOW() - INTERVAL '2 hours'),
    ('NOTIF-ADM-02', 'a0000000-0000-0000-0000-000000000001', 'admin', 'payment',
     'Instant Settlement Processed', '₹452.10 payout verified and settled for Pickup PK-9482 (Priya Verma).', TRUE,
     'PAYMENT_SETTLED', 'payment', 'TXN-9482', 'normal', 'in_app', 'read', NOW() - INTERVAL '2 days'),

    -- Citizen alerts (Aarav)
    ('NOTIF-CIT-01', 'c0000000-0000-0000-0000-000000000001', 'citizen', 'pickup',
     'Collector is On The Way!', 'Ramesh Kumar is driving to your pickup location. Current ETA: ~7 minutes.', FALSE,
     'COLLECTOR_EN_ROUTE', 'pickup', 'PK-9483', 'high', 'in_app', 'unread', NOW() - INTERVAL '8 minutes'),
    ('NOTIF-CIT-02', 'c0000000-0000-0000-0000-000000000001', 'citizen', 'payment',
     '₹330.75 Received via UPI', 'Your payment for Pickup PK-9481 has been deposited into your bank account.', TRUE,
     'PAYMENT_RECEIVED', 'payment', 'TXN-9481', 'normal', 'in_app', 'read', '2026-09-17T18:48:30Z'),

    -- Collector alerts (Ramesh)
    ('NOTIF-COL-01', 'd0000000-0000-0000-0000-000000000001', 'collector', 'pickup',
     'Active Navigation Active', 'Route navigation engaged for Aarav Sharma (Green Valley Apartments, Sec 62).', FALSE,
     'NAVIGATION_ENGAGED', 'pickup', 'PK-9483', 'high', 'in_app', 'unread', NOW() - INTERVAL '8 minutes'),
    ('NOTIF-COL-02', 'd0000000-0000-0000-0000-000000000001', 'collector', 'pickup',
     'New Pickup Scheduled', 'Aarav Sharma requested a paper pickup for tomorrow (10:00 AM).', FALSE,
     'PICKUP_REQUESTED', 'pickup', 'PKP-1001', 'normal', 'in_app', 'unread', NOW() - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 14. SUPPORT ISSUES & AUDIT LOGS
-- ─────────────────────────────────────────────────────────
INSERT INTO issues (
    id, user_id, citizen_id, pickup_id, role, category, type,
    title, description, priority, status, assigned_to, resolution, created_at
) VALUES
    ('ISS-301', 'c0000000-0000-0000-0000-000000000001', 'CIT-1001', 'PK-9481', 'citizen', 'scale', 'scale_accuracy',
     'Inquiry on certified scale calibration', 'Wanted to understand if digital scale certificate is accessible in app.', 'low', 'resolved', 'Customer Support',
     'Provided digital calibration certificate EKB-402 directly in pickup receipt view.', '2026-09-18T10:00:00Z'),
    ('ISS-302', 'c0000000-0000-0000-0000-000000000002', 'CIT-1002', '', 'citizen', 'pricing', 'scrap_rate_query',
     'Request to add specialized computer motherboard e-waste category', 'Inquired if older server motherboards carry higher scrap rate per kg.', 'medium', 'under_review', 'Operations Lead',
     '', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Admin Approval Audit Trail
INSERT INTO approval_audit_trail (
    id, entity_type, entity_id, reviewer_name, reviewer_admin_id, action,
    previous_status, new_status, reason, created_at
) VALUES
    ('AUD-01', 'collector', 'COL-2001', 'Bhavya Bothera', 'a0000000-0000-0000-0000-000000000001', 'APPROVE',
     'pending_approval', 'approved', 'Commercial vehicle registration UP 16 AB 1234 & Certified Scale EKB-402 verified.', '2025-12-11T10:00:00Z'),
    ('AUD-02', 'collector', 'COL-2002', 'Bhavya Bothera', 'a0000000-0000-0000-0000-000000000001', 'APPROVE',
     'pending_approval', 'approved', 'Commercial vehicle registration UP 16 T 8891 & Certified Scale EKB-108 verified.', '2026-01-06T15:30:00Z'),
    ('AUD-03', 'citizen', 'CIT-1001', 'Bhavya Bothera', 'a0000000-0000-0000-0000-000000000001', 'APPROVE',
     'pending_approval', 'approved', 'Aadhaar identity and residence in Sector 62 Noida verified.', '2026-01-14T11:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- KYC Documents
INSERT INTO kyc_documents (
    id, user_id, document_type, document_status, storage_path, submitted_at, reviewed_at, reviewed_by
) VALUES
    ('00000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'vehicle_rc', 'approved', 'kyc/rc_ramesh.pdf', '2025-12-11T09:15:00Z', '2025-12-11T10:00:00Z', 'a0000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'aadhaar', 'approved', 'kyc/aadhaar_ramesh.pdf', '2025-12-11T09:15:00Z', '2025-12-11T10:00:00Z', 'a0000000-0000-0000-0000-000000000001'),
    ('00000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'vehicle_rc', 'pending', 'kyc/rc_manoj.pdf', '2026-09-22T09:40:00Z', NULL, NULL),
    ('00000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'aadhaar', 'pending', 'kyc/aadhaar_vikas.pdf', '2026-09-21T15:20:00Z', NULL, NULL)
ON CONFLICT (id) DO NOTHING;
