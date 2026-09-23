/**
 * E-KABAADI PLATFORM — Comprehensive End-to-End Golden Flow & Admin Approval Flow
 * File: tests/test-golden-flow-e2e.js
 */

const localStorageStore = {};
global.localStorage = {
    getItem: (key) => localStorageStore[key] || null,
    setItem: (key, val) => { localStorageStore[key] = String(val); },
    removeItem: (key) => { delete localStorageStore[key]; },
    clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }
};

global.window = {
    location: { href: "http://localhost/", search: "" },
    dispatchEvent: () => {}
};
global.CustomEvent = class {
    constructor(name, opts) {
        this.name = name;
        this.detail = opts ? opts.detail : null;
    }
};

const path = require("path");
const baseDir = path.join(__dirname, "../frontend");

global.MOCK_USERS = require(path.join(baseDir, "data/mock-users.js"));
global.MOCK_CITIZENS = require(path.join(baseDir, "data/mock-citizens.js"));
global.MOCK_COLLECTORS = require(path.join(baseDir, "data/mock-collectors.js"));
global.MOCK_PICKUPS = require(path.join(baseDir, "data/mock-pickups.js"));
global.MOCK_PAYMENTS = require(path.join(baseDir, "data/mock-payments.js"));
global.MOCK_REWARDS = require(path.join(baseDir, "data/mock-rewards.js"));
global.MOCK_NOTIFICATIONS = require(path.join(baseDir, "data/mock-notifications.js"));
global.MOCK_SCRAP = require(path.join(baseDir, "data/mock-scrap.js"));
global.EKABADI_CONSTANTS = require(path.join(baseDir, "config/constants.js"));

const storageExports = require(path.join(baseDir, "shared/js/storage.js"));
global.EKABADI_STORAGE = storageExports;

const servicesExports = require(path.join(baseDir, "shared/js/services.js"));
global.EKABADI_SERVICES = servicesExports;
const { auth, citizen, collector, pickup, payment, reward, notification } = servicesExports;

const utils = require(path.join(baseDir, "shared/js/utilities.js"));
global.EKABADI_UTILS = utils;

let testsCount = 0;
let passedCount = 0;

function step(desc, condition) {
    testsCount++;
    if (condition) {
        console.log(`  ✓ STEP ${testsCount}: ${desc}`);
        passedCount++;
    } else {
        console.error(`  ✗ STEP ${testsCount} FAILED: ${desc}`);
        process.exit(1);
    }
}

console.log("\n=======================================================");
console.log("   E-KABAADI FULL END-TO-END GOLDEN FLOW VERIFIER      ");
console.log("=======================================================\n");

console.log("--- PHASE A: Citizen Experience & Booking ---");
// 1. Citizen Authentication
const citLogin = auth.login("citizen@ekabadi.demo", "citizen123");
step("Citizen logs in with isolated demo account", citLogin.success && citLogin.role === "citizen");
const activeCitizen = citizen.getById(citLogin.session.user.citizenId);
step("Citizen profile retrieved (Aarav Sharma)", activeCitizen && activeCitizen.id === "CIT-1001");
const initialCoins = activeCitizen.ecoCoins || 0;
const initialEarnings = activeCitizen.totalEarnings || 0;
const initialPickups = activeCitizen.completedPickups || 0;

// 2. Citizen browses verified collectors
const collectors = collector.getAll().filter(c => c.status === "active");
step("Citizen views active background-certified collectors", collectors.length >= 2);
const selectedCollector = collectors.find(c => c.id === "COL-2001") || collectors[0];
step("Citizen explicitly selects collector partner: " + selectedCollector.name, !!selectedCollector);

