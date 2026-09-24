#!/usr/bin/env node
/**
 * E-KABAADI PLATFORM — Hackathon Demo Seed Helper
 * File: scripts/seed-supabase-demo-data.js
 *
 * This script provides a quick summary of the complete Hackathon demo dataset
 * available in `supabase/migrations/010_hackathon_demo_seed.sql`.
 *
 * Instructions for Hackathon Judges & Evaluators:
 * 1. Open your Supabase Dashboard: https://supabase.com/dashboard
 * 2. Select your project and navigate to "SQL Editor"
 * 3. Open or copy `supabase/migrations/010_hackathon_demo_seed.sql`
 * 4. Paste into the SQL Editor and click "Run" (Ctrl+Enter)
 * 5. All demo accounts, profiles, live tracking sessions, verified pickups,
 *    and financial ledgers will be active instantly!
 */

const fs = require('fs');
const path = require('path');

const SEED_FILE = path.resolve(__dirname, '../supabase/migrations/010_hackathon_demo_seed.sql');

console.log('===============================================================');
console.log('   E-KABAADI PLATFORM — HACKATHON DEMO DATASET SEED HELPER   ');
console.log('===============================================================\n');

if (fs.existsSync(SEED_FILE)) {
    const stats = fs.statSync(SEED_FILE);
    console.log(`[INFO] Found migration seed file:`);
    console.log(`       Path: ${SEED_FILE}`);
    console.log(`       Size: ${(stats.size / 1024).toFixed(1)} KB\n`);
} else {
    console.error(`[ERROR] Seed file not found at ${SEED_FILE}`);
    process.exit(1);
}

console.log('DEMO ACCOUNTS READY FOR EVALUATION:');
console.log('---------------------------------------------------------------------------------------------');
console.log('| Role        | Email                     | Password     | Demo Persona / Highlights        |');
console.log('---------------------------------------------------------------------------------------------');
console.log('| Admin       | admin@ekabadi.demo        | admin123     | Bhavya Bothera (Platform Ops)    |');
console.log('| Citizen 1   | citizen@ekabadi.demo      | citizen123   | Aarav Sharma (Sector 62, Noida)  |');
console.log('| Citizen 2   | priya.verma@email.com     | password123  | Priya Verma (Sector 18, Noida)   |');
console.log('| Citizen 3   | vikas.applicant@email.com | password123  | Vikas Malhotra (Pending KYC)     |');
console.log('| Collector 1 | collector@ekabadi.demo    | collector123 | Ramesh Kumar (Active Live Fleet) |');
console.log('| Collector 2 | suresh.y@email.com        | password123  | Suresh Yadav (Pickup Truck)      |');
console.log('| Collector 3 | manoj.scrap@email.com     | password123  | Manoj Tiwari (Pending Review)    |');
console.log('---------------------------------------------------------------------------------------------\n');

console.log('OPERATIONAL DEMO DATA INCLUDED:');
console.log('  * 7 Auth Users & Profiles with bcrypt passwords');
console.log('  * 3 Citizens with verified addresses and Eco Coin balances');
console.log('  * 3 Collectors with vehicle details, certified scales & service zones');
console.log('  * 5 Pickups covering the entire operational lifecycle:');
console.log('      - PK-9481 : Completed & settled (₹330.75, 25.5 kg paper/cardboard)');
console.log('      - PK-9482 : Completed & settled (₹452.10, 10.3 kg plastic/metal)');
console.log('      - PK-9483 : ACTIVE LIVE PICKUP en route (Phase 5 Live Fleet Tracking)');
console.log('      - PKP-1001: Requested pickup pending collector acceptance');
console.log('      - PKP-1003: Accepted scheduled pickup');
console.log('  * Phase 5 Live GPS Telemetry: Ramesh Kumar actively navigating in Sec 62 Noida');
console.log('  * Phase 4F Financial Ledger: Double-entry immutable accounting journal');
console.log('  * Phase 4G Notification Outbox & In-App Alerts for all roles');
console.log('  * Admin KYC Approval Audit Trail with verification histories\n');

console.log('EXECUTION STEPS IN SUPABASE:');
console.log('  1. Go to Supabase Dashboard -> SQL Editor');
console.log('  2. Copy and paste: supabase/migrations/010_hackathon_demo_seed.sql');
console.log('  3. Click "Run"');
console.log('  4. Log in to any portal (Admin, Citizen, or Collector) with the credentials above!');
console.log('===============================================================\n');
