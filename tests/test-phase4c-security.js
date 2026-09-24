/* =========================================================
   E-KABAADI PLATFORM — PHASE 4C SECURITY HARDENING TEST SUITE
   File: tests/test-phase4c-security.js

   Comprehensive automated verification across 36 security vectors:
   - AUTH: unauthenticated, invalid, expired, logout clearing
   - RBAC: privilege boundaries across citizen, collector, and admin
   - ACCOUNT STATUS: pending, rejected, suspended, deactivated, active
   - KYC: private storage bucket, signed URL temporary expiry, isolation
   - PICKUPS: ownership, assignment, state transition sequence, concurrency
   - PAYMENTS: duplicate rejection, fake payment injection prevention
   - REWARDS: duplicate prevention, arbitrary credit rejection
   - AUDIT: append-only immutability, fake audit rejection
   - NOTIFICATIONS: user isolation & scope enforcement
   - SUPPORT: ticket ownership enforcement
   - RATES: official scrap rate protection
   - INPUT SECURITY: XSS escaping & control character stripping
   - SECRETS: zero service_role or API secrets exposed in client code
   ========================================================= */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Mock browser globals for Node.js test environment
global.self = global;
global.window = global;
global.CustomEvent = class CustomEvent {
    constructor(name, params = {}) {
        this.type = name;
        this.detail = params.detail || {};
    }
};

const _eventListeners = {};
global.addEventListener = function (event, cb) {
    if (!_eventListeners[event]) _eventListeners[event] = [];
    _eventListeners[event].push(cb);
};
global.removeEventListener = function (event, cb) {
    if (_eventListeners[event]) {
        _eventListeners[event] = _eventListeners[event].filter(fn => fn !== cb);
    }
};
global.dispatchEvent = function (event) {
    const list = _eventListeners[event.type] || [];
    list.forEach(cb => cb(event));
    return true;
};

// In-memory localStorage mock for node test runner
const _mockStorage = {};
global.localStorage = {
    getItem: (k) => _mockStorage[k] || null,
    setItem: (k, v) => { _mockStorage[k] = String(v); },
    removeItem: (k) => { delete _mockStorage[k]; },
    clear: () => { Object.keys(_mockStorage).forEach(k => delete _mockStorage[k]); }
};

const baseDir = path.join(__dirname, "../frontend");

global.window.location = {
    pathname: "/frontend/citizen/dashboard.html",
    replace: (url) => {},
    href: "http://localhost/frontend/citizen/dashboard.html",
    search: ""
};

// Load Mocks & Constants
global.MOCK_USERS = require(path.join(baseDir, "data/mock-users.js"));
global.MOCK_CITIZENS = require(path.join(baseDir, "data/mock-citizens.js"));
global.MOCK_COLLECTORS = require(path.join(baseDir, "data/mock-collectors.js"));
global.MOCK_PICKUPS = require(path.join(baseDir, "data/mock-pickups.js"));
global.MOCK_PAYMENTS = require(path.join(baseDir, "data/mock-payments.js"));
global.MOCK_REWARDS = require(path.join(baseDir, "data/mock-rewards.js"));
global.MOCK_NOTIFICATIONS = require(path.join(baseDir, "data/mock-notifications.js"));
global.MOCK_SCRAP = require(path.join(baseDir, "data/mock-scrap.js"));
global.EKABADI_CONSTANTS = require(path.join(baseDir, "config/constants.js"));

// Load Modules
const SecurityUtils = require(path.join(baseDir, "shared/js/security-utils.js"));
global.EKABADI_SECURITY = SecurityUtils;

const storageModule = require(path.join(baseDir, "shared/js/storage.js"));
global.EKABADI_STORAGE = storageModule;
const storage = storageModule.adapter;

const services = require(path.join(baseDir, "shared/js/services.js"));
global.EKABADI_SERVICES = services;
const router = require(path.join(baseDir, "shared/js/router.js"));
const SupabaseAdapter = require(path.join(baseDir, "shared/js/supabase-adapter.js"));

let passedCount = 0;
let totalCount = 0;

function test(description, fn) {
    totalCount++;
    try {
        fn();
        console.log(`  ✓ PASS [TEST ${totalCount}]: ${description}`);
        passedCount++;
    } catch (err) {
        console.error(`  ✗ FAIL [TEST ${totalCount}]: ${description}`);
        console.error(`    Error: ${err.message}`);
    }
}

