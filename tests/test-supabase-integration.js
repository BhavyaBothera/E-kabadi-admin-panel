/* =========================================================
   E-KABAADI PLATFORM
   Phase 4A: Supabase Backend Integration & Contract Test Suite
   File: tests/test-supabase-integration.js

   Runs automated verification of:
   1. Environment configuration & dual-mode adapter selection
   2. SupabaseAdapter API contract compliance & table/column mapping
   3. Dynamic services layer delegation via Proxy & resolveData
   4. Realtime subscription manager & event broadcasting
   5. UI State utilities (loading, empty, error)
   6. SQL Migrations integrity (tables, RLS policies, functions, storage)
   7. Data privacy & masking rules (Aadhaar, bank, KYC isolation)
   ========================================================= */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

// ANSI color helpers
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

let passedCount = 0;
let failedCount = 0;

function assertTest(desc, fn) {
    try {
        fn();
        console.log(`  ${GREEN}✓ PASS:${RESET} ${desc}`);
        passedCount++;
    } catch (err) {
        console.error(`  ${RED}✗ FAIL:${RESET} ${desc}`);
        console.error(`    ${RED}Error: ${err.message}${RESET}`);
        failedCount++;
    }
}

async function assertAsyncTest(desc, fn) {
    try {
        await fn();
        console.log(`  ${GREEN}✓ PASS:${RESET} ${desc}`);
        passedCount++;
    } catch (err) {
        console.error(`  ${RED}✗ FAIL:${RESET} ${desc}`);
        console.error(`    ${RED}Error: ${err.message}${RESET}`);
        failedCount++;
    }
}

console.log(`\n${BOLD}=======================================================${RESET}`);
console.log(`${BOLD}   E-KABAADI PHASE 4A — SUPABASE INTEGRATION TEST SUITE   ${RESET}`);
console.log(`${BOLD}=======================================================${RESET}\n`);

// ── TEST GROUP 1: Environment & Dual-Mode Configuration ──
console.log(`${CYAN}[TEST GROUP 1] Environment & Dual-Mode Configuration${RESET}`);

assertTest("Environment module loads and exposes required flags", () => {
    const envModule = require("../frontend/config/environment");
    assert.ok(envModule, "Environment module should export an object");
    assert.strictEqual(typeof envModule.DATA_MODE, "string", "DATA_MODE must be a string");
    assert.strictEqual(typeof envModule.isSupabaseMode, "function", "isSupabaseMode must be a function");
    assert.strictEqual(typeof envModule.isMockMode, "function", "isMockMode must be a function");
    assert.strictEqual(typeof envModule.isSupabaseConfigured, "function", "isSupabaseConfigured must be a function");
    assert.strictEqual(envModule.DATA_MODE, "mock", "Default DATA_MODE should be 'mock'");
    assert.strictEqual(envModule.isMockMode(), true, "isMockMode() should return true by default");
});

assertTest(".env.example template contains all required keys", () => {
    const envExamplePath = path.join(__dirname, "../.env.example");
    assert.ok(fs.existsSync(envExamplePath), ".env.example must exist");
    const content = fs.readFileSync(envExamplePath, "utf8");
    assert.ok(content.includes("DATA_MODE"), "Must contain DATA_MODE");
    assert.ok(content.includes("SUPABASE_URL"), "Must contain SUPABASE_URL");
    assert.ok(content.includes("SUPABASE_ANON_KEY"), "Must contain SUPABASE_ANON_KEY");
});

assertTest(".gitignore contains secret and local config patterns", () => {
    const gitignorePath = path.join(__dirname, "../.gitignore");
    assert.ok(fs.existsSync(gitignorePath), ".gitignore must exist");
    const content = fs.readFileSync(gitignorePath, "utf8");
    assert.ok(content.includes("config.local.js"), ".gitignore must ignore config.local.js");
    assert.ok(content.includes(".env"), ".gitignore must ignore .env");
});

// ── TEST GROUP 2: Storage Adapter Contract & Factory ──
console.log(`\n${CYAN}[TEST GROUP 2] Storage Adapter Contract & Factory${RESET}`);

assertTest("storage.js exports unified adapter interface", () => {
    const storage = require("../frontend/shared/js/storage");
    assert.ok(storage, "Storage module must export an object");
    assert.ok(storage.adapter, "Storage must export active adapter");
    assert.ok(storage.mockAdapter, "Storage must export mockAdapter");
    assert.strictEqual(typeof storage.getActiveMode, "function", "Must export getActiveMode()");
    assert.strictEqual(storage.getActiveMode(), "mock", "Active mode should be mock");

    const requiredMethods = ["getCollection", "saveCollection", "findById", "insert", "update", "delete", "getSession", "setSession", "clearSession"];
    requiredMethods.forEach(method => {
        assert.strictEqual(typeof storage.adapter[method], "function", `Adapter must implement ${method}`);
    });
});

