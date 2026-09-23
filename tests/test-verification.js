/**
 * E-KABAADI PLATFORM — Phase 2 Verification Test Suite
 * Tests unified storage, state machine transitions, golden flow,
 * admin approval audit trail, cancellation rules, and data masking.
 */

// Simulated browser globals for Node test runner
const localStorageStore = {};
global.localStorage = {
    getItem: (key) => localStorageStore[key] || null,
    setItem: (key, val) => { localStorageStore[key] = String(val); },
    removeItem: (key) => { delete localStorageStore[key]; },
    clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }
};

global.window = {
    location: { href: "http://localhost/", search: "" },
    dispatchEvent: (evt) => {
        // Event broadcast simulation
    }
};
global.CustomEvent = class {
    constructor(name, opts) {
        this.name = name;
        this.detail = opts ? opts.detail : null;
    }
};

const path = require("path");
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
console.log("E-KABAADI PLATFORM — VERIFICATION & AUDIT TEST RUNNER");
console.log("=======================================================\n");

// TEST 1: Storage & State Adapter Initialization
console.log("[TEST 1] State Adapter & Unified Database Initialization");
const db = EKABADI_STORAGE.adapter.getDatabase();
assert(db && db.version === "2.0.0", "Database version is 2.0.0");
assert(db.users && db.users.length >= 3, `Users collection seeded (${db.users.length} accounts)`);
assert(db.collectors && db.collectors.length >= 2, `Collectors collection seeded (${db.collectors.length} partners)`);
assert(db.citizens && db.citizens.length >= 2, `Citizens collection seeded (${db.citizens.length} citizens)`);

// TEST 2: Demo Accounts Isolation & Security
console.log("\n[TEST 2] Demo Accounts Authentication & Isolation");
const citAuth = auth.login("citizen@ekabadi.demo", "citizen123");
assert(citAuth.success === true && citAuth.role === "citizen", "Citizen demo account authenticated");
const colAuth = auth.login("collector@ekabadi.demo", "collector123");
assert(colAuth.success === true && colAuth.role === "collector", "Collector demo account authenticated");
const admAuth = auth.login("admin@ekabadi.demo", "admin123");
assert(admAuth.success === true && admAuth.role === "admin", "Admin demo account authenticated");
const badAuth = auth.login("citizen@ekabadi.demo", "wrongpassword");
assert(badAuth.success === false, "Invalid password rejected");

// TEST 3: Citizen Golden Flow — Create Pickup with Selected Collector
console.log("\n[TEST 3] Citizen Golden Flow — Pickup Creation");
const newPickup = pickup.createPickup({
    citizenId: "CIT-1001",
    collectorId: "COL-2001", // Citizen explicitly chose Ramesh Kumar
    address: "Flat B-402, Green Valley Apts, Sector 62, Noida",
    scrapType: "Newspaper & Cardboard",
    items: [
        { categoryName: "Newspaper & Books", estimatedWeight: 15.0, ratePerKg: 14.0 },
        { categoryName: "Corrugated Cardboard", estimatedWeight: 10.5, ratePerKg: 11.5 }
    ],
    estimatedWeight: 25.5,
    estimatedValue: 330.75,
    notes: "Ring bell twice, scrap near balcony"
});

assert(newPickup.id && newPickup.id.startsWith("PK-"), `Pickup created with ID ${newPickup.id}`);
assert(newPickup.status === "requested", "Initial status is REQUESTED");
assert(newPickup.collectorId === "COL-2001", "Collector strictly matches Citizen selection (Ramesh Kumar)");

// Verify Rule: Cannot create pickup without citizen choosing collector
let ruleViolated = false;
try {
    pickup.createPickup({ citizenId: "CIT-1001" });
} catch (e) {
    ruleViolated = true;
}
assert(ruleViolated === true, "Core rule enforced: Citizen must explicitly choose a Collector");

// TEST 4: Collector Logistics Flow & State Machine Transitions
console.log("\n[TEST 4] Collector State Machine: REQUESTED → ACCEPTED → ON_THE_WAY → ARRIVED → COLLECTING → COMPLETED → PAID");
// 4a: Accept
const accepted = pickup.acceptPickup(newPickup.id, "COL-2001");
assert(accepted.status === "accepted", "State transitioned to ACCEPTED");

// 4b: Depart / En Route
const enRoute = pickup.updateStatus(newPickup.id, "on_the_way");
assert(enRoute.status === "on_the_way" && enRoute.enrouteAt, "State transitioned to ON_THE_WAY with timestamp");

// 4c: Arrived
const arrived = pickup.updateStatus(newPickup.id, "arrived");
assert(arrived.status === "arrived" && arrived.arrivedAt, "State transitioned to ARRIVED with timestamp");

// 4d: Weighing / Collecting
const collecting = pickup.updateStatus(newPickup.id, "collecting");
assert(collecting.status === "collecting", "State transitioned to COLLECTING");