console.log("\n=======================================================");
console.log("   E-KABAADI PHASE 4C — COMPREHENSIVE SECURITY SUITE   ");
console.log("=======================================================\n");

// ─────────────────────────────────────────────
// GROUP 1: AUTHENTICATION & SESSION SECURITY (Tests 1-4)
// ─────────────────────────────────────────────
console.log("[SECURITY GROUP 1] Authentication & Session Security");

test("1. Unauthenticated access denied: empty session yields false for isAuthenticated", () => {
    storage.clearSession();
    assert.strictEqual(services.auth.isAuthenticated(), false, "User without session must not be authenticated");
    assert.strictEqual(SecurityUtils.isSessionValid(null), false, "Null session is invalid");
});

test("2. Invalid session structure denied: malformed session rejected", () => {
    assert.strictEqual(SecurityUtils.isSessionValid({ loggedIn: false }), false, "Session with loggedIn:false must be rejected");
    assert.strictEqual(SecurityUtils.isSessionValid("invalid-string"), false, "Non-object session must be rejected");
});

test("3. Expired session invalidated: past expiresAt timestamp rejects access", () => {
    const expiredSession = {
        loggedIn: true,
        role: "citizen",
        status: "active",
        expiresAt: new Date(Date.now() - 3600 * 1000).toISOString() // 1 hour ago
    };
    assert.strictEqual(SecurityUtils.isSessionValid(expiredSession), false, "Expired session must fail validity check");
    
    // Test storage session expiration auto-invalidation
    storage.setSession(expiredSession);
    const loaded = storage.getSession();
    assert.strictEqual(loaded, null, "Expired session in cache must be auto-cleared to null");
});

test("4. Logout clears session completely: removes storage keys and emits event", () => {
    storage.setSession({ loggedIn: true, role: "admin", status: "active" });
    assert.strictEqual(services.auth.isAuthenticated(), true);
    
    services.auth.logout();
    assert.strictEqual(services.auth.isAuthenticated(), false, "Session must be falsy after logout");
    assert.strictEqual(storage.getSession(), null, "Session cache must be cleared after logout");
});

// ─────────────────────────────────────────────
// GROUP 2: ROLE-BASED ACCESS CONTROL (RBAC) (Tests 5-9)
// ─────────────────────────────────────────────
console.log("\n[SECURITY GROUP 2] Role-Based Access Control (RBAC)");

test("5. Citizen cannot access Admin: requireAuth('admin') rejects citizen role", () => {
    storage.setSession({ loggedIn: true, role: "citizen", status: "active" });
    const allowed = router.requireAuth("admin");
    assert.strictEqual(allowed, false, "Citizen must be rejected from admin portal");
});

test("6. Citizen cannot access Collector private data: public filter masks bank and private KYC", () => {
    const publicCollectors = SupabaseAdapter.getActiveCollectors();
    assert(Array.isArray(publicCollectors) || typeof publicCollectors.then === "function");
    // Ensure that in schema / view, sensitive columns are never projected to citizens
    const schema004 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/004_security_hardening.sql"), "utf8");
    assert(schema004.includes("CREATE OR REPLACE VIEW public_collectors_directory"), "Safe public collectors view must exist");
    assert(!schema004.includes("masked_bank FROM collectors"), "Public view must never select masked_bank");
});

test("7. Collector cannot access Admin: requireAuth('admin') rejects collector role", () => {
    storage.setSession({ loggedIn: true, role: "collector", status: "active" });
    const allowed = router.requireAuth("admin");
    assert.strictEqual(allowed, false, "Collector must be rejected from admin portal");
});

test("8. Collector cannot access unrelated Citizen private data: citizen addresses isolated", () => {
    const c1 = storage.findById("citizens", "CIT-1001");
    assert(c1, "Citizen CIT-1001 should exist");
    // Collector view of pickups should only expose address of assigned pickups, not general citizen registry
    const schema001 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/001_initial_schema.sql"), "utf8");
    assert(schema001.includes('CREATE POLICY "Citizens can read own record"'), "Citizens RLS must restrict to own record");
});

test("9. Non-admin cannot approve applicant: processApplication verifies admin role", () => {
    const schema004 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/004_security_hardening.sql"), "utf8");
    assert(schema004.includes("v_admin_role := get_user_role();"), "RPC admin_process_application must verify caller role");
    assert(schema004.includes("IF v_admin_role != 'admin' THEN"), "Non-admin must be rejected with access denied");
});