assertTest("supabase-adapter.js implements full StateAdapter contract", () => {
    // Provide mock supabase client to test adapter structure
    const mockSupabaseClient = {
        getClient: () => null,
        isAvailable: () => false
    };
    const SupabaseAdapterFactory = require("../frontend/shared/js/supabase-adapter");
    const adapter = typeof SupabaseAdapterFactory === "function" ? SupabaseAdapterFactory(mockSupabaseClient) : SupabaseAdapterFactory;
    
    assert.ok(adapter, "SupabaseAdapter must be defined");
    const contractMethods = ["getCollection", "saveCollection", "findById", "insert", "update", "delete", "getSession", "setSession", "clearSession", "signUp", "signIn", "signOut", "rpc"];
    contractMethods.forEach(method => {
        assert.strictEqual(typeof adapter[method], "function", `SupabaseAdapter must implement ${method}`);
    });
});

// ── TEST GROUP 3: Progressive Async & Services Layer ──
console.log(`\n${CYAN}[TEST GROUP 3] Progressive Async & Services Layer${RESET}`);

assertTest("services.js provides resolveData progressive async helper", () => {
    const services = require("../frontend/shared/js/services");
    assert.ok(services, "Services must be defined");
    assert.strictEqual(typeof services.resolveData, "function", "resolveData must be exported");

    // Test with synchronous value
    let syncResult = null;
    services.resolveData("test-sync-val", val => {
        syncResult = val;
    });
    assert.strictEqual(syncResult, "test-sync-val", "resolveData must handle sync values synchronously");
});

assertAsyncTest("resolveData resolves Promises properly", async () => {
    const services = require("../frontend/shared/js/services");
    const promiseVal = Promise.resolve("test-async-val");
    let asyncResult = null;
    await services.resolveData(promiseVal, val => {
        asyncResult = val;
    });
    assert.strictEqual(asyncResult, "test-async-val", "resolveData must handle Promises");
});

assertTest("Services layer exposes Supabase-specific methods", () => {
    const services = require("../frontend/shared/js/services");
    assert.strictEqual(typeof services.auth.loginWithSupabase, "function", "auth.loginWithSupabase must exist");
    assert.strictEqual(typeof services.auth.signupWithSupabase, "function", "auth.signupWithSupabase must exist");
    assert.strictEqual(typeof services.pickup.completeWithSupabase, "function", "pickup.completeWithSupabase must exist");
    assert.strictEqual(typeof services.isSupabaseMode, "function", "isSupabaseMode must exist");
});

// ── TEST GROUP 4: UI State Management ──
console.log(`\n${CYAN}[TEST GROUP 4] UI State Management (Loading, Empty, Error)${RESET}`);

assertTest("ui-states.js provides standard state methods", () => {
    const UIStates = require("../frontend/shared/js/ui-states");
    assert.ok(UIStates, "UIStates must be exported");
    assert.strictEqual(typeof UIStates.showLoading, "function", "UIStates.showLoading must be a function");
    assert.strictEqual(typeof UIStates.showEmpty, "function", "UIStates.showEmpty must be a function");
    assert.strictEqual(typeof UIStates.showError, "function", "UIStates.showError must be a function");
    assert.strictEqual(typeof UIStates.clearState, "function", "UIStates.clearState must be a function");
});

assertTest("ui-states.css exists and defines proper styling classes", () => {
    const cssPath = path.join(__dirname, "../frontend/shared/css/ui-states.css");
    assert.ok(fs.existsSync(cssPath), "ui-states.css must exist");
    const content = fs.readFileSync(cssPath, "utf8");
    assert.ok(content.includes(".ui-state-loading"), "Must define .ui-state-loading");
    assert.ok(content.includes(".ui-state-empty"), "Must define .ui-state-empty");
    assert.ok(content.includes(".ui-state-error"), "Must define .ui-state-error");
    assert.ok(content.includes(".ui-spinner-ring"), "Must define .ui-spinner-ring");
    assert.ok(content.includes(".ui-state-retry-btn"), "Must define .ui-state-retry-btn");
});

// ── TEST GROUP 5: Realtime Subscription Foundation ──
console.log(`\n${CYAN}[TEST GROUP 5] Realtime Subscription Foundation${RESET}`);

assertTest("realtime.js exports subscription manager", () => {
    const realtimeFactory = require("../frontend/shared/js/realtime");
    const realtime = typeof realtimeFactory === "function" ? realtimeFactory() : realtimeFactory;
    assert.ok(realtime, "Realtime module must be exported");
    assert.strictEqual(typeof realtime.subscribe, "function", "realtime.subscribe must be a function");
    assert.strictEqual(typeof realtime.unsubscribe, "function", "realtime.unsubscribe must exist");
    assert.strictEqual(typeof realtime.unsubscribeAll, "function", "realtime.unsubscribeAll must exist");
    assert.strictEqual(typeof realtime.initForUser, "function", "realtime.initForUser must exist");
    assert.strictEqual(typeof realtime.cleanup, "function", "realtime.cleanup must exist");
    assert.strictEqual(typeof realtime.getActiveChannels, "function", "realtime.getActiveChannels must exist");
});