// 3. Citizen books pickup with explicit collector
const bookingPayload = {
    citizenId: activeCitizen.id,
    citizenName: activeCitizen.name,
    collectorId: selectedCollector.id,
    collectorName: selectedCollector.name,
    address: activeCitizen.addresses[0].address,
    scheduledDate: "2026-09-24",
    scheduledTime: "10:00 AM - 12:00 PM",
    scrapType: "Newspaper & Cardboard",
    items: [
        { category: "Paper", name: "Newspaper", estimatedWeight: 18.0, rate: 14.0 },
        { category: "Cardboard", name: "Corrugated Box", estimatedWeight: 12.0, rate: 11.5 }
    ],
    estimatedWeight: 30.0,
    estimatedValue: (18 * 14) + (12 * 11.5), // 252 + 138 = 390
    paymentMethod: "UPI"
};
const newPickup = pickup.createPickup(bookingPayload);
step("Pickup created with ID " + newPickup.id, !!newPickup.id);
step("Initial status is REQUESTED", newPickup.status === "requested");
step("Collector is LOCKED to citizen's chosen collector (Admin cannot change)", newPickup.collectorId === selectedCollector.id);

console.log("\n--- PHASE B: Collector Field Logistics & Transit ---");
// 4. Collector logs in
const colLogin = auth.login("collector@ekabadi.demo", "collector123");
step("Collector logs in with demo credentials", colLogin.success && colLogin.role === "collector");

// 5. Collector checks pending requests and accepts
const pendingRequests = pickup.getByCollector(selectedCollector.id).filter(p => p.status === "requested");
step("Pickup appears in collector's dispatch queue", pendingRequests.some(p => p.id === newPickup.id));
const acceptRes = pickup.acceptPickup(newPickup.id, selectedCollector.id);
step("Collector accepts pickup -> Status transitions to ACCEPTED", acceptRes && (acceptRes.status === "accepted" || acceptRes.success));

// 6. Collector departs -> ON_THE_WAY
const transitRes = pickup.updateStatus(newPickup.id, "on_the_way");
step("Collector departs depot -> Status transitions to ON_THE_WAY", transitRes && transitRes.status === "on_the_way" && !!transitRes.enrouteAt);

// 7. Collector arrives at doorstep -> ARRIVED
const arriveRes = pickup.updateStatus(newPickup.id, "arrived");
step("Collector arrives at gate -> Status transitions to ARRIVED", arriveRes && arriveRes.status === "arrived" && !!arriveRes.arrivedAt);

console.log("\n--- PHASE C: Zero-Tamper Digital Scale Session & Settlement ---");
// 8. Weighing session starts -> COLLECTING
const collectRes = pickup.updateStatus(newPickup.id, "collecting");
step("Bluetooth Scale connected -> Status transitions to COLLECTING", collectRes && collectRes.status === "collecting");

// 9. Digital scale captures tare and verified weight
const scaleData = {
    finalWeight: 30.0,
    finalValue: 390.0,
    items: [
        { category: "Paper", name: "Newspaper", verifiedWeight: 18.0, rate: 14.0, subtotal: 252.0 },
        { category: "Cardboard", name: "Corrugated Box", verifiedWeight: 12.0, rate: 11.5, subtotal: 138.0 }
    ]
};
const completedPickup = pickup.completeCollection(newPickup.id, scaleData);
step("Collection finalized -> Status is COMPLETED and paymentStatus is PAID", completedPickup && completedPickup.status === "completed" && completedPickup.paymentStatus === "paid");

// 10. Financial settlement & Eco Coins validation
const expectedCoins = 30.0 * 2; // 60 coins
step(`Eco Coins calculated (30 kg * 2 = ${expectedCoins} coins)`, completedPickup.ecoCoinsAwarded === expectedCoins);

const updatedCitizen = citizen.getById(activeCitizen.id);
step(`Citizen Eco Coin wallet credited: ${initialCoins} -> ${updatedCitizen.ecoCoins} (+${expectedCoins})`, updatedCitizen.ecoCoins === initialCoins + expectedCoins);
step(`Citizen total earnings updated (+₹390.00)`, updatedCitizen.totalEarnings === initialEarnings + 390.0);
step(`Citizen completed pickups incremented`, updatedCitizen.completedPickups === initialPickups + 1);