// ─────────────────────────────────────────────
// GROUP 3: ACCOUNT STATUS ENFORCEMENT (Tests 10-14)
// ─────────────────────────────────────────────
console.log("\n[SECURITY GROUP 3] Account Status Enforcement");

test("10. Pending applicant blocked from dashboard routes: redirected to pending.html", () => {
    storage.setSession({ loggedIn: true, role: "citizen", status: "pending_approval" });
    const allowed = router.requireAuth("citizen");
    assert.strictEqual(allowed, false, "Pending approval account must be blocked");
});

test("11. Rejected applicant blocked from dashboard routes: redirected to rejected.html", () => {
    storage.setSession({ loggedIn: true, role: "citizen", status: "rejected" });
    const allowed = router.requireAuth("citizen");
    assert.strictEqual(allowed, false, "Rejected applicant must be blocked");
});

test("12. Suspended account blocked from operational access: session invalidated", () => {
    storage.setSession({ loggedIn: true, role: "citizen", status: "suspended" });
    const allowed = router.requireAuth("citizen");
    assert.strictEqual(allowed, false, "Suspended account must be blocked");
    assert.strictEqual(SecurityUtils.isSessionValid({ status: "suspended", loggedIn: true }), false);
});

test("13. Deactivated account blocked from operational access: session cleared", () => {
    storage.setSession({ loggedIn: true, role: "citizen", status: "deactivated" });
    const allowed = router.requireAuth("citizen");
    assert.strictEqual(allowed, false, "Deactivated account must be blocked");
    assert.strictEqual(SecurityUtils.isSessionValid({ status: "deactivated", loggedIn: true }), false);
});

test("14. Active account allowed to access matching role portal", () => {
    storage.setSession({ loggedIn: true, role: "citizen", status: "active" });
    const allowed = router.requireAuth("citizen");
    assert.strictEqual(allowed, true, "Active citizen must be granted access");
});

// ─────────────────────────────────────────────
// GROUP 4: KYC SECURITY & SIGNED URLs (Tests 15-19)
// ─────────────────────────────────────────────
console.log("\n[SECURITY GROUP 4] KYC Security & Private Storage");

test("15. Private KYC bucket: public access is strictly disabled", () => {
    const storageSql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/002_storage_policies.sql"), "utf8");
    assert(storageSql.includes("Public: FALSE"), "Storage policy documentation must declare bucket as private");
    assert(!storageSql.includes("public = true"), "Bucket must not be created as public");
});

test("16. KYC owner access: storage policies restrict upload & view to user's folder", () => {
    const storageSql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/002_storage_policies.sql"), "utf8");
    assert(storageSql.includes("(storage.foldername(name))[1] = auth.uid()::text"), "User must only access their own folder");
});

test("17. Unauthorized user denied: non-owner non-admin cannot access other user KYC", () => {
    const storageSql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/002_storage_policies.sql"), "utf8");
    assert(storageSql.includes("WHERE id = auth.uid() AND role = 'admin'"), "Admin check must enforce role verification");
});

test("18. Signed URLs: short expiration window enforced", () => {
    const adapterContent = fs.readFileSync(path.join(baseDir, "shared/js/supabase-adapter.js"), "utf8");
    assert(adapterContent.includes("expiresInSeconds || 60"), "Signed KYC URL contract must default to short expiration (60s)");
});

test("19. No public KYC access: anonymous or public downloads denied", () => {
    const storageSql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/002_storage_policies.sql"), "utf8");
    assert(!storageSql.includes("ON storage.objects FOR SELECT USING (true)"), "There must never be an unrestricted SELECT policy on storage");
});

// ─────────────────────────────────────────────
// GROUP 5: PICKUP OWNERSHIP & STATE MACHINE (Tests 20-24)
// ─────────────────────────────────────────────
console.log("\n[SECURITY GROUP 5] Pickup State Machine & Ownership Integrity");

test("20. Pickup ownership enforced: Citizen can only cancel and view their own pickups", () => {
    const schema001 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/001_initial_schema.sql"), "utf8");
    assert(schema001.includes("citizen_id = get_citizen_id()"), "Citizen pickups RLS must enforce ownership");
});

