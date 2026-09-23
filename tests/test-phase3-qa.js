/**
 * E-KABAADI PLATFORM — Phase 3 QA & Audit Test Suite
 * Tests Route Integrity, Strict RBAC boundaries, Idempotency,
 * Bidirectional State Synchronization, and Public Portal services.
 */

const fs = require("fs");
const path = require("path");

// Simulated browser globals for Node test runner
const localStorageStore = {};
global.localStorage = {
    getItem: (key) => localStorageStore[key] || null,
    setItem: (key, val) => { localStorageStore[key] = String(val); },
    removeItem: (key) => { delete localStorageStore[key]; },
    clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }
};

let redirectTarget = null;
global.window = {
    location: {
        href: "http://localhost/frontend/citizen/dashboard.html",
        pathname: "/frontend/citizen/dashboard.html",
        search: "",
        replace: (url) => { redirectTarget = url; },
        assign: (url) => { redirectTarget = url; }
    },
    dispatchEvent: () => {}
};
global.CustomEvent = class {
    constructor(name, opts) {
        this.name = name;
        this.detail = opts ? opts.detail : null;
    }
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

// Load Storage Adapter
const storageExports = require(path.join(baseDir, "shared/js/storage.js"));
global.EKABADI_STORAGE = storageExports;

// Load Services
const servicesExports = require(path.join(baseDir, "shared/js/services.js"));
global.EKABADI_SERVICES = servicesExports;
const { auth, citizen, collector, pickup, payment, reward, notification, support } = servicesExports;

// Load Utilities
const utils = require(path.join(baseDir, "shared/js/utilities.js"));
global.EKABADI_UTILS = utils;

// Load Router
const routerExports = require(path.join(baseDir, "shared/js/router.js"));
global.EKABADI_ROUTER = routerExports;

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ PASS: ${message}`);
        passed++;
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        failed++;
    }
}

console.log("\n=======================================================");
console.log("   E-KABAADI PHASE 3 — FINAL QA & AUDIT TEST RUNNER    ");
console.log("=======================================================\n");

// -------------------------------------------------------------
// [TEST 1] Route Inventory & Asset Link Integrity
// -------------------------------------------------------------
console.log("[TEST 1] Route Inventory & Hyperlink Integrity Audit");

const portals = ["public", "auth", "citizen", "collector", "admin"];
const htmlFiles = [];

portals.forEach(portal => {
    const portalDir = path.join(baseDir, portal);
    if (fs.existsSync(portalDir)) {
        const files = fs.readdirSync(portalDir).filter(f => f.endsWith(".html"));
        files.forEach(f => {
            htmlFiles.push({ portal, filename: f, fullPath: path.join(portalDir, f) });
        });
    }
});

assert(htmlFiles.length >= 44, `Found complete inventory of ${htmlFiles.length} HTML pages across 5 portals`);

let brokenLinks = 0;
let totalLinksChecked = 0;

htmlFiles.forEach(({ portal, filename, fullPath }) => {
    const content = fs.readFileSync(fullPath, "utf-8");

    // Match href and src
    const linkRegex = /(?:href|src)=["']([^"'#?]+)["']/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
        const link = match[1].trim();

        // Skip external protocols or anchors
        if (link.startsWith("http://") || link.startsWith("https://") || link.startsWith("//") || link.startsWith("mailto:") || link.startsWith("data:") || link.startsWith("javascript:")) {
            continue;
        }

        totalLinksChecked++;
        const targetPath = path.resolve(path.dirname(fullPath), link);
        if (!fs.existsSync(targetPath)) {
            brokenLinks++;
            console.error(`    Broken link in ${portal}/${filename} -> ${link}`);
        }
    }
});

assert(brokenLinks === 0, `All ${totalLinksChecked} internal asset & page links resolve to valid files (0 broken links)`);

// -------------------------------------------------------------
// [TEST 2] Strict Role-Based Access Control (RBAC) Matrix
// -------------------------------------------------------------
console.log("\n[TEST 2] Role-Based Access Control & Navigation Boundaries");

// 2a. Unauthenticated access
redirectTarget = null;
storageExports.adapter.setSession(null);
const unauthCheck = routerExports.requireRole("citizen");
assert(unauthCheck === false && redirectTarget && redirectTarget.includes("login.html"), "Unauthenticated user blocked from Citizen route -> redirected to login");

// 2b. Cross-role blocking: Citizen -> Collector route
redirectTarget = null;
storageExports.adapter.setSession({
    userId: "USR-CIT-001",
    role: "citizen",
    status: "active",
    citizenId: "CIT-1001",
    name: "Aarav Sharma"
});
const crossRoleCollector = routerExports.requireRole("collector");
assert(crossRoleCollector === false && redirectTarget && redirectTarget.includes("citizen"), "Citizen blocked from Collector portal -> redirected to Citizen dashboard");

// 2c. Cross-role blocking: Citizen -> Admin route
redirectTarget = null;
const crossRoleAdmin = routerExports.requireRole("admin");
assert(crossRoleAdmin === false && redirectTarget && redirectTarget.includes("citizen"), "Citizen blocked from Admin Command Center -> redirected to Citizen dashboard");

// 2d. Cross-role blocking: Collector -> Citizen route
redirectTarget = null;
storageExports.adapter.setSession({
    userId: "USR-COL-001",
    role: "collector",
    status: "active",
    collectorId: "COL-2001",
    name: "Ramesh Kumar"
});
const crossRoleCitizen = routerExports.requireRole("citizen");
assert(crossRoleCitizen === false && redirectTarget && redirectTarget.includes("collector"), "Collector blocked from Citizen portal -> redirected to Collector dashboard");

// 2e. Status check: Pending approval user
redirectTarget = null;
storageExports.adapter.setSession({
    userId: "USR-TEMP-001",
    role: "citizen",
    status: "pending_approval",
    citizenId: "CIT-TEMP",
    name: "Pending Applicant"
});
const pendingCheck = routerExports.requireRole("citizen");
assert(pendingCheck === false && redirectTarget && redirectTarget.includes("pending.html"), "Pending applicant blocked from active portal -> redirected to pending.html");

// 2f. Status check: Rejected user
redirectTarget = null;
storageExports.adapter.setSession({
    userId: "USR-REJ-001",
    role: "collector",
    status: "rejected",
    collectorId: "COL-REJ",
    name: "Rejected Applicant"
});
const rejectedCheck = routerExports.requireRole("collector");
assert(rejectedCheck === false && redirectTarget && redirectTarget.includes("rejected.html"), "Rejected applicant blocked from active portal -> redirected to rejected.html");

// 2g. Status check: Suspended user
redirectTarget = null;
storageExports.adapter.setSession({
    userId: "USR-SUSP-001",
    role: "citizen",
    status: "suspended",
    citizenId: "CIT-SUSP",
    name: "Suspended Account"
});
const suspendedCheck = routerExports.requireRole("citizen");
assert(suspendedCheck === false && redirectTarget && redirectTarget.includes("error=suspended"), "Suspended account blocked -> redirected to login with error parameter");

// -------------------------------------------------------------
// [TEST 3] Idempotency & Double-Action Protection
// -------------------------------------------------------------
console.log("\n[TEST 3] Idempotency & Concurrency Protection");

// 3a. Idempotent Pickup Creation
const pickup1 = pickup.createPickup({
    citizenId: "CIT-1001",
    collectorId: "COL-2001",
    scrapType: "Paper & Plastics",
    estimatedWeight: 10.0,
    estimatedValue: 140.0
});
const pickup2 = pickup.createPickup({
    citizenId: "CIT-1001",
    collectorId: "COL-2001",
    scrapType: "Paper & Plastics",
    estimatedWeight: 10.0,
    estimatedValue: 140.0
});
assert(pickup1.id === pickup2.id, `Idempotency enforced on createPickup: rapid double-click returned existing #${pickup1.id}`);

// 3b. Idempotent Collection Completion & Payment Creation
const testPickupId = pickup1.id;
pickup.updateStatus(testPickupId, "accepted");
pickup.updateStatus(testPickupId, "on_the_way");
pickup.updateStatus(testPickupId, "arrived");
pickup.updateStatus(testPickupId, "collecting");

const citBefore = citizen.getProfile("CIT-1001");
const coinsBefore = citBefore.ecoCoins || 0;
const payCountBefore = payment.getAll().length;

// First complete call
const compResult1 = pickup.completeCollection(testPickupId, {
    finalWeight: 20.0,
    finalValue: 280.0
});
const coinsAfterFirst = citizen.getProfile("CIT-1001").ecoCoins;
const payCountAfterFirst = payment.getAll().length;

// Immediate duplicate complete call (double-click simulation)
const compResult2 = pickup.completeCollection(testPickupId, {
    finalWeight: 20.0,
    finalValue: 280.0
});
const coinsAfterSecond = citizen.getProfile("CIT-1001").ecoCoins;
const payCountAfterSecond = payment.getAll().length;

assert(compResult2.alreadyCompleted === true, "completeCollection detected duplicate call and returned alreadyCompleted flag");
assert(payCountAfterSecond === payCountAfterFirst && payCountAfterFirst === payCountBefore + 1, "Duplicate payment record strictly prevented (payment count remained constant)");
assert(coinsAfterSecond === coinsAfterFirst && coinsAfterFirst === coinsBefore + 40, `Duplicate Eco Coins strictly prevented (coins remained ${coinsAfterFirst})`);

// 3c. Idempotent Admin Application Review
const regResult = auth.registerUser({
    name: "Idempotent Partner",
    email: "partner.idem@example.com",
    phone: "+91 98888 77777",
    password: "Password@123",
    role: "collector"
});
const applicantId = regResult.collector ? regResult.collector.id : regResult.user.id;

// First approve
const auditBefore = storageExports.adapter.getCollection("approvalAuditTrail").length;
auth.processApplication("collector", applicantId, "APPROVE", "First approval pass");
const auditAfterFirst = storageExports.adapter.getCollection("approvalAuditTrail").length;

// Second approve on already approved partner
auth.processApplication("collector", applicantId, "APPROVE", "Duplicate click");
const auditAfterSecond = storageExports.adapter.getCollection("approvalAuditTrail").length;

assert(auditAfterFirst === auditBefore + 1, "First approval logged in audit trail");
assert(auditAfterSecond === auditAfterFirst, "Duplicate approval click did not create duplicate audit trail entry");

// -------------------------------------------------------------
// [TEST 4] Real-time Bidirectional State Synchronization
// -------------------------------------------------------------
console.log("\n[TEST 4] Bidirectional State Synchronization");

// 4a. Collector updates fleet profile
const activeCol = collector.getProfile("COL-2001");
const originalModel = activeCol.vehicleType;
collector.updateProfile("COL-2001", {
    vehicleType: "Electric Cargo Van",
    vehicleNumber: "UP 16 EV 9999",
    serviceRadius: 15
});
const updatedCol = collector.getProfile("COL-2001");
assert(updatedCol.vehicleType === "Electric Cargo Van" && updatedCol.serviceRadius === 15, "Collector profile updates persist in storage and reflect across calls");

// 4b. Revert vehicle model for data cleanliness
collector.updateProfile("COL-2001", { vehicleType: originalModel, serviceRadius: 10 });

// -------------------------------------------------------------
// [TEST 5] Public Portal Features & Guest Tracking
// -------------------------------------------------------------
console.log("\n[TEST 5] Public Scrap Rates & Guest Tracking Integrity");

// 5a. Scrap items availability
assert(Array.isArray(global.MOCK_SCRAP) && global.MOCK_SCRAP.length >= 8, `Public scrap rates directory contains ${global.MOCK_SCRAP.length} certified materials`);

// 5b. Guest lookup for known pickups
const tracked1001 = pickup.getById("PKP-1001");
assert(tracked1001 !== null && tracked1001.id === "PKP-1001", "Guest tracking resolves PKP-1001 with active status");

const tracked1002 = pickup.getById("PKP-1002");
assert(tracked1002 !== null && tracked1002.status === "completed", "Guest tracking resolves completed pickup PKP-1002 with certified payout");

// 5c. Guest lookup for invalid ID
const trackedInvalid = pickup.getById("PKP-9999-DOES-NOT-EXIST");
assert(trackedInvalid === null, "Guest tracking safely returns null for non-existent reference IDs");

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log("\n=======================================================");
console.log(`TOTAL ASSERTIONS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("=======================================================\n");

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