// 11. Transaction record verification
const allPayments = payment.getAll();
const txn = allPayments.find(p => p.pickupId === newPickup.id);
step("Payment record auto-generated with TXN ID " + (txn ? txn.id : "NONE"), !!txn && txn.amount === 390.0 && txn.status === "paid");

console.log("\n--- PHASE D: Cancellation Boundaries ---");
// 12. Cannot cancel completed pickup
const cancelCompleted = pickup.cancelPickup(newPickup.id, "citizen", "Try cancel after complete");
step("Validation blocks cancellation of completed/collected pickup", cancelCompleted.success === false);

// 13. Can cancel a newly requested pickup
const tempP = pickup.createPickup({
    citizenId: activeCitizen.id,
    collectorId: selectedCollector.id,
    scrapType: "Metal Cans",
    estimatedWeight: 5
});
const cancelPending = pickup.cancelPickup(tempP.id, "citizen", "Citizen rescheduled");
step("Allowed: REQUESTED pickup successfully CANCELLED", cancelPending.success === true && cancelPending.pickup.status === "cancelled");

console.log("\n--- PHASE E: Admin Panel Oversight & Approval Audit Trail ---");
// 14. Admin authentication
const adminLogin = auth.login("admin@ekabadi.demo", "admin123");
step("Admin logs into Command Center", adminLogin.success && adminLogin.role === "admin");

// 15. Register applicant needing verification
const newApplicant = auth.register({
    role: "citizen",
    firstName: "Sunita",
    lastName: "Verma",
    email: "sunita.verma@demo.ekabadi",
    phone: "+91 91234 56789",
    password: "securepassword",
    address: "Flat 101, Supertech Capetown, Sector 74, Noida"
});
step("New applicant submitted registration (Status: pending_approval)", newApplicant.success && newApplicant.user.status === "pending_approval");

// 16. Pending applicant cannot log in
const blockedLogin = auth.login("sunita.verma@demo.ekabadi", "securepassword");
step("System forbids unapproved applicant from logging in", blockedLogin.success === false && blockedLogin.status === "pending_approval");

// 17. Admin reviews application and approves
const reviewResult = auth.reviewRegistration("citizen", newApplicant.citizen.id, "APPROVE", "Electricity bill and Aadhaar verified", "Bhavya Bothera (Super Admin)");
step("Admin approves application", reviewResult.success && reviewResult.action === "APPROVE");

// 18. Audit trail persistence
const auditDb = EKABADI_STORAGE.adapter.getCollection("approvalAuditTrail");
const auditRecord = auditDb.find(a => a.entityId === newApplicant.citizen.id);
step("Approval audit trail saved reviewer, action, reason, and timestamp",
    !!auditRecord && 
    auditRecord.reviewerName.includes("Bhavya Bothera") && 
    auditRecord.action === "APPROVE" && 
    auditRecord.reason.includes("Electricity bill") && 
    !!auditRecord.createdAt
);

// 19. Approved applicant now logs in
const unblockedLogin = auth.login("sunita.verma@demo.ekabadi", "securepassword");
step("Approved citizen successfully logs in to platform", unblockedLogin.success && unblockedLogin.session.loggedIn);

// 20. Sensitive Data Protection (Aadhaar & Bank)
const testAadhaar = utils.maskAadhaar("987654321099");
step("Aadhaar masked for citizen safety: " + testAadhaar, testAadhaar === "XXXX-XXXX-1099");
const testBank = utils.maskBankAccount("12345678901234");
step("Bank account masked for KYC security: " + testBank, testBank === "••••••••1234");

console.log("\n=======================================================");
console.log(`   FULL GOLDEN FLOW COMPLETED: ${passedCount}/${testsCount} STEPS PASSED   `);
console.log("=======================================================\n");