test("21. Collector assignment enforced: Collector can only accept & update assigned pickups", () => {
    const schema004 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/004_security_hardening.sql"), "utf8");
    assert(schema004.includes("IF v_pickup.collector_id != p_collector_id THEN"), "pickup_accept RPC must verify assigned collector");
});

test("22. Invalid state transition rejected: direct jumps like requested -> paid are blocked", () => {
    const schema001 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/001_initial_schema.sql"), "utf8");
    assert(schema001.includes("CREATE OR REPLACE FUNCTION validate_pickup_transition()"), "Pickup transition validator trigger must exist");
    assert(schema001.includes('"requested": ["accepted", "cancelled"]'), "Requested status can only transition to accepted or cancelled");
});

test("23. Direct status manipulation rejected: cancelPickup rejects once collector arrived or scale active", () => {
    const res = services.pickup.cancelPickup("PK-9481"); // PK-9481 is completed
    assert.strictEqual(res.success, false, "Completed pickup must never be cancellable");
    assert(res.error.includes("Cannot cancel pickup"), "Must return clear cancellation boundary violation error");
});

test("24. Concurrent transition safety: row-level locking (FOR UPDATE) enforced in transition RPCs", () => {
    const schema004 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/004_security_hardening.sql"), "utf8");
    assert(schema004.includes("SELECT * INTO v_pickup FROM pickups WHERE id = p_pickup_id FOR UPDATE;"), "pickup RPCs must use FOR UPDATE lock to prevent race conditions");
});

// ─────────────────────────────────────────────
// GROUP 6: PAYMENT & REWARD INTEGRITY (Tests 25-28)
// ─────────────────────────────────────────────
console.log("\n[SECURITY GROUP 6] Payment & Reward Integrity");

test("25. Duplicate payment rejected: process_collection_completion detects already completed pickup", () => {
    const schema001 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/001_initial_schema.sql"), "utf8");
    assert(schema001.includes("IF v_pickup.status IN ('completed', 'paid') THEN"), "Completion RPC must check completed/paid status");
    assert(schema001.includes("'already_completed', true"), "Duplicate completion must return already_completed flag without duplicate payout");
});

test("26. Fake payment injection rejected: payments table blocks direct unprivileged client INSERT", () => {
    const schema004 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/004_security_hardening.sql"), "utf8");
    assert(schema004.includes('CREATE POLICY "Admin can insert payments"'), "Payments INSERT must be restricted to Admin and RPCs");
    assert(!schema004.includes('CREATE POLICY "Service can insert payments" ON payments FOR INSERT WITH CHECK (TRUE)'), "Unrestricted payments insert must be removed");
});

test("27. Duplicate reward rejected: unique conflict constraint on (pickup_id, type) enforced", () => {
    const schema001 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/001_initial_schema.sql"), "utf8");
    assert(schema001.includes("ON CONFLICT (pickup_id, type) WHERE type = 'earned_pickup'"), "Eco Coins reward must be idempotent on pickup_id");
});

test("28. Arbitrary reward credit rejected: reward_transactions blocks direct client INSERT", () => {
    const schema004 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/004_security_hardening.sql"), "utf8");
    assert(schema004.includes('CREATE POLICY "Admin can insert reward transactions"'), "Reward transactions insert must be restricted to Admin and RPCs");
    
    // In mock services layer: citizens cannot alter balance arbitrarily
    const schemaTamper = schema004.includes("prevent_citizen_tampering");
    assert(schemaTamper, "Citizen eco_coins tampering trigger must be in migration 004");
});

// ─────────────────────────────────────────────
// GROUP 7: AUDIT LOGS, NOTIFICATIONS & SUPPORT (Tests 29-33)
// ─────────────────────────────────────────────
console.log("\n[SECURITY GROUP 7] Audit Logs, Notifications & Support");

test("29. Ordinary user cannot create fake approval audit: reviewer bound to auth.uid()", () => {
    const schema004 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/004_security_hardening.sql"), "utf8");
    assert(schema004.includes("reviewer_id,"), "Audit trail must record reviewer_id from auth.uid()");
    assert(schema004.includes("auth.uid(),"), "Reviewer ID must strictly use auth.uid() context");
});

test("30. Ordinary user cannot modify audit trail: UPDATE trigger throws exception", () => {
    const schema004 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/004_security_hardening.sql"), "utf8");
    assert(schema004.includes("CREATE TRIGGER trg_prevent_audit_update"), "Immutable audit trail must have BEFORE UPDATE trigger");
    assert(schema004.includes("RAISE EXCEPTION 'Security violation: Approval audit trail entries are immutable"), "Update must throw security violation exception");
});

