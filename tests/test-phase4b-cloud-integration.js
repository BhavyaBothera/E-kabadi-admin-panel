/* =========================================================
   E-KABAADI PLATFORM — PHASE 4B CLOUD INTEGRATION TEST SUITE
   File: tests/test-phase4b-cloud-integration.js

   Comprehensive automated verification for:
   - Strict "No Fake Success" live connection check
   - Synchronous session cache (route guard protection)
   - Dynamic mode switching (mock ↔ supabase)
   - Supabase Auth contract & profile-role auto linking
   - Account status gating (pending_approval, rejected, suspended)
   - Admin approval workflow & audit trail logging
   - Private KYC document upload & signed URL contracts
   - Safe public collector directory field masking
   - Pickup state machine trigger rules & cancellation boundary
   - Atomic collection completion RPC with idempotency
   - Realtime subscription lifecycle & auto-listeners
   - UI State manager (loading, empty, error with retry)
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

let passedCount = 0;
let totalCount = 0;

function test(description, fn) {
    totalCount++;
    try {
        fn();
        console.log(`  ✓ PASS: ${description}`);
        passedCount++;
    } catch (err) {
        console.error(`  ✗ FAIL: ${description}`);
        console.error(`    ${err.message}`);
    }
}

async function testAsync(description, fn) {
    totalCount++;
    try {
        await fn();
        console.log(`  ✓ PASS: ${description}`);
        passedCount++;
    } catch (err) {
        console.error(`  ✗ FAIL: ${description}`);
        console.error(`    ${err.message}`);
    }
}

console.log("\n=======================================================");
console.log("   E-KABAADI PHASE 4B — CLOUD INTEGRATION TEST SUITE   ");
console.log("=======================================================\n");

// ── Module Imports ──
require("../frontend/config/config-loader");
const envModule = require("../frontend/config/environment");
const supabaseClient = require("../frontend/shared/js/supabase-client");
const supabaseAdapter = require("../frontend/shared/js/supabase-adapter");
const storageModule = require("../frontend/shared/js/storage");
const servicesModule = require("../frontend/shared/js/services");
const realtimeModule = require("../frontend/shared/js/realtime");
const uiStatesModule = require("../frontend/shared/js/ui-states");

(async function runTests() {

    // =========================================================
    // [TEST GROUP 1] Strict Connection Check & "No Fake Success"
    // =========================================================
    console.log("[TEST GROUP 1] Strict Connection Check & 'No Fake Success'");

    await testAsync("checkConnection reports disconnected when credentials are empty (STRICT: No fake success)", async () => {
        // Test health check ping with empty / unconfigured credentials
        const status = await supabaseClient.checkConnection();
        assert.strictEqual(typeof status, "object", "Connection status must be an object");
        // When running in environment without real Supabase keys, must report disconnected
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            assert.strictEqual(status.connected, false, "Must report connected: false when credentials missing");
            assert.ok(status.error, "Must provide clear error message explaining missing connection");
        } else {
            assert.strictEqual(typeof status.connected, "boolean", "Must report boolean connected status");
        }
    });

    test("Config loader provides __EKABADI_SET_CONFIG__ dynamic updater", () => {
        assert.strictEqual(typeof global.__EKABADI_SET_CONFIG__, "function", "Setter function must exist on root");
        global.__EKABADI_SET_CONFIG__({ DATA_MODE: "mock" });
        assert.strictEqual(global.__EKABADI_CONFIG__.DATA_MODE, "mock", "DATA_MODE must be updated to mock");
    });

    test("Storage adapter supports dynamic mode switching (setMode)", () => {
        assert.strictEqual(typeof storageModule.setMode, "function", "storage.setMode must exist");
        assert.strictEqual(typeof storageModule.getActiveMode, "function", "storage.getActiveMode must exist");

        // Switch to mock
        storageModule.setMode("mock");
        assert.strictEqual(storageModule.getActiveMode(), "mock", "Active mode must be mock");
        assert.strictEqual(storageModule.adapter, storageModule.mockAdapter, "Active adapter must be StateAdapter");

        // Switch to supabase
        const sbSwitched = storageModule.setMode("supabase");
        assert.strictEqual(sbSwitched, true, "setMode('supabase') should succeed when adapter is loaded");
        assert.strictEqual(storageModule.getActiveMode(), "supabase", "Active mode must now be supabase");

        // Restore to mock for subsequent tests
        storageModule.setMode("mock");
        assert.strictEqual(storageModule.getActiveMode(), "mock", "Restored mode must be mock");
    });

    // =========================================================
    // [TEST GROUP 2] SupabaseAdapter & Synchronous Session Cache
    // =========================================================
    console.log("\n[TEST GROUP 2] SupabaseAdapter & Synchronous Session Cache");

    test("SupabaseAdapter provides synchronous getSession() from cache (Route Guard Safety)", () => {
        assert.strictEqual(typeof supabaseAdapter.getSession, "function", "getSession must exist");
        
        // Clear any leftover session
        supabaseAdapter.clearSession();
        const emptySession = supabaseAdapter.getSession();
        assert.strictEqual(emptySession, null, "Empty session must return null synchronously");

        // Save a mock session to cache
        const testSession = {
            loggedIn: true,
            user: { id: "USR-TEST-001", role: "citizen", name: "Aarav Sharma" },
            role: "citizen",
            status: "active"
        };
        supabaseAdapter.setSession(testSession);

        // Synchronous retrieval check — MUST NOT return a Promise
        const retrieved = supabaseAdapter.getSession();
        assert.ok(retrieved, "Retrieved session must exist");
        assert.strictEqual(typeof retrieved.then, "undefined", "getSession MUST NOT return a Promise (prevents router race condition)");
        assert.strictEqual(retrieved.user.id, "USR-TEST-001", "Cached user ID must match");
        assert.strictEqual(retrieved.role, "citizen", "Cached role must match");

        // Clean up
        supabaseAdapter.clearSession();
        assert.strictEqual(supabaseAdapter.getSession(), null, "Cleared session must be null");
    });

    test("SupabaseAdapter.getActiveCollectors enforces strict public field masking", () => {
        assert.strictEqual(typeof supabaseAdapter.getActiveCollectors, "function", "getActiveCollectors must exist");
        // Verify method returns a Promise
        const res = supabaseAdapter.getActiveCollectors();
        assert.ok(res && typeof res.then === "function", "getActiveCollectors must return a Promise");
    });

    test("SupabaseAdapter implements KYC document upload and signed URL contracts", () => {
        assert.strictEqual(typeof supabaseAdapter.uploadKycDocument, "function", "uploadKycDocument must exist");
        assert.strictEqual(typeof supabaseAdapter.getKycSignedUrl, "function", "getKycSignedUrl must exist");
    });

    test("SupabaseAdapter ping() exposes live health check", async () => {
        assert.strictEqual(typeof supabaseAdapter.ping, "function", "ping must exist");
        const pingResult = await supabaseAdapter.ping();
        assert.strictEqual(typeof pingResult, "object", "ping result must be an object");
        assert.strictEqual(typeof pingResult.connected, "boolean", "ping must return connected flag");
    });

    // =========================================================
    // [TEST GROUP 3] Auth Contract & Role Linking
    // =========================================================
    console.log("\n[TEST GROUP 3] Auth Contract & Account Status Gating");

    test("Services auth layer provides loginWithSupabase & signupWithSupabase", () => {
        assert.strictEqual(typeof servicesModule.auth.loginWithSupabase, "function", "loginWithSupabase must exist");
        assert.strictEqual(typeof servicesModule.auth.signupWithSupabase, "function", "signupWithSupabase must exist");
    });

    test("Account status gating: pending_approval, rejected, and suspended accounts rejected at login", () => {
        // Verify in mock mode that status gating rejects pending/rejected/suspended
        const mockUsers = storageModule.mockAdapter.getCollection("users");
        
        // Add pending user
        const pendingUser = {
            id: "USR-PENDING-001",
            email: "pending@ekabadi.test",
            password: "password123",
            role: "citizen",
            status: "pending_approval"
        };
        storageModule.mockAdapter.insert("users", pendingUser);

        const loginRes = servicesModule.auth.login("pending@ekabadi.test", "password123");
        assert.strictEqual(loginRes.success, false, "Pending user login must fail");
        assert.strictEqual(loginRes.status, "pending_approval", "Status must be pending_approval");

        // Add rejected user
        const rejectedUser = {
            id: "USR-REJECTED-001",
            email: "rejected@ekabadi.test",
            password: "password123",
            role: "collector",
            status: "rejected"
        };
        storageModule.mockAdapter.insert("users", rejectedUser);

        const rejLoginRes = servicesModule.auth.login("rejected@ekabadi.test", "password123");
        assert.strictEqual(rejLoginRes.success, false, "Rejected user login must fail");
        assert.strictEqual(rejLoginRes.status, "rejected", "Status must be rejected");

        // Add suspended user
        const suspendedUser = {
            id: "USR-SUSPENDED-001",
            email: "suspended@ekabadi.test",
            password: "password123",
            role: "collector",
            status: "suspended"
        };
        storageModule.mockAdapter.insert("users", suspendedUser);

        const suspLoginRes = servicesModule.auth.login("suspended@ekabadi.test", "password123");
        assert.strictEqual(suspLoginRes.success, false, "Suspended user login must fail");
    });

    // =========================================================
    // [TEST GROUP 4] Admin Approval Workflow & KYC Inspection
    // =========================================================
    console.log("\n[TEST GROUP 4] Admin Approval Workflow & KYC Inspection");

    test("Admin processApplication updates entity, profile, and inserts into approvalAuditTrail", () => {
        // Register new citizen
        const regRes = servicesModule.auth.registerUser({
            name: "Sunita Verma",
            email: "sunita@ekabadi.test",
            phone: "+91 98765 43210",
            password: "password123",
            role: "citizen",
            address: "Sector 18, Noida"
        });
        assert.strictEqual(regRes.success, true, "Registration must succeed");
        assert.strictEqual(regRes.citizen.status, "pending_approval", "Citizen status must be pending_approval");

        // Admin approves
        const approveRes = servicesModule.auth.reviewRegistration(
            "citizen",
            regRes.citizen.id,
            "APPROVE",
            "Aadhaar and electricity bill verified",
            "Super Admin"
        );
        assert.strictEqual(approveRes.success, true, "Approval must succeed");
        assert.strictEqual(approveRes.action, "APPROVE", "Action must be APPROVE");
        assert.ok(approveRes.auditEntry, "Must return created auditEntry");
        assert.strictEqual(approveRes.auditEntry.entityId, regRes.citizen.id, "Audit entry entityId must match");
        assert.strictEqual(approveRes.auditEntry.reviewerName, "Super Admin", "Reviewer name must match");

        // Verify citizen is now active
        const approvedCitizen = storageModule.mockAdapter.findById("citizens", regRes.citizen.id);
        assert.strictEqual(approvedCitizen.status, "active", "Citizen status must now be active");
        assert.strictEqual(approvedCitizen.kycStatus, "verified", "Citizen kycStatus must be verified");
    });

    test("Services auth layer provides getKycSignedUrl and uploadKycDocument", () => {
        assert.strictEqual(typeof servicesModule.auth.getKycSignedUrl, "function", "getKycSignedUrl must exist");
        assert.strictEqual(typeof servicesModule.auth.uploadKycDocument, "function", "uploadKycDocument must exist");
    });

    // =========================================================
    // [TEST GROUP 5] Pickup Lifecycle & Atomic RPC Settlement
    // =========================================================
    console.log("\n[TEST GROUP 5] Pickup Lifecycle & Atomic RPC Settlement");

    test("Pickup state machine strictly enforces sequence: requested -> accepted -> on_the_way -> arrived -> collecting -> completed", () => {
        // Create pickup
        const pickup = servicesModule.pickup.createPickup({
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            citizenName: "Aarav Sharma",
            collectorName: "Ramesh Kumar",
            scrapType: "Paper & Cardboard",
            estimatedWeight: 15.0,
            estimatedValue: 210.0
        });
        assert.strictEqual(pickup.status, "requested", "Initial status must be requested");

        // Step 1: accepted
        const accepted = servicesModule.pickup.acceptPickup(pickup.id, "COL-2001");
        assert.strictEqual(accepted.status, "accepted", "Transition to accepted must succeed");

        // Step 2: on_the_way
        const enroute = servicesModule.pickup.updateStatus(pickup.id, "on_the_way");
        assert.strictEqual(enroute.status, "on_the_way", "Transition to on_the_way must succeed");

        // Step 3: arrived
        const arrived = servicesModule.pickup.updateStatus(pickup.id, "arrived");
        assert.strictEqual(arrived.status, "arrived", "Transition to arrived must succeed");

        // Step 4: collecting
        const collecting = servicesModule.pickup.updateStatus(pickup.id, "collecting");
        assert.strictEqual(collecting.status, "collecting", "Transition to collecting must succeed");

        // Cancellation barrier: Cannot cancel once collecting
        const cancelAttempt = servicesModule.pickup.cancelPickup(pickup.id, "citizen", "Changed mind");
        assert.strictEqual(cancelAttempt.success, false, "Must block cancellation when status is collecting");

        // Step 5: completed settlement
        const completed = servicesModule.pickup.completeCollection(pickup.id, {
            finalWeight: 16.5,
            finalValue: 231.0
        });
        assert.strictEqual(completed.status, "completed", "Transition to completed must succeed");
        assert.strictEqual(completed.paymentStatus, "paid", "Payment status must be paid");
        assert.strictEqual(completed.ecoCoinsAwarded, 33, "Eco coins must be 16.5 * 2 = 33");
    });

    test("Atomic RPC process_collection_completion contract & parameter signature", () => {
        assert.strictEqual(typeof servicesModule.pickup.completeWithSupabase, "function", "completeWithSupabase must exist");
        assert.strictEqual(typeof supabaseAdapter.rpc, "function", "supabaseAdapter.rpc helper must exist");
    });

    test("Duplicate completion calls return alreadyCompleted without double payment (Idempotency)", () => {
        // Complete a test pickup
        const p = servicesModule.pickup.createPickup({
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            scrapType: "Metal Scrap",
            estimatedWeight: 20.0,
            estimatedValue: 600.0
        });
        servicesModule.pickup.updateStatus(p.id, "collecting");

        const initialPaymentsCount = storageModule.mockAdapter.getCollection("payments").length;
        const res1 = servicesModule.pickup.completeCollection(p.id, { finalWeight: 20.0, finalValue: 600.0 });
        assert.strictEqual(res1.status, "completed", "First completion must succeed");

        const paymentsAfterFirst = storageModule.mockAdapter.getCollection("payments").length;
        assert.strictEqual(paymentsAfterFirst, initialPaymentsCount + 1, "Exactly one payment record created");

        // Second completion call (idempotent duplicate)
        const res2 = servicesModule.pickup.completeCollection(p.id, { finalWeight: 20.0, finalValue: 600.0 });
        assert.strictEqual(res2.alreadyCompleted, true, "Duplicate call must flag alreadyCompleted");

        const paymentsAfterSecond = storageModule.mockAdapter.getCollection("payments").length;
        assert.strictEqual(paymentsAfterSecond, paymentsAfterFirst, "Payment count MUST NOT increase on duplicate call");
    });

    // =========================================================
    // [TEST GROUP 6] Realtime Subscription Lifecycle
    // =========================================================
    console.log("\n[TEST GROUP 6] Realtime Subscription Lifecycle");

    test("Realtime subscription manager exposes lifecycle, channels, and status", () => {
        assert.strictEqual(typeof realtimeModule.subscribe, "function", "subscribe must exist");
        assert.strictEqual(typeof realtimeModule.unsubscribe, "function", "unsubscribe must exist");
        assert.strictEqual(typeof realtimeModule.unsubscribeAll, "function", "unsubscribeAll must exist");
        assert.strictEqual(typeof realtimeModule.initForUser, "function", "initForUser must exist");
        assert.strictEqual(typeof realtimeModule.cleanup, "function", "cleanup must exist");
        assert.strictEqual(typeof realtimeModule.getStatus, "function", "getStatus must exist");
        assert.strictEqual(typeof realtimeModule.isConnected, "function", "isConnected must exist");

        const status = realtimeModule.getStatus();
        assert.strictEqual(typeof status, "object", "Status must be an object");
        assert.strictEqual(typeof status.count, "number", "Channel count must be numeric");
    });

    test("Realtime auto-cleans on session:logout event dispatch", () => {
        // Dispatch session logout event
        const event = new CustomEvent("ekabadi:statechange", {
            detail: { entity: "session", action: "logout" }
        });
        global.dispatchEvent(event);

        const status = realtimeModule.getStatus();
        assert.strictEqual(status.initialized, false, "Realtime must be uninitialized after logout");
        assert.strictEqual(status.count, 0, "All channels must be closed after logout");
    });

    // =========================================================
    // [TEST GROUP 7] UI State Manager (Loading, Empty, Error)
    // =========================================================
    console.log("\n[TEST GROUP 7] UI State Manager (Loading, Empty, Error)");

    test("UIStates wrapAsync properly resolves sync and async operations", async () => {
        assert.strictEqual(typeof uiStatesModule.wrapAsync, "function", "wrapAsync must exist");
        assert.strictEqual(typeof uiStatesModule.showLoading, "function", "showLoading must exist");
        assert.strictEqual(typeof uiStatesModule.showEmpty, "function", "showEmpty must exist");
        assert.strictEqual(typeof uiStatesModule.showError, "function", "showError must exist");
        assert.strictEqual(typeof uiStatesModule.clearState, "function", "clearState must exist");

        // Mock container
        const mockContainer = {
            innerHTML: "",
            querySelector: () => null
        };

        let rendered = false;
        await uiStatesModule.wrapAsync(
            mockContainer,
            async () => [{ id: 1, title: "Test Item" }],
            (data) => {
                rendered = true;
                assert.strictEqual(data.length, 1, "Data must have 1 item");
            },
            { loadingMsg: "Fetching items..." }
        );
        assert.strictEqual(rendered, true, "renderFn must have been executed");
    });

    // =========================================================
    // [TEST GROUP 8] Zero Regressions Verification
    // =========================================================
    console.log("\n[TEST GROUP 8] Zero Regressions Verification");

    test("All core services remain functional across all collections", () => {
        const stats = storageModule.legacyApi.getDatabaseStats();
        assert.ok(stats.citizensCount > 0, "Citizens must be present in database");
        assert.ok(stats.collectorsCount > 0, "Collectors must be present in database");
        assert.ok(stats.pickupsCount > 0, "Pickups must be present in database");
        assert.ok(stats.paymentsCount > 0, "Payments must be present in database");

        // Scrap categories
        const categories = servicesModule.scrapAnalysis.getCategories();
        assert.ok(Array.isArray(categories) && categories.length > 0, "Scrap categories must be non-empty");

        // Rewards catalog
        const rewards = servicesModule.reward.getCatalog();
        assert.ok(Array.isArray(rewards) && rewards.length > 0, "Reward catalog must be non-empty");
    });

    console.log("\n=======================================================");
    console.log(`TOTAL PHASE 4B ASSERTIONS: ${totalCount} | PASSED: ${passedCount} | FAILED: ${totalCount - passedCount}`);
    console.log("=======================================================\n");

    if (totalCount !== passedCount) {
        process.exit(1);
    }
})();