// 4e: Complete Collection with Digital Scale Settlement
const initialCitProfile = citizen.getProfile("CIT-1001");
const initialCoins = initialCitProfile.ecoCoins || 0;
const initialEarnings = initialCitProfile.totalEarnings || 0;

const completionResult = pickup.completeCollection(newPickup.id, {
    finalWeight: 26.0,
    finalValue: 340.00,
    items: [
        { name: "Newspaper & Books", weight: 15.5, rate: 14.0 },
        { name: "Corrugated Cardboard", weight: 10.5, rate: 11.5 }
    ]
});

assert(completionResult.status === "completed" && completionResult.paymentStatus === "paid", "State transitioned to COMPLETED and PAID");

// Check Payment Record
const allPayments = payment.getAll();
const matchingPayment = allPayments.find(p => p.pickupId === newPickup.id);
assert(matchingPayment && matchingPayment.status === "paid" && matchingPayment.amount === 340.00, `Auto-generated payment record #${matchingPayment.id} for ₹340.00 (PAID)`);

// Check Eco Coins awarded
const updatedCitProfile = citizen.getProfile("CIT-1001");
const coinsAwarded = completionResult.ecoCoinsAwarded;
assert(coinsAwarded === 52, `Eco coins calculated correctly: 26 kg * 2 = 52 coins`);
assert(updatedCitProfile.ecoCoins === initialCoins + 52, `Citizen wallet updated from ${initialCoins} to ${updatedCitProfile.ecoCoins} coins`);
assert(updatedCitProfile.totalEarnings === +(initialEarnings + 340.00).toFixed(2), `Citizen lifetime earnings updated (+₹340.00)`);

// TEST 5: Cancellation Rules
console.log("\n[TEST 5] Cancellation Rules & Validation");
// Cannot cancel a completed pickup
const cancelAttempt = pickup.cancelPickup(newPickup.id, "citizen", "Customer changed mind");
assert(cancelAttempt.success === false, "Enforced: Cannot cancel completed/collecting pickup");

// Create temporary pickup to test valid cancellation
const tempPickup = pickup.createPickup({
    citizenId: "CIT-1001",
    collectorId: "COL-2001",
    estimatedWeight: 5.0,
    estimatedValue: 70.0
});
assert(tempPickup.status === "requested", "Temp pickup created");
const validCancel = pickup.cancelPickup(tempPickup.id, "citizen", "Rescheduled appointment");
assert(validCancel.success === true && validCancel.pickup.status === "cancelled", "Enforced: REQUESTED pickup successfully CANCELLED");

// TEST 6: Admin Approval Flow & Audit Trail
console.log("\n[TEST 6] Admin Approval Flow with Audit Trail");
// Register a pending applicant
const signupRes = auth.register({
    role: "citizen",
    firstName: "Vikram",
    lastName: "Malhotra",
    email: "vikram.pending@test.demo",
    phone: "+91 98888 77777",
    password: "password123",
    address: "Sector 18 Noida"
});
assert(signupRes.success === true, "New applicant registered");
assert(signupRes.user.status === "pending_approval", "Applicant status is pending_approval");

// Cannot log in while pending
const pendingLogin = auth.login("vikram.pending@test.demo", "password123");
assert(pendingLogin.success === false && pendingLogin.status === "pending_approval", "Pending applicant cannot log in before admin approval");

// Admin reviews and approves
const reviewRes = auth.reviewRegistration("citizen", signupRes.citizen.id, "APPROVE", "Residential utility bill verified", "Bhavya Bothera (Super Admin)");
assert(reviewRes.success === true && reviewRes.action === "APPROVE", "Admin approved applicant");

// Verify Audit Trail entry
const dbAudits = EKABADI_STORAGE.adapter.getCollection("approvalAuditTrail");
const audit = dbAudits.find(a => a.entityId === signupRes.citizen.id);
assert(audit && audit.reviewerName.includes("Bhavya Bothera") && audit.action === "APPROVE" && audit.reason.includes("Residential utility bill"), "Approval Audit Trail logged reviewer, action, reason, timestamp");

// Approved applicant can now log in
const approvedLogin = auth.login("vikram.pending@test.demo", "password123");
assert(approvedLogin.success === true && approvedLogin.session.loggedIn === true, "Newly approved applicant successfully logs in!");

// TEST 7: Role-Specific Data Visibility & Masking
console.log("\n[TEST 7] Role-Specific Data Visibility & Masking");
const maskedAadhaar = utils.maskAadhaar("123456789012");
assert(maskedAadhaar === "XXXX-XXXX-9012", `Masked Aadhaar: ${maskedAadhaar}`);
const maskedBank = utils.maskBankAccount("987654321098");
assert(maskedBank === "••••••••1098", `Masked Bank Account: ${maskedBank}`);

console.log("\n=======================================================");
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log("=======================================================\n");

if (failed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