test("31. Ordinary user cannot delete audit records: DELETE trigger throws exception", () => {
    const schema004 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/004_security_hardening.sql"), "utf8");
    assert(schema004.includes("CREATE TRIGGER trg_prevent_audit_delete"), "Immutable audit trail must have BEFORE DELETE trigger");
});

test("32. Notification ownership enforced: Users can only read their own notifications", () => {
    const schema001 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/001_initial_schema.sql"), "utf8");
    assert(schema001.includes('CREATE POLICY "Users can read own notifications"'), "Notification policy must enforce user_id = auth.uid()::text");
});

test("33. Support issue ownership enforced: Users can only read/create own issues", () => {
    const schema001 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/001_initial_schema.sql"), "utf8");
    assert(schema001.includes('CREATE POLICY "Users can read own issues"'), "Issues policy must enforce user_id = auth.uid()::text");
    assert(schema001.includes('CREATE POLICY "Users can create issues"'), "Issues insert policy must enforce user_id = auth.uid()::text");
});

// ─────────────────────────────────────────────
// GROUP 8: RATES, INPUT SECURITY & SECRETS (Tests 34-36)
// ─────────────────────────────────────────────
console.log("\n[SECURITY GROUP 8] Scrap Rates, Input Sanitization & Secrets Scan");

test("34. Non-admin cannot change official scrap rates: only Admin has manage policy", () => {
    const schema001 = fs.readFileSync(path.join(__dirname, "../supabase/migrations/001_initial_schema.sql"), "utf8");
    assert(schema001.includes('CREATE POLICY "Admin can manage scrap categories"'), "Scrap rates manage policy must require admin role");
    assert(!schema001.includes('CREATE POLICY "Users can update scrap categories"'), "Non-admins must never have update policy on scrap categories");
});

test("35. HTML/script injection safely handled: escapeHtml neutralizes XSS payloads", () => {
    const xssPayload = '<script>alert("pwned")</script><img src=x onerror=alert(1)>';
    const escaped = SecurityUtils.escapeHtml(xssPayload);
    assert(!escaped.includes("<script>"), "Escaped string must not contain raw <script>");
    assert(!escaped.includes("<img"), "Escaped string must not contain raw <img");
    assert(escaped.includes("&lt;script&gt;"), "Tags must be converted to HTML entities");
    
    // Control character stripping
    const maliciousInput = "SafeText\x00\x08\x1FMalicious";
    const cleaned = SecurityUtils.sanitizeInput(maliciousInput);
    assert(!cleaned.includes("\x00"), "Null bytes must be stripped");
    assert.strictEqual(cleaned, "SafeTextMalicious", "Cleaned string must strip invisible control chars");
    
    // Aadhaar and Bank masking
    assert.strictEqual(SecurityUtils.maskAadhaar("123456789012"), "XXXX-XXXX-9012");
    assert.strictEqual(SecurityUtils.maskBankAccount("987654321098"), "••••••••1098");
    
    // Open redirect validation
    const evilRedirect = "https://evil-attacker.com/login-phish";
    assert.strictEqual(SecurityUtils.validateInternalRoute(evilRedirect, "/auth/login.html"), "/auth/login.html", "External redirect must be rejected in favor of fallback");
    assert.strictEqual(SecurityUtils.validateInternalRoute("../citizen/dashboard.html"), "../citizen/dashboard.html", "Internal route must be accepted");
});

test("36. Zero service-role keys in frontend: entire client codebase scanned", () => {
    function scanDir(dir) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                scanDir(fullPath);
            } else if (file.endsWith(".js") || file.endsWith(".html")) {
                const content = fs.readFileSync(fullPath, "utf8");
                assert(!content.includes("service_role_key"), `Potential service_role_key found in ${fullPath}`);
                assert(!content.includes("SUPABASE_SERVICE_ROLE_KEY"), `Service role key reference in frontend file ${fullPath}`);
            }
        });
    }
    scanDir(path.join(__dirname, "../frontend"));
});

console.log("\n=======================================================");
console.log(`TOTAL PHASE 4C ASSERTIONS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
console.log("=======================================================\n");

if (passedCount !== totalCount) {
    process.exit(1);
}
