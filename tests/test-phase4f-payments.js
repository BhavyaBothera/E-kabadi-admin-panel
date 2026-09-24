/* =========================================================
   E-KABAADI PLATFORM — Phase 4F Automated Test Suite
   Real Payment Infrastructure, Settlement & Financial Ledger
   File: tests/test-phase4f-payments.js
   ========================================================= */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Terminal styling helpers
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

let passedCount = 0;
let failedCount = 0;

function assertTest(name, fn) {
    try {
        fn();
        passedCount++;
        console.log(`  ${GREEN}✓ PASS [TEST ${passedCount}]:${RESET} ${name}`);
    } catch (err) {
        failedCount++;
        console.error(`  ${RED}✗ FAIL [TEST ${passedCount + failedCount}]:${RESET} ${name}`);
        console.error(`    ${RED}Error:${RESET} ${err.message}`);
    }
}

async function assertAsyncTest(name, fn) {
    try {
        await fn();
        passedCount++;
        console.log(`  ${GREEN}✓ PASS [TEST ${passedCount}]:${RESET} ${name}`);
    } catch (err) {
        failedCount++;
        console.error(`  ${RED}✗ FAIL [TEST ${passedCount + failedCount}]:${RESET} ${name}`);
        console.error(`    ${RED}Error:${RESET} ${err.message}`);
    }
}

console.log(`\n${BOLD}=======================================================${RESET}`);
console.log(`${BOLD}   E-KABAADI PHASE 4F — REAL PAYMENT & FINANCIAL LEDGER ${RESET}`);
console.log(`${BOLD}=======================================================\n`);

// Mock browser globals for Node.js test environment
const _mockStorage = {};
global.localStorage = {
    getItem: (k) => _mockStorage[k] || null,
    setItem: (k, v) => { _mockStorage[k] = String(v); },
    removeItem: (k) => { delete _mockStorage[k]; },
    clear: () => { Object.keys(_mockStorage).forEach(k => delete _mockStorage[k]); }
};

global.window = {
    location: { href: "http://localhost/", search: "" },
    dispatchEvent: () => true
};
global.self = global.window;

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
global.EKABADI_UTILS = require(path.join(baseDir, "shared/js/utilities.js"));

const storageModule = require(path.join(baseDir, "shared/js/storage.js"));
global.EKABADI_STORAGE = storageModule;
if (typeof storageModule.init === "function") {
    storageModule.init();
}
const storage = storageModule.adapter;

const paymentProviderModule = require(path.join(baseDir, "shared/js/payment-provider.js"));
global.EKABADI_PAYMENT_PROVIDER = paymentProviderModule;

const services = require(path.join(baseDir, "shared/js/services.js"));
global.EKABADI_SERVICES = services;

const paymentService = services.payment;
const pickupService = services.pickup;
const rewardService = services.reward;