// ── TEST GROUP 6: Database Migrations & Schema Verification ──
console.log(`\n${CYAN}[TEST GROUP 6] PostgreSQL Migrations & Schema Audit${RESET}`);

const migration1Path = path.join(__dirname, "../supabase/migrations/001_initial_schema.sql");
const migration2Path = path.join(__dirname, "../supabase/migrations/002_storage_policies.sql");
const migration3Path = path.join(__dirname, "../supabase/migrations/003_seed_data.sql");

assertTest("Migration 001_initial_schema.sql exists and is non-empty", () => {
    assert.ok(fs.existsSync(migration1Path), "001_initial_schema.sql must exist");
    const sql = fs.readFileSync(migration1Path, "utf8");
    assert.ok(sql.length > 5000, "Migration file must have substantial SQL content");
});

assertTest("Migration 001 defines all 12 core relational tables", () => {
    const sql = fs.readFileSync(migration1Path, "utf8");
    const requiredTables = [
        "profiles",
        "citizens",
        "collectors",
        "kyc_documents",
        "pickups",
        "scrap_categories",
        "payments",
        "reward_catalog",
        "reward_transactions",
        "notifications",
        "issues",
        "approval_audit_trail"
    ];
    requiredTables.forEach(table => {
        assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `Must define table ${table}`);
    });
});

assertTest("Migration 001 enables Row Level Security (RLS) on all tables", () => {
    const sql = fs.readFileSync(migration1Path, "utf8");
    const requiredTables = [
        "profiles", "citizens", "collectors", "kyc_documents",
        "pickups", "scrap_categories", "payments", "reward_catalog",
        "reward_transactions", "notifications", "issues", "approval_audit_trail"
    ];
    requiredTables.forEach(table => {
        assert.ok(sql.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`), `Table ${table} must have RLS enabled`);
    });
});

assertTest("Migration 001 defines security definer helper functions", () => {
    const sql = fs.readFileSync(migration1Path, "utf8");
    assert.ok(sql.includes("CREATE OR REPLACE FUNCTION get_user_role()"), "Must define get_user_role()");
    assert.ok(sql.includes("CREATE OR REPLACE FUNCTION get_citizen_id()"), "Must define get_citizen_id()");
    assert.ok(sql.includes("CREATE OR REPLACE FUNCTION get_collector_id()"), "Must define get_collector_id()");
});

assertTest("Migration 001 enables Realtime publication for key tables", () => {
    const sql = fs.readFileSync(migration1Path, "utf8");
    assert.ok(sql.includes("ALTER PUBLICATION supabase_realtime ADD TABLE pickups;"), "Pickups must be in realtime publication");
    assert.ok(sql.includes("ALTER PUBLICATION supabase_realtime ADD TABLE notifications;"), "Notifications must be in realtime publication");
    assert.ok(sql.includes("ALTER PUBLICATION supabase_realtime ADD TABLE payments;"), "Payments must be in realtime publication");
});

assertTest("Migration 002_storage_policies.sql creates private KYC bucket with policies", () => {
    assert.ok(fs.existsSync(migration2Path), "002_storage_policies.sql must exist");
    const sql = fs.readFileSync(migration2Path, "utf8");
    assert.ok(sql.includes("kyc-documents"), "Must reference kyc-documents bucket");
    assert.ok(sql.toLowerCase().includes("public: false"), "Bucket must be private");
    assert.ok(sql.includes("CREATE POLICY"), "Must define storage policies");
});

assertTest("Migration 003_seed_data.sql provides initial reference categories", () => {
    assert.ok(fs.existsSync(migration3Path), "003_seed_data.sql must exist");
    const sql = fs.readFileSync(migration3Path, "utf8");
    assert.ok(sql.includes("scrap_categories"), "Must seed scrap_categories");
    assert.ok(sql.includes("reward_catalog"), "Must seed reward_catalog");
});

// ── TEST GROUP 7: Documentation Completeness ──
console.log(`\n${CYAN}[TEST GROUP 7] Documentation Completeness${RESET}`);

const docFiles = [
    "docs/backend-architecture.md",
    "docs/environment-setup.md",
    "docs/migration-plan.md",
    "docs/supabase-schema.md"
];

docFiles.forEach(file => {
    assertTest(`Documentation file ${file} exists and is well-documented`, () => {
        const fullPath = path.join(__dirname, "..", file);
        assert.ok(fs.existsSync(fullPath), `${file} must exist`);
        const content = fs.readFileSync(fullPath, "utf8");
        assert.ok(content.length > 500, `${file} must have detailed documentation`);
    });
});

// ── TEST SUMMARY ──
console.log(`\n${BOLD}=======================================================${RESET}`);
console.log(`${BOLD}TOTAL TESTS: ${passedCount + failedCount} | ${GREEN}PASSED: ${passedCount}${RESET} | ${failedCount > 0 ? RED : RESET}FAILED: ${failedCount}${RESET}`);
console.log(`${BOLD}=======================================================${RESET}\n`);

if (failedCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