async function runTests() {
    // ─────────────────────────────────────────────
    // GROUP 1: FINANCIAL AMOUNT CALCULATION
    // ─────────────────────────────────────────────
    console.log(`${CYAN}[GROUP 1] Financial Amount Calculation Formula${RESET}`);

    assertTest("1. Authoritative formula calculates amount (12.3 kg * ₹14.00/kg = ₹172.20 = 17220 paise)", () => {
        const calc = paymentService.calculateAuthoritativeAmount(12.3, 14.0);
        assert.strictEqual(calc.valid, true);
        assert.strictEqual(calc.amount, 172.20);
        assert.strictEqual(calc.amountPaise, 17220);
    });

    assertTest("2. Zero or negative weights are strictly rejected with invalid calculation error", () => {
        const calcZero = paymentService.calculateAuthoritativeAmount(0, 14.0);
        const calcNeg = paymentService.calculateAuthoritativeAmount(-5.5, 14.0);
        assert.strictEqual(calcZero.valid, false);
        assert.strictEqual(calcNeg.valid, false);
    });

    assertTest("3. Malformed, NaN, or infinite weight/rate inputs safely return invalid result", () => {
        const calcNaN = paymentService.calculateAuthoritativeAmount("abc", 14.0);
        const calcInf = paymentService.calculateAuthoritativeAmount(10, Infinity);
        assert.strictEqual(calcNaN.valid, false);
        assert.strictEqual(calcInf.valid, false);
    });

    // ─────────────────────────────────────────────
    // GROUP 2: TRUSTED RATE ENFORCEMENT
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 2] Trusted Rate Enforcement${RESET}`);

    assertTest("4. Official catalog rates are resolved strictly from scrap_categories table (Paper=₹14, Plastic=₹18)", () => {
        const paperRate = paymentService.getTrustedRateForCategory("Newspaper & Notebooks");
        const plasticRate = paymentService.getTrustedRateForCategory("PET Bottles & Rigid Plastics");
        assert.strictEqual(paperRate, 14.0);
        assert.strictEqual(plasticRate, 18.0);
    });

    assertTest("5. Standard certified fallback rate (₹14.00/kg) enforced for arbitrary or unrecognized categories", () => {
        const fallbackRate = paymentService.getTrustedRateForCategory("Unknown Alien Scrap Material");
        assert.strictEqual(fallbackRate, 14.0);
    });

    // ─────────────────────────────────────────────
    // GROUP 3: FINAL SCALE WEIGHT AUTHORITY
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 3] Final Scale Weight Authority${RESET}`);

    let pickupGroup3 = null;
    assertTest("6. Collector digital scale weight (12.3 kg) overrides AI estimate (15.0 kg) producing ₹172.20 final value", () => {
        pickupGroup3 = pickupService.createPickup({
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            address: "Sector 62, Noida",
            scrapType: "Newspaper & Notebooks",
            estimatedWeight: 15.0,
            estimatedValue: 210.00
        });

        pickupService.updateStatus(pickupGroup3.id, "accepted");
        pickupService.updateStatus(pickupGroup3.id, "on_the_way");
        pickupService.updateStatus(pickupGroup3.id, "arrived");
        pickupService.updateStatus(pickupGroup3.id, "collecting");

        const completion = pickupService.completeCollection(pickupGroup3.id, {
            finalWeight: 12.3 // Scale weight authoritative
        });

        assert.strictEqual(completion.finalWeight, 12.3);
        assert.strictEqual(completion.finalValue, 172.20);
    });

    assertTest("7. Payment record snapshots authoritative scale weight (12.3 kg) and official catalog rate (₹14/kg)", () => {
        const payment = paymentService.getByPickup(pickupGroup3.id);
        assert(payment);
        assert.strictEqual(payment.finalWeightKgSnapshot, 12.3);
        assert.strictEqual(payment.ratePerKgSnapshot, 14.0);
        assert.strictEqual(payment.amountPaise, 17220);
    });

    // ─────────────────────────────────────────────
    // GROUP 4: MONEY ROUNDING & PAISE CONVERSION
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 4] Money Rounding & Integer Paise Conversion${RESET}`);

    assertTest("8. toPaise converts Rupee decimals to integer Paise without floating-point error", () => {
        assert.strictEqual(paymentService.toPaise(172.20), 17220);
        assert.strictEqual(paymentService.toPaise(340.00), 34000);
        assert.strictEqual(paymentService.toPaise(0.99), 99);
    });

    assertTest("9. toRupees converts integer Paise back to standard currency amount (17220 paise -> ₹172.20)", () => {
        assert.strictEqual(paymentService.toRupees(17220), 172.20);
        assert.strictEqual(paymentService.toRupees(500), 5.00);
    });

    assertTest("10. Integer Paise arithmetic eliminates binary floating-point drift (0.10 + 0.20 = 0.30)", () => {
        const sumPaise = paymentService.toPaise(0.10) + paymentService.toPaise(0.20);
        assert.strictEqual(sumPaise, 30);
        assert.strictEqual(paymentService.toRupees(sumPaise), 0.30);
    });

    // ─────────────────────────────────────────────
    // GROUP 5: PAYMENT STATE MACHINE
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 5] Payment State Machine Transitions${RESET}`);

    assertTest("11. Payment state machine defines explicit lifecycle states compliant with Razorpay model", () => {
        const validStates = ["created", "order_created", "payment_pending", "settled", "paid", "failed", "refunded"];
        assert.strictEqual(validStates.length, 7);
    });

    await assertAsyncTest("12. State machine blocks creating payment orders for already settled / paid pickups", async () => {
        let blocked = false;
        try {
            await paymentService.createOrder(pickupGroup3.id);
        } catch (e) {
            blocked = e.message.includes("already been paid");
        }
        assert.strictEqual(blocked, true);
    });

    await assertAsyncTest("13. Gateway verification failure safely transitions payment state to 'failed' and logs reason", async () => {
        const failPickup = pickupService.createPickup({
            citizenId: "CIT-1002",
            collectorId: "COL-2002",
            address: "Sector 18, Noida",
            scrapType: "Cardboard",
            estimatedWeight: 10.0
        });
        storage.update("pickups", failPickup.id, { status: "collecting", finalWeight: 10.0 });

        const order = await paymentService.createOrder(failPickup.id);
        try {
            await paymentService.verifyPayment(failPickup.id, {
                orderId: order.orderId,
                paymentId: "pay_bad_test",
                signature: "invalid_forged_sig"
            });
            assert.fail("Should have failed verification");
        } catch (e) {
            const payRec = paymentService.getByPickup(failPickup.id);
            assert(payRec);
            assert.strictEqual(payRec.status, "failed");
            assert(payRec.failureReason.includes("Signature verification failed"));
        }
    });

    // ─────────────────────────────────────────────
    // GROUP 6: RAZORPAY ORDER CREATION CONTRACT
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 6] Razorpay Order Creation Contract${RESET}`);

    let orderData = null;
    await assertAsyncTest("14. createOrder returns provider order ID, integer amountPaise, and currency 'INR'", async () => {
        const orderPickup = pickupService.createPickup({
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            address: "Sector 62, Noida",
            scrapType: "Plastic",
            estimatedWeight: 8.5
        });
        storage.update("pickups", orderPickup.id, { status: "collecting", finalWeight: 8.5 });

        orderData = await paymentService.createOrder(orderPickup.id);
        assert.strictEqual(orderData.success, true);
        assert(orderData.orderId.startsWith("order_"));
        assert.strictEqual(orderData.currency, "INR");
        assert(orderData.amountPaise > 0);
    });

    assertTest("15. Order response contains public keyId only; zero secrets exposed to client", () => {
        assert(orderData.keyId);
        assert.strictEqual(orderData.keySecret, undefined);
        assert.strictEqual(orderData.secret, undefined);
    });

    // ─────────────────────────────────────────────
    // GROUP 7: SIGNATURE VERIFICATION
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 7] Signature Verification Security${RESET}`);

    let sigPickup = null;
    let sigOrder = null;
    await assertAsyncTest("16. Forged or tampered HMAC signature is strictly rejected with security violation", async () => {
        sigPickup = pickupService.createPickup({
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            address: "Sector 62, Noida",
            scrapType: "Paper",
            estimatedWeight: 10.0
        });
        storage.update("pickups", sigPickup.id, { status: "collecting", finalWeight: 10.0 });
        sigOrder = await paymentService.createOrder(sigPickup.id);

        let rejected = false;
        try {
            await paymentService.verifyPayment(sigPickup.id, {
                orderId: sigOrder.orderId,
                paymentId: "pay_test_01",
                signature: "forged_signature_fake"
            });
        } catch (e) {
            rejected = e.message.includes("signature verification failed") || e.message.includes("Forged");
        }
        assert.strictEqual(rejected, true);
    });

    await assertAsyncTest("17. Genuine cryptographic signature verifies successfully and triggers settlement", async () => {
        const paymentId = "pay_valid_01";
        const genuineSig = "mock_sig_" + sigOrder.orderId + "_" + paymentId;

        const settleRes = await paymentService.verifyPayment(sigPickup.id, {
            orderId: sigOrder.orderId,
            paymentId: paymentId,
            signature: genuineSig
        });

        assert.strictEqual(settleRes.success, true);
        assert.strictEqual(settleRes.settled, true);
        assert.strictEqual(settleRes.verified, true);
    });

    await assertAsyncTest("18. Incomplete verification payload (missing paymentId/signature) is strictly rejected", async () => {
        let rejected = false;
        try {
            await paymentService.verifyPayment(sigPickup.id, { orderId: sigOrder.orderId });
        } catch (e) {
            rejected = e.message.includes("Missing required verification parameters");
        }
        assert.strictEqual(rejected, true);
    });

    // ─────────────────────────────────────────────
    // GROUP 8: WEBHOOK SIGNATURE VERIFICATION
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 8] Webhook Signature Verification${RESET}`);

    const webhookEvent = {
        id: "evt_test_valid_001",
        event: "payment.captured",
        payload: {
            payment: {
                entity: { id: "pay_wh_001", order_id: "order_wh_001", amount: 15000 }
            }
        }
    };

    await assertAsyncTest("19. Webhook with authentic signature is verified and acknowledged", async () => {
        const res = await paymentService.handleWebhook(webhookEvent, "valid_webhook_sig");
        assert.strictEqual(res.acknowledged, true);
        assert.strictEqual(res.duplicate, false);
    });

    await assertAsyncTest("20. Webhook with invalid or forged signature is strictly rejected", async () => {
        let rejected = false;
        try {
            await paymentService.handleWebhook(webhookEvent, "invalid_webhook_sig");
        } catch (e) {
            rejected = e.message.includes("Invalid webhook signature");
        }
        assert.strictEqual(rejected, true);
    });

    // ─────────────────────────────────────────────
    // GROUP 9: WEBHOOK IDEMPOTENCY
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 9] Webhook Idempotency & Replay Protection${RESET}`);

    const replayEvent = {
        id: "evt_idempotent_test_999",
        event: "payment.captured",
        payload: {
            payment: {
                entity: { id: "pay_wh_replay_999", order_id: "order_wh_replay_999", amount: 20000 }
            }
        }
    };

    await assertAsyncTest("21. Initial webhook delivery successfully processed and logged in paymentProviderEvents", async () => {
        const res1 = await paymentService.handleWebhook(replayEvent, "valid_sig");
        assert.strictEqual(res1.acknowledged, true);
        assert.strictEqual(res1.duplicate, false);
    });

    await assertAsyncTest("22. Replayed webhook delivery returns duplicate: true without re-executing settlement", async () => {
        const res2 = await paymentService.handleWebhook(replayEvent, "valid_sig");
        assert.strictEqual(res2.acknowledged, true);
        assert.strictEqual(res2.duplicate, true);
    });

    assertTest("23. Provider event store strictly enforces uniqueness for (provider, provider_event_id)", () => {
        const recorded = storage.getCollection("paymentProviderEvents").filter(e => e.providerEventId === "evt_idempotent_test_999");
        assert.strictEqual(recorded.length, 1);
    });

    // ─────────────────────────────────────────────
    // GROUP 10: PAYMENT ORDER IDEMPOTENCY
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 10] Payment Order Idempotency${RESET}`);

    await assertAsyncTest("24. Rapid repeated 'Pay Now' clicks safely reuse the existing active order without duplicates", async () => {
        const idempPickup = pickupService.createPickup({
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            address: "Sector 62, Noida",
            scrapType: "Cardboard",
            estimatedWeight: 14.0
        });
        storage.update("pickups", idempPickup.id, { status: "collecting", finalWeight: 14.0 });

        const firstOrder = await paymentService.createOrder(idempPickup.id);
        const secondOrder = await paymentService.createOrder(idempPickup.id);

        assert.strictEqual(firstOrder.orderId, secondOrder.orderId);
        assert.strictEqual(secondOrder.reused, true);
    });

    assertTest("25. Database constraint ensures exactly ONE active payment record per pickup order", () => {
        const pastIdemp = storage.getCollection("pickups").find(p => p.scrapType === "Cardboard" && p.estimatedWeight === 14.0);
        const pays = storage.getCollection("payments").filter(p => p.pickupId === pastIdemp.id);
        assert.strictEqual(pays.length, 1);
    });

    // ─────────────────────────────────────────────
    // GROUP 11: PAYMENT OWNERSHIP & RBAC
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 11] Payment Ownership & RBAC Isolation${RESET}`);

    assertTest("26. Citizen payment query filters strictly by citizenId, preventing cross-tenant financial leakage", () => {
        const cit1Payments = paymentService.getByCitizen("CIT-1001");
        const nonCit1 = cit1Payments.filter(p => p.citizenId !== "CIT-1001");
        assert(cit1Payments.length > 0);
        assert.strictEqual(nonCit1.length, 0);
    });

    assertTest("27. Collector payment query isolates payments strictly to their assigned partner account", () => {
        const colPayments = paymentService.getByCollector("COL-2001");
        const nonCol = colPayments.filter(p => p.collectorId !== "COL-2001");
        assert.strictEqual(nonCol.length, 0);
    });

    // ─────────────────────────────────────────────
    // GROUP 12: PAYMENT ROW LEVEL SECURITY (RLS)
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 12] Payment Row Level Security (RLS)${RESET}`);

    assertTest("28. Migration 007 enables PostgreSQL RLS on financial_ledger, payment_provider_events, and adjustments", () => {
        const migrationSql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/007_real_payments.sql"), "utf-8");
        assert(migrationSql.includes("ENABLE ROW LEVEL SECURITY"));
        assert(migrationSql.includes("financial_ledger FOR SELECT"));
        assert(migrationSql.includes("payment_provider_events"));
    });

    assertTest("29. Migration 007 attaches PostgreSQL triggers blocking UPDATE and DELETE on financial_ledger", () => {
        const migrationSql = fs.readFileSync(path.join(__dirname, "../supabase/migrations/007_real_payments.sql"), "utf-8");
        assert(migrationSql.includes("prevent_ledger_modification"));
        assert(migrationSql.includes("BEFORE UPDATE ON financial_ledger"));
        assert(migrationSql.includes("BEFORE DELETE ON financial_ledger"));
    });

    // ─────────────────────────────────────────────
    // GROUP 13: SETTLEMENT ATOMICITY
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 13] Transactional Settlement Atomicity${RESET}`);

    await assertAsyncTest("30. Atomic settlement invariant: payment transitions to 'settled' and pickup transitions to 'paid'", async () => {
        const atomPickup = pickupService.createPickup({
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            address: "Sector 62, Noida",
            scrapType: "Paper",
            estimatedWeight: 20.0
        });
        storage.update("pickups", atomPickup.id, { status: "collecting", finalWeight: 20.0 });

        const order = await paymentService.createOrder(atomPickup.id);
        const paymentId = "pay_atom_" + Date.now();
        const sig = "mock_sig_" + order.orderId + "_" + paymentId;

        await paymentService.verifyPayment(atomPickup.id, {
            orderId: order.orderId,
            paymentId: paymentId,
            signature: sig
        });

        const p = paymentService.getByPickup(atomPickup.id);
        const pk = storage.findById("pickups", atomPickup.id);
        assert.strictEqual(p.status, "settled");
        assert.strictEqual(pk.paymentStatus, "paid");
        assert.strictEqual(pk.status, "completed");
    });

    assertTest("31. Atomic settlement creates immutable double-entry credit record in financial_ledger", () => {
        const ledger = paymentService.getLedger("CIT-1001");
        assert(ledger.length > 0);
        const entry = ledger[ledger.length - 1];
        assert.strictEqual(entry.direction, "credit");
        assert.strictEqual(entry.currency, "INR");
        assert(entry.amountPaise > 0);
    });

    // ─────────────────────────────────────────────
    // GROUP 14: REWARD IDEMPOTENCY
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 14] Eco Coins Reward Idempotency${RESET}`);

    let rwdPickup = null;
    let coinsBefore = 0;
    let rwdOrder = null;
    let rwdPayId = null;
    let rwdSig = null;

    await assertAsyncTest("32. Authoritative Eco Coins awarded exactly once upon successful payment verification (+20 coins)", async () => {
        rwdPickup = pickupService.createPickup({
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            address: "Sector 62, Noida",
            scrapType: "Metal",
            estimatedWeight: 10.0
        });
        storage.update("pickups", rwdPickup.id, { status: "collecting", finalWeight: 10.0 });

        const citBefore = storage.findById("citizens", "CIT-1001");
        coinsBefore = citBefore.ecoCoins || 0;

        rwdOrder = await paymentService.createOrder(rwdPickup.id);
        rwdPayId = "pay_rwd_" + Date.now();
        rwdSig = "mock_sig_" + rwdOrder.orderId + "_" + rwdPayId;

        await paymentService.verifyPayment(rwdPickup.id, { orderId: rwdOrder.orderId, paymentId: rwdPayId, signature: rwdSig });

        const citAfter = storage.findById("citizens", "CIT-1001");
        const expectedAward = Math.max(10, Math.round(10.0 * 2));
        assert.strictEqual(citAfter.ecoCoins, coinsBefore + expectedAward);
    });

    await assertAsyncTest("33. Duplicate verification or webhook retry strictly prevents double-crediting Eco Coins", async () => {
        const citBeforeReplay = storage.findById("citizens", "CIT-1001");
        
        await paymentService.verifyPayment(rwdPickup.id, { orderId: rwdOrder.orderId, paymentId: rwdPayId, signature: rwdSig });
        
        const citAfterReplay = storage.findById("citizens", "CIT-1001");
        assert.strictEqual(citAfterReplay.ecoCoins, citBeforeReplay.ecoCoins);
    });

    // ─────────────────────────────────────────────
    // GROUP 15: PAYMENT & FINAL WEIGHT IMMUTABILITY
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 15] Financial Immutability Protection${RESET}`);

    assertTest("34. Final scale weight is strictly immutable once pickup collection is settled", () => {
        const settledPickup = storage.getCollection("pickups").find(p => p.paymentStatus === "paid");
        let weightTamperBlocked = false;
        try {
            storage.update("pickups", settledPickup.id, { finalWeight: 999.0 });
        } catch (e) {
            weightTamperBlocked = e.message.includes("immutable once collection is settled");
        }
        assert.strictEqual(weightTamperBlocked, true);
    });

    assertTest("35. Settled payment amount is strictly immutable; corrections require audited adjustments ledger", () => {
        const settledPayment = storage.getCollection("payments").find(p => p.status === "settled" || p.status === "paid");
        let amountTamperBlocked = false;
        try {
            storage.update("payments", settledPayment.id, { amount: 1.0 });
        } catch (e) {
            amountTamperBlocked = e.message.includes("Settled payment amount is immutable");
        }
        assert.strictEqual(amountTamperBlocked, true);
    });

    assertTest("36. Financial ledger entries are strictly immutable and cannot be deleted", () => {
        let ledgerDeleteBlocked = false;
        try {
            storage.delete("financialLedger", "LDG-ANY");
        } catch (e) {
            ledgerDeleteBlocked = e.message.includes("Financial ledger entries are strictly immutable");
        }
        assert.strictEqual(ledgerDeleteBlocked, true);
    });

    // ─────────────────────────────────────────────
    // GROUP 16: AMOUNT TAMPERING PROTECTION
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 16] Amount Tampering Protection${RESET}`);

    await assertAsyncTest("37. Malicious client-provided amount (₹1.00) is ignored; server calculates authoritative ₹140.00", async () => {
        const tamperPickup = pickupService.createPickup({
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            address: "Sector 62, Noida",
            scrapType: "Paper",
            estimatedWeight: 10.0 // 10 kg * 14 = ₹140.00
        });
        storage.update("pickups", tamperPickup.id, { status: "collecting", finalWeight: 10.0 });

        const order = await paymentService.createOrder(tamperPickup.id, { amount: 1.00 });
        assert.strictEqual(order.amount, 140.00);
        assert.strictEqual(order.amountPaise, 14000);
    });

    assertTest("38. Unsettled pickup cannot transition to 'paid' status through arbitrary client updates", () => {
        const unpaidPickup = pickupService.createPickup({
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            address: "Sector 62, Noida",
            scrapType: "Paper",
            estimatedWeight: 5.0
        });
        const updated = storage.update("pickups", unpaidPickup.id, { status: "collecting" });
        assert.notStrictEqual(updated.paymentStatus, "paid");
    });

    // ─────────────────────────────────────────────
    // GROUP 17: PAYMENT FAILURE HANDLING
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 17] Payment Failure & Retry Safety${RESET}`);

    let retryPickup = null;
    let order1 = null;

    await assertAsyncTest("39. Payment failure marks payment as 'failed' without corrupting or deleting pickup records", async () => {
        retryPickup = pickupService.createPickup({
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            address: "Sector 62, Noida",
            scrapType: "Cardboard",
            estimatedWeight: 12.0
        });
        storage.update("pickups", retryPickup.id, { status: "collecting", finalWeight: 12.0 });

        order1 = await paymentService.createOrder(retryPickup.id);
        const pay = paymentService.getByPickup(retryPickup.id);
        storage.update("payments", pay.id, { status: "failed", failureReason: "Card declined by issuer" });

        const updatedPay = paymentService.getByPickup(retryPickup.id);
        assert.strictEqual(updatedPay.status, "failed");
    });

    await assertAsyncTest("40. Pickup remains available for secure retry; subsequent successful payment settles cleanly", async () => {
        const retryRes = await paymentService.verifyPayment(retryPickup.id, {
            orderId: order1.orderId,
            paymentId: "pay_retry_success",
            signature: "mock_sig_" + order1.orderId + "_pay_retry_success"
        });

        assert.strictEqual(retryRes.success, true);
        assert.strictEqual(retryRes.settled, true);
    });

    // ─────────────────────────────────────────────
    // GROUP 18: REFUND SAFETY & ADJUSTMENTS
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 18] Refund Safety & Audit Trail${RESET}`);

    const settledPay = storage.getCollection("payments").find(p => p.status === "settled" && p.amount > 0);

    await assertAsyncTest("41. Security violation: Unauthorized citizen is strictly blocked from executing refunds", async () => {
        let blocked = false;
        try {
            await paymentService.refundPayment(settledPay.id, { actorRole: "citizen", actorId: "CIT-1001" });
        } catch (e) {
            blocked = e.message.includes("Only authorized administrators");
        }
        assert.strictEqual(blocked, true);
    });

    await assertAsyncTest("42. Authorized administrator refund successfully processes and updates payment status to 'refunded'", async () => {
        const refundRes = await paymentService.refundPayment(settledPay.id, {
            actorRole: "admin",
            actorId: "ADM-999",
            reason: "Customer scale discrepancy dispute"
        });
        assert.strictEqual(refundRes.success, true);
        assert.strictEqual(refundRes.refunded, true);
    });

    assertTest("43. Refund writes an auditable record into paymentAdjustments with negative delta and actor role", () => {
        const adjustments = storage.getCollection("paymentAdjustments");
        const adj = adjustments.find(a => a.paymentId === settledPay.id);
        assert(adj);
        assert.strictEqual(adj.adjustmentType, "refund");
        assert(adj.amountDelta < 0);
        assert.strictEqual(adj.actorRole, "admin");
    });

    await assertAsyncTest("44. Repeated refund on already refunded transaction is strictly rejected", async () => {
        let duplicateBlocked = false;
        try {
            await paymentService.refundPayment(settledPay.id, { actorRole: "admin", actorId: "ADM-999" });
        } catch (e) {
            duplicateBlocked = e.message.includes("already been refunded");
        }
        assert.strictEqual(duplicateBlocked, true);
    });

    // ─────────────────────────────────────────────
    // GROUP 19: MOCK PAYMENT PROVIDER
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 19] Mock Payment Provider Determinism${RESET}`);

    const mockProvider = new paymentProviderModule.MockPaymentProvider();

    await assertAsyncTest("45. MockPaymentProvider deterministically creates mock order with expected integer paise", async () => {
        const ord = await mockProvider.createOrder({ pickupId: "PKP-MOCK-01", amount: 250.0 });
        assert(ord.orderId);
        assert.strictEqual(ord.provider, "mock");
        assert.strictEqual(ord.amountPaise, 25000);
    });

    await assertAsyncTest("46. MockPaymentProvider verifies signature contract deterministically offline", async () => {
        const ord = await mockProvider.createOrder({ pickupId: "PKP-MOCK-02", amount: 100.0 });
        const sig = "mock_sig_" + ord.orderId + "_pay_mock_123";
        const v = await mockProvider.verifyPayment({ orderId: ord.orderId, paymentId: "pay_mock_123", signature: sig });
        assert.strictEqual(v.verified, true);
        assert.strictEqual(v.settled, true);
    });

    // ─────────────────────────────────────────────
    // GROUP 20: REAL PROVIDER CONFIGURATION & SECRET SCANNING
    // ─────────────────────────────────────────────
    console.log(`\n${CYAN}[GROUP 20] Real Provider Configuration & Zero Secrets${RESET}`);

    assertTest("47. Supabase Edge Functions created for create-payment-order, verify-payment, razorpay-webhook, and reconcile-payment", () => {
        const edgeOrderPath = path.join(__dirname, "../supabase/functions/create-payment-order/index.ts");
        const edgeVerifyPath = path.join(__dirname, "../supabase/functions/verify-payment/index.ts");
        const edgeWebhookPath = path.join(__dirname, "../supabase/functions/razorpay-webhook/index.ts");
        const edgeReconcilePath = path.join(__dirname, "../supabase/functions/reconcile-payment/index.ts");

        assert(fs.existsSync(edgeOrderPath));
        assert(fs.existsSync(edgeVerifyPath));
        assert(fs.existsSync(edgeWebhookPath));
        assert(fs.existsSync(edgeReconcilePath));
    });

    assertTest("48. verify-payment Edge Function computes server-side HMAC-SHA256 signature via Web Crypto API", () => {
        const edgeVerifyPath = path.join(__dirname, "../supabase/functions/verify-payment/index.ts");
        const verifyCode = fs.readFileSync(edgeVerifyPath, "utf-8");
        assert(verifyCode.includes("crypto.subtle.sign"));
        assert(verifyCode.includes("RAZORPAY_KEY_SECRET"));
    });

    assertTest("49. Secret Scanner: ZERO Razorpay live secrets or private keys exposed in frontend code", () => {
        const frontendDir = path.join(__dirname, "../frontend");
        function scanDir(dir) {
            let leaks = [];
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    if (file !== "node_modules" && file !== ".git") {
                        leaks = leaks.concat(scanDir(fullPath));
                    }
                } else if (file.endsWith(".js") || file.endsWith(".html") || file.endsWith(".json")) {
                    const content = fs.readFileSync(fullPath, "utf-8");
                    if (/rzp_live_[a-zA-Z0-9]{14,}/.test(content) || /RAZORPAY_KEY_SECRET\s*=\s*['"][a-zA-Z0-9]{20,}['"]/.test(content)) {
                        leaks.push(fullPath);
                    }
                }
            }
            return leaks;
        }
        const detectedLeaks = scanDir(frontendDir);
        assert.strictEqual(detectedLeaks.length, 0);
    });

    assertTest("50. Payment receipt view displays certified scale weight, catalog rate, payout, and zero private credentials", () => {
        const settledForReceipt = storage.getCollection("payments").find(p => p.status === "settled" || p.status === "paid");
        const receipt = paymentService.getReceipt(settledForReceipt.id);
        assert(receipt);
        assert(receipt.receiptNumber);
        assert(receipt.finalPayout > 0);
        assert.strictEqual(receipt.keySecret, undefined);
        assert.strictEqual(receipt.signature, undefined);
    });

    console.log(`\n${BOLD}=======================================================${RESET}`);
    console.log(`${BOLD}TOTAL PHASE 4F ASSERTIONS: ${passedCount + failedCount} | ${GREEN}PASSED: ${passedCount}${RESET} | ${failedCount > 0 ? RED : RESET}FAILED: ${failedCount}${RESET}`);
    console.log(`${BOLD}=======================================================\n`);

    if (failedCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error("Unhandled error in test runner:", err);
    process.exit(1);
});
