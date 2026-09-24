/* =========================================================
   E-KABAADI PLATFORM — Phase 4G Automated Test Suite
   Real-Time Notifications, Communication & Event Intelligence
   File: tests/test-phase4g-notifications.js
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
console.log(`${BOLD}   E-KABAADI PHASE 4G — NOTIFICATIONS & EVENT SYSTEM  ${RESET}`);
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
    dispatchEvent: () => {}
};
global.self = global.window;
global.CustomEvent = class CustomEvent {
    constructor(name, detail) { this.type = name; this.detail = detail; }
};

const baseDir = path.resolve(__dirname, "../frontend");

// Load mock datasets
global.MOCK_USERS = require(path.join(baseDir, "data/mock-users.js"));
global.MOCK_CITIZENS = require(path.join(baseDir, "data/mock-citizens.js"));
global.MOCK_COLLECTORS = require(path.join(baseDir, "data/mock-collectors.js"));
global.MOCK_PICKUPS = require(path.join(baseDir, "data/mock-pickups.js"));
global.MOCK_PAYMENTS = require(path.join(baseDir, "data/mock-payments.js"));
global.MOCK_REWARDS = require(path.join(baseDir, "data/mock-rewards.js"));
global.MOCK_NOTIFICATIONS = require(path.join(baseDir, "data/mock-notifications.js"));
global.MOCK_SCRAP = require(path.join(baseDir, "data/mock-scrap.js"));

// Load core services
const storageModule = require(path.join(baseDir, "shared/js/storage.js"));
global.EKABADI_STORAGE = storageModule;
if (typeof storageModule.init === "function") {
    storageModule.init();
}
const storage = storageModule.adapter;
const notificationEngine = require(path.join(baseDir, "shared/js/notification-engine.js"));
global.notificationEngine = notificationEngine;

const servicesExports = require(path.join(baseDir, "shared/js/services.js"));
const notificationService = servicesExports.notification;
const pickupService = servicesExports.pickup;
const paymentService = servicesExports.payment;
const rewardService = servicesExports.reward;
const supportService = servicesExports.support;

(async function runPhase4GTests() {

    // [GROUP 1] Business Event Model & Validation
    console.log(`\n${CYAN}[GROUP 1] Business Event Model & Validation${RESET}`);

    assertTest("1. createBusinessEvent constructs standard event structure with valid event type", () => {
        const evt = notificationEngine.createBusinessEvent("PICKUP_CREATED", "pickups", "PK-TEST-101", {
            citizenId: "USR-CIT-001",
            collectorName: "Ramesh Kumar",
            scheduledDate: "2026-09-25"
        });
        assert.ok(evt.id.startsWith("EVT-"), "Event ID should start with EVT-");
        assert.strictEqual(evt.eventType, "PICKUP_CREATED");
        assert.strictEqual(evt.aggregateType, "pickups");
        assert.strictEqual(evt.aggregateId, "PK-TEST-101");
        assert.ok(evt.createdAt, "Event must have createdAt timestamp");
    });

    assertTest("2. createBusinessEvent rejects invalid or unregistered event types", () => {
        assert.throws(() => {
            notificationEngine.createBusinessEvent("UNKNOWN_ARBITRARY_ACTION", "pickups", "PK-001");
        }, /Invalid business event type/);
    });

    assertTest("3. Event catalog defines all standard Phase 4G lifecycle events", () => {
        const types = notificationEngine.EVENT_TYPES;
        assert.ok(types.PICKUP_CREATED, "PICKUP_CREATED required");
        assert.ok(types.PICKUP_ACCEPTED, "PICKUP_ACCEPTED required");
        assert.ok(types.PICKUP_COMPLETED, "PICKUP_COMPLETED required");
        assert.ok(types.PAYMENT_SETTLED, "PAYMENT_SETTLED required");
        assert.ok(types.PAYMENT_FAILED, "PAYMENT_FAILED required");
        assert.ok(types.REWARD_CREDITED, "REWARD_CREDITED required");
        assert.ok(types.ACCOUNT_APPROVED, "ACCOUNT_APPROVED required");
        assert.ok(types.ISSUE_CREATED, "ISSUE_CREATED required");
    });

    // [GROUP 2] Secret Scanning in Event Payloads
    console.log(`\n${CYAN}[GROUP 2] Secret Scanning in Event Payloads${RESET}`);

    assertTest("4. Event building rejects or strictly omits sensitive credentials from metadata", () => {
        const sensitivePayload = {
            citizenId: "USR-CIT-001",
            amount: 172.20,
            razorpaySecret: "rzp_test_secret_12345",
            cardPin: "9988",
            passwordHash: "$2a$12$eW6u..."
        };
        const evt = notificationEngine.createBusinessEvent("PAYMENT_SETTLED", "payments", "PAY-99", sensitivePayload);
        const notif = notificationEngine.buildNotification(evt, { userId: "USR-CIT-001", targetRole: "citizen" });
        assert.strictEqual(notif.metadata.razorpaySecret, undefined, "Secrets must not be stored in metadata");
        assert.strictEqual(notif.metadata.cardPin, undefined, "Card PIN must not be stored in metadata");
        assert.ok(!notif.message.includes("rzp_test_secret_12345"), "Message must not leak secrets");
    });

    // [GROUP 3] Notification Policy & Recipient Resolution
    console.log(`\n${CYAN}[GROUP 3] Notification Policy & Recipient Resolution${RESET}`);

    assertTest("5. Policy resolves both citizen confirmation and selected collector dispatch for PICKUP_CREATED", () => {
        const evt = notificationEngine.createBusinessEvent("PICKUP_CREATED", "pickups", "PK-9001", {
            citizenId: "USR-CIT-001",
            selectedCollectorId: "USR-COL-001",
            locality: "Sector 62, Noida"
        });
        const recipients = notificationEngine.policyEngine.resolveRecipients(evt);
        assert.strictEqual(recipients.length, 2, "Must resolve exactly citizen and selected collector");
        const citizenRecip = recipients.find(r => r.role === "citizen");
        const collectorRecip = recipients.find(r => r.role === "collector");
        assert.strictEqual(citizenRecip.userId, "USR-CIT-001");
        assert.strictEqual(collectorRecip.userId, "USR-COL-001");
    });

    assertTest("6. Selected collector policy strictly prevents broadcast to unselected collectors", () => {
        const evt = notificationEngine.createBusinessEvent("PICKUP_CREATED", "pickups", "PK-9002", {
            citizenId: "USR-CIT-001",
            selectedCollectorId: "USR-COL-002",
            locality: "Sector 18, Noida"
        });
        const recipients = notificationEngine.policyEngine.resolveRecipients(evt);
        const otherCollectors = recipients.filter(r => r.role === "collector" && r.userId !== "USR-COL-002");
        assert.strictEqual(otherCollectors.length, 0, "Unselected collectors must never receive request");
    });

    assertTest("7. PAYMENT_RECONCILIATION_REQUIRED routes exclusively to admin with critical priority", () => {
        const evt = notificationEngine.createBusinessEvent("PAYMENT_RECONCILIATION_REQUIRED", "payments", "PAY-ERR-1", {
            paymentId: "PAY-ERR-1",
            reason: "Gateway amount mismatch"
        });
        const recipients = notificationEngine.policyEngine.resolveRecipients(evt);
        assert.strictEqual(recipients.length, 1);
        assert.strictEqual(recipients[0].role, "admin");
        assert.strictEqual(recipients[0].priority, "critical");
    });

    // [GROUP 4] Transactional vs Optional Notification Rules
    console.log(`\n${CYAN}[GROUP 4] Transactional vs Optional Notification Rules${RESET}`);

    assertTest("8. Core lifecycle events are classified as transactional (non-opt-outable)", () => {
        const policy = notificationEngine.policyEngine;
        assert.strictEqual(policy.isTransactional("PICKUP_CREATED"), true);
        assert.strictEqual(policy.isTransactional("PAYMENT_SETTLED"), true);
        assert.strictEqual(policy.isTransactional("ACCOUNT_APPROVED"), true);
        assert.strictEqual(policy.isTransactional("ISSUE_RESOLVED"), true);
    });

    assertTest("9. Marketing and optional announcements are classified as non-transactional", () => {
        const policy = notificationEngine.policyEngine;
        assert.strictEqual(policy.isTransactional("MARKETING_PROMOTION"), false);
        assert.strictEqual(policy.isTransactional("WEEKLY_TIP"), false);
    });

    // [GROUP 5] Quiet Hours Evaluation
    console.log(`\n${CYAN}[GROUP 5] Quiet Hours Evaluation${RESET}`);

    assertTest("10. Quiet hours suppresses non-critical events during active window (e.g. 23:30)", () => {
        const prefs = { quietHoursEnabled: true, quietHoursStart: "22:00", quietHoursEnd: "07:00" };
        const nightTime = new Date("2026-09-24T23:30:00");
        assert.strictEqual(notificationEngine.policyEngine.isInQuietHours(prefs, nightTime), true);
    });

    assertTest("11. Daytime events (e.g. 14:00) operate normally outside quiet hours", () => {
        const prefs = { quietHoursEnabled: true, quietHoursStart: "22:00", quietHoursEnd: "07:00" };
        const dayTime = new Date("2026-09-24T14:00:00");
        assert.strictEqual(notificationEngine.policyEngine.isInQuietHours(prefs, dayTime), false);
    });

    // [GROUP 6] Location Privacy Sanitization
    console.log(`\n${CYAN}[GROUP 6] Location Privacy Sanitization${RESET}`);

    assertTest("12. sanitizeLocationForNotification strips private apartment numbers and exposes only locality", () => {
        const rawAddress = "Flat B-402, Green Valley Apartments, Sector 62, Noida, Uttar Pradesh 201309";
        const sanitized = notificationEngine.sanitizeLocationForNotification(rawAddress);
        assert.strictEqual(sanitized, "Sector 62", "Must extract clean neighborhood locality");
        assert.ok(!sanitized.includes("B-402"), "Door/flat number must not be exposed");
        assert.ok(!sanitized.includes("Green Valley"), "Apartment name should be omitted from title/preview");
    });

    assertTest("13. Notification preview preserves location privacy for pickup alerts", () => {
        const evt = notificationEngine.createBusinessEvent("PICKUP_ON_THE_WAY", "pickups", "PK-999", {
            citizenId: "USR-CIT-001",
            collectorName: "Ramesh Kumar",
            pickupAddress: "Flat 12A, Tower 4, Sector 62, Noida"
        });
        const notif = notificationEngine.buildNotification(evt, { userId: "USR-CIT-001", targetRole: "citizen" });
        assert.ok(!notif.message.includes("Flat 12A"), "Doorstep number must not appear in notification body");
        assert.ok(notif.message.includes("Sector 62"), "Locality must be present for context");
    });

    // [GROUP 7] Payment Privacy Enforcement
    console.log(`\n${CYAN}[GROUP 7] Payment Privacy Enforcement${RESET}`);

    assertTest("14. formatSafePayout formats rupee currency amounts safely", () => {
        assert.strictEqual(notificationEngine.formatSafePayout(172.2), "₹172.20");
        assert.strictEqual(notificationEngine.formatSafePayout("500"), "₹500.00");
        assert.strictEqual(notificationEngine.formatSafePayout(NaN), "₹0.00");
    });

    assertTest("15. Payment settlement notification shows payout amount without exposing bank account or UPI secrets", () => {
        const evt = notificationEngine.createBusinessEvent("PAYMENT_SETTLED", "payments", "PAY-88", {
            citizenId: "USR-CIT-001",
            pickupId: "PK-100",
            amount: 172.20,
            bankAccount: "123456789012",
            upiPin: "1234"
        });
        const notif = notificationEngine.buildNotification(evt, { userId: "USR-CIT-001", targetRole: "citizen" });
        assert.ok(notif.message.includes("₹172.20"), "Must contain safe formatted amount");
        assert.ok(!notif.message.includes("123456789012"), "Must not leak bank account number");
        assert.ok(!notif.message.includes("1234"), "Must not leak PIN");
    });

    // [GROUP 8] XSS Prevention & Template Interpolation
    console.log(`\n${CYAN}[GROUP 8] XSS Prevention & Template Interpolation${RESET}`);

    assertTest("16. Template interpolation HTML-escapes script tags in dynamic variables", () => {
        const evt = notificationEngine.createBusinessEvent("PICKUP_CANCELLED", "pickups", "PK-XSS", {
            citizenId: "USR-CIT-001",
            pickupId: "PK-XSS",
            reason: "<script>alert('pwned')</script>"
        });
        const notif = notificationEngine.buildNotification(evt, { userId: "USR-CIT-001", targetRole: "citizen" });
        assert.ok(!notif.message.includes("<script>"), "Script tags must be escaped");
        assert.ok(notif.message.includes("&lt;script&gt;"), "Must contain escaped HTML entities");
    });

    assertTest("17. Template interpolation safely handles quotes, ampersands, and angle brackets", () => {
        const escaped = notificationEngine.escapeHtml("A & B < C > 'D' \"E\"");
        assert.strictEqual(escaped, "A &amp; B &lt; C &gt; &#39;D&#39; &quot;E&quot;");
    });

    // [GROUP 9] Internal Action URL & Open Redirect Defense
    console.log(`\n${CYAN}[GROUP 9] Internal Action URL & Open Redirect Defense${RESET}`);

    assertTest("18. Relative internal routes are permitted as action URLs", () => {
        assert.strictEqual(notificationEngine.sanitizeActionUrl("tracking.html"), "tracking.html");
        assert.strictEqual(notificationEngine.sanitizeActionUrl("payments.html?id=123"), "payments.html?id=123");
    });

    assertTest("19. External URLs and protocol schemes are blocked to prevent open redirects", () => {
        assert.strictEqual(notificationEngine.sanitizeActionUrl("https://evil.com"), "");
        assert.strictEqual(notificationEngine.sanitizeActionUrl("http://phishing.site"), "");
        assert.strictEqual(notificationEngine.sanitizeActionUrl("//evil.com/redirect"), "");
        assert.strictEqual(notificationEngine.sanitizeActionUrl("javascript:alert(1)"), "");
    });

    // [GROUP 10] Notification Idempotency & Deduplication
    console.log(`\n${CYAN}[GROUP 10] Notification Idempotency & Deduplication${RESET}`);

    await assertAsyncTest("20. dispatchEvent generates unique idempotencyKey based on event, entity, and recipient", async () => {
        const evt = notificationEngine.createBusinessEvent("PICKUP_ARRIVED", "pickups", "PK-IDMP-1", {
            citizenId: "USR-CIT-001"
        });
        const result = await notificationEngine.dispatchEvent(evt, storage, false);
        assert.strictEqual(result.notificationsCreated.length, 1);
        const notif = result.notificationsCreated[0];
        assert.ok(notif.idempotencyKey.includes("PICKUP_ARRIVED"), "Key must include event type");
        assert.ok(notif.idempotencyKey.includes("PK-IDMP-1"), "Key must include aggregate ID");
    });

    await assertAsyncTest("21. Dispatching the same event twice returns duplicate flag without adding second record", async () => {
        const evt = notificationEngine.createBusinessEvent("PICKUP_ARRIVED", "pickups", "PK-IDMP-1", {
            citizenId: "USR-CIT-001"
        });
        const result2 = await notificationEngine.dispatchEvent(evt, storage, false);
        assert.strictEqual(result2.notificationsCreated[0].duplicate, true, "Second dispatch must be flagged as duplicate");
    });

    assertTest("22. notificationService.create rejects duplicate insertion when idempotencyKey exists", () => {
        const testKey = "idmp:test:unique:" + Date.now();
        const first = notificationService.create({
            userId: "USR-CIT-001",
            title: "First Notification",
            message: "Initial",
            idempotencyKey: testKey
        });
        assert.strictEqual(first.duplicate, undefined);

        const second = notificationService.create({
            userId: "USR-CIT-001",
            title: "Duplicate Attempt",
            message: "Should be skipped",
            idempotencyKey: testKey
        });
        assert.strictEqual(second.duplicate, true);
    });

    // [GROUP 11] Notification Ownership & Tenant Isolation
    console.log(`\n${CYAN}[GROUP 11] Notification Ownership & Tenant Isolation${RESET}`);

    assertTest("23. getForUser filters strictly by recipient userId, preventing cross-tenant leakage", () => {
        notificationService.create({ userId: "USR-CIT-TEST-A", title: "Notice A", message: "Private A" });
        notificationService.create({ userId: "USR-CIT-TEST-B", title: "Notice B", message: "Private B" });

        const notifsA = notificationService.getForUser("USR-CIT-TEST-A");
        const notifsB = notificationService.getForUser("USR-CIT-TEST-B");

        assert.ok(notifsA.every(n => n.userId === "USR-CIT-TEST-A"), "User A should see only their own");
        assert.ok(notifsB.every(n => n.userId === "USR-CIT-TEST-B"), "User B should see only their own");
        assert.ok(!notifsA.some(n => n.userId === "USR-CIT-TEST-B"), "User A must never see User B notices");
    });

    assertTest("24. getForUser with empty or null userId returns safe empty list", () => {
        assert.deepStrictEqual(notificationService.getForUser(null), []);
        assert.deepStrictEqual(notificationService.getForUser(""), []);
    });

    // [GROUP 12] Notification Immutability Trigger & Guards
    console.log(`\n${CYAN}[GROUP 12] Notification Immutability Trigger & Guards${RESET}`);

    assertTest("25. Modifying notification userId during update is rejected with security violation", () => {
        const notif = notificationService.create({ userId: "USR-CIT-001", title: "Immutable Test" });
        assert.throws(() => {
            storage.update("notifications", notif.id, { userId: "USR-CIT-ATTACKER" });
        }, /Security violation: Notification recipient is immutable/);
    });

    assertTest("26. Modifying notification eventType during update is rejected with security violation", () => {
        const notif = notificationService.create({ userId: "USR-CIT-001", eventType: "PICKUP_ACCEPTED", title: "Event Test" });
        assert.throws(() => {
            storage.update("notifications", notif.id, { eventType: "PAYMENT_SETTLED" });
        }, /Security violation: Notification event type is immutable/);
    });

    assertTest("27. Modifying notification idempotencyKey during update is rejected with security violation", () => {
        const notif = notificationService.create({ userId: "USR-CIT-001", idempotencyKey: "idmp:orig:1", title: "Key Test" });
        assert.throws(() => {
            storage.update("notifications", notif.id, { idempotencyKey: "idmp:tampered:2" });
        }, /Security violation: Notification idempotency key is immutable/);
    });

    // [GROUP 13] Mark-as-Read Authorization
    console.log(`\n${CYAN}[GROUP 13] Mark-as-Read Authorization${RESET}`);

    assertTest("28. Legitimate owner can mark their own notification as read", () => {
        const notif = notificationService.create({ userId: "USR-CIT-OWNER", title: "Read Test" });
        assert.strictEqual(notif.read, false);
        const updated = notificationService.markAsRead(notif.id, "USR-CIT-OWNER");
        assert.strictEqual(updated.read, true);
        assert.strictEqual(updated.status, "read");
        assert.ok(updated.readAt, "Must record readAt timestamp");
    });

    assertTest("29. Unauthorized user attempting to mark another user's notification as read is rejected", () => {
        const notif = notificationService.create({ userId: "USR-CIT-VICTIM", title: "Private Alert" });
        assert.throws(() => {
            notificationService.markAsRead(notif.id, "USR-CIT-ATTACKER");
        }, /Security violation: Cannot mark another user's notification as read/);
    });

    assertTest("30. markAllAsRead scopes read updates strictly to specified user ID", () => {
        const n1 = notificationService.create({ userId: "USR-BULK-1", title: "Bulk 1" });
        const n2 = notificationService.create({ userId: "USR-BULK-2", title: "Bulk 2" });
        notificationService.markAllAsRead("USR-BULK-1");

        const updatedN1 = storage.findById("notifications", n1.id);
        const updatedN2 = storage.findById("notifications", n2.id);

        assert.strictEqual(updatedN1.read, true, "User 1 notif must be marked read");
        assert.strictEqual(updatedN2.read, false, "User 2 notif must remain unread");
    });

    // [GROUP 14] Deletion Protection
    console.log(`\n${CYAN}[GROUP 14] Deletion Protection${RESET}`);

    assertTest("31. Attempting to delete a notification record throws security violation error", () => {
        const notif = notificationService.create({ userId: "USR-CIT-001", title: "Audit Trail Record" });
        assert.throws(() => {
            storage.delete("notifications", notif.id);
        }, /Security violation: Notification audit records cannot be deleted/);
    });

    // [GROUP 15] Transactional Outbox Pattern
    console.log(`\n${CYAN}[GROUP 15] Transactional Outbox Pattern${RESET}`);

    await assertAsyncTest("32. emitBusinessEvent persists event into notificationOutbox before processing", async () => {
        const res = await notificationService.emitBusinessEvent("ACCOUNT_APPROVED", "profiles", "USR-COL-99", {
            userId: "USR-COL-99",
            role: "collector"
        });
        assert.ok(res.outboxItem, "Outbox item must be created");
        assert.strictEqual(res.outboxItem.eventType, "ACCOUNT_APPROVED");
        assert.strictEqual(res.outboxItem.aggregateId, "USR-COL-99");
        assert.strictEqual(res.outboxItem.status, "processed");
    });

    assertTest("33. getOutboxPending returns only pending items and ignores processed items", () => {
        const outbox = storage.getCollection("notificationOutbox") || [];
        outbox.push({
            id: "OUT-TEST-PEND",
            eventType: "PICKUP_ARRIVED",
            aggregateType: "pickups",
            aggregateId: "PK-123",
            recipientId: "USR-CIT-001",
            status: "pending",
            attempts: 0,
            maxAttempts: 3
        });
        storage.saveCollection("notificationOutbox", outbox, "insert");

        const pending = notificationService.getOutboxPending();
        assert.ok(pending.some(p => p.id === "OUT-TEST-PEND"));
    });

    assertTest("34. processOutbox processes pending records and transitions status to processed", () => {
        const processed = notificationService.processOutbox();
        const pendingAfter = notificationService.getOutboxPending();
        assert.ok(!pendingAfter.some(p => p.id === "OUT-TEST-PEND"), "Pending item must now be processed");
    });

    // [GROUP 16] Channel Provider Abstraction (Email, SMS, Push)
    console.log(`\n${CYAN}[GROUP 16] Channel Provider Abstraction (Email, SMS, Push)${RESET}`);

    await assertAsyncTest("35. MockEmailProvider deterministically logs sent emails", async () => {
        notificationEngine.mockEmail.setMode("SUCCESS");
        const res = await notificationEngine.mockEmail.send({
            to: "citizen@example.com",
            subject: "Your Pickup is Scheduled",
            body: "Collector will arrive today."
        });
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.channel, "email");
        assert.strictEqual(res.provider, "mock");
        assert.ok(res.messageId.startsWith("msg_email_"));
    });

    await assertAsyncTest("36. MockSmsProvider deterministically logs sent SMS for high-priority alerts", async () => {
        notificationEngine.mockSms.setMode("SUCCESS");
        const res = await notificationEngine.mockSms.send({
            phoneNumber: "+919876543210",
            message: "Collector arrived at your gate"
        });
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.channel, "sms");
        assert.strictEqual(res.provider, "mock");
        assert.ok(res.messageId.startsWith("msg_sms_"));
    });

    await assertAsyncTest("37. MockPushProvider deterministically logs browser web push notifications", async () => {
        notificationEngine.mockPush.setMode("SUCCESS");
        const res = await notificationEngine.mockPush.send({
            userId: "USR-CIT-001",
            title: "Weighing in Progress",
            body: "Digital scale connected"
        });
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.channel, "push");
        assert.strictEqual(res.provider, "mock");
    });

    // [GROUP 17] Provider Failure & Fallback Resilience
    console.log(`\n${CYAN}[GROUP 17] Provider Failure & Fallback Resilience${RESET}`);

    await assertAsyncTest("38. External email failure does not throw or abort notification dispatch", async () => {
        notificationEngine.mockEmail.setMode("FAILURE");
        const res = await notificationEngine.mockEmail.send({
            to: "citizen@example.com",
            subject: "Test Failure",
            body: "Failure scenario"
        });
        assert.strictEqual(res.success, false);
        assert.ok(res.error.includes("Simulated SMTP gateway failure"));
    });

    await assertAsyncTest("39. External channel failure preserves in-app notification reliably (Channel Fallback)", async () => {
        notificationEngine.mockEmail.setMode("FAILURE");
        notificationEngine.mockSms.setMode("TIMEOUT");

        const evt = notificationEngine.createBusinessEvent("PICKUP_COMPLETED", "pickups", "PK-RESILIENCE", {
            citizenId: "USR-CIT-FALLBACK",
            finalWeight: 14.5
        });

        const result = await notificationEngine.dispatchEvent(evt, storage, true);
        assert.ok(result.notificationsCreated.length > 0, "In-app notification must be created regardless of external channels");
        const created = storage.findById("notifications", result.notificationsCreated[0].id);
        assert.ok(created, "In-app record must be securely persisted in database");
    });

    // [GROUP 18] Notification Preferences Management
    console.log(`\n${CYAN}[GROUP 18] Notification Preferences Management${RESET}`);

    assertTest("40. getPreferences returns default preferences for new user", () => {
        const prefs = notificationService.getPreferences("USR-NEW-USER-99");
        assert.strictEqual(prefs.emailEnabled, true);
        assert.strictEqual(prefs.smsEnabled, true);
        assert.strictEqual(prefs.pickupUpdates, true);
        assert.strictEqual(prefs.marketingUpdates, false);
    });

    assertTest("41. updatePreferences allows owner to update their preferences", () => {
        const updated = notificationService.updatePreferences("USR-CIT-001", { marketingUpdates: true }, "USR-CIT-001");
        assert.strictEqual(updated.marketingUpdates, true);
        const retrieved = notificationService.getPreferences("USR-CIT-001");
        assert.strictEqual(retrieved.marketingUpdates, true);
    });

    assertTest("42. updatePreferences rejects cross-user preference tampering with security error", () => {
        assert.throws(() => {
            notificationService.updatePreferences("USR-CIT-001", { emailEnabled: false }, "USR-ATTACKER-99");
        }, /Security violation: Cannot update another user's notification preferences/);
    });

    // [GROUP 19] Authoritative Unread Count
    console.log(`\n${CYAN}[GROUP 19] Authoritative Unread Count${RESET}`);

    assertTest("43. getUnreadCount reflects accurate unread notifications for specified user", () => {
        const testUser = "USR-UNREAD-TEST-" + Date.now();
        assert.strictEqual(notificationService.getUnreadCount(testUser), 0);

        const n1 = notificationService.create({ userId: testUser, title: "Unread 1" });
        const n2 = notificationService.create({ userId: testUser, title: "Unread 2" });
        assert.strictEqual(notificationService.getUnreadCount(testUser), 2);

        notificationService.markAsRead(n1.id, testUser);
        assert.strictEqual(notificationService.getUnreadCount(testUser), 1);

        notificationService.markAsRead(n2.id, testUser);
        assert.strictEqual(notificationService.getUnreadCount(testUser), 0);
    });

    // [GROUP 20] Migration 008 & Secret Scanning
    console.log(`\n${CYAN}[GROUP 20] Migration 008 & Secret Scanning${RESET}`);

    assertTest("44. Migration 008 defines additive columns for notifications table", () => {
        const migPath = path.resolve(__dirname, "../supabase/migrations/008_notifications_and_events.sql");
        assert.ok(fs.existsSync(migPath), "008_notifications_and_events.sql must exist");
        const sql = fs.readFileSync(migPath, "utf8");
        assert.ok(sql.includes("ALTER TABLE notifications"), "Must extend notifications table");
        assert.ok(sql.includes("ADD COLUMN IF NOT EXISTS event_type"), "Must add event_type");
        assert.ok(sql.includes("ADD COLUMN IF NOT EXISTS idempotency_key"), "Must add idempotency_key");
        assert.ok(sql.includes("ADD COLUMN IF NOT EXISTS read_at"), "Must add read_at");
    });

    assertTest("45. Migration 008 creates notification_preferences, outbox, and delivery attempts tables", () => {
        const sql = fs.readFileSync(path.resolve(__dirname, "../supabase/migrations/008_notifications_and_events.sql"), "utf8");
        assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS notification_preferences"), "Must create notification_preferences");
        assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS notification_outbox"), "Must create notification_outbox");
        assert.ok(sql.includes("CREATE TABLE IF NOT EXISTS notification_delivery_attempts"), "Must create notification_delivery_attempts");
    });

    assertTest("46. Migration 008 defines RLS and immutability trigger preventing tampering", () => {
        const sql = fs.readFileSync(path.resolve(__dirname, "../supabase/migrations/008_notifications_and_events.sql"), "utf8");
        assert.ok(sql.includes("prevent_notification_tampering"), "Must define immutability trigger function");
        assert.ok(sql.includes("ENABLE ROW LEVEL SECURITY"), "Must enable RLS");
        assert.ok(sql.includes("ALTER PUBLICATION supabase_realtime ADD TABLE notifications"), "Must configure realtime");
    });

    assertTest("47. Migration 008 defines atomic event outbox stored procedure emit_business_event_atomic", () => {
        const sql = fs.readFileSync(path.resolve(__dirname, "../supabase/migrations/008_notifications_and_events.sql"), "utf8");
        assert.ok(sql.includes("CREATE OR REPLACE FUNCTION emit_business_event_atomic"), "Must define emit_business_event_atomic RPC");
        assert.ok(sql.includes("CREATE OR REPLACE FUNCTION get_authoritative_unread_count"), "Must define unread count RPC");
    });

    assertTest("48. Support ticket creation generates ISSUE_CREATED event and alerts admin", () => {
        const ticket = supportService.createTicket({
            citizenId: "CIT-1001",
            pickupId: "PK-9481",
            raisedBy: "Aarav Sharma",
            category: "payment",
            priority: "high",
            title: "Disputed weight record",
            description: "Weight discrepancy check"
        });
        assert.ok(ticket.id, "Ticket must be created");
        const adminNotifs = notificationService.getForRole("admin");
        assert.ok(adminNotifs.some(n => n.type === "issue" || n.title.includes("Ticket")), "Admin must receive support alert");
    });

    assertTest("49. Secret Scanner: ZERO email/SMS/push API keys or private secrets in frontend code", () => {
        function scanDir(dir) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    scanDir(fullPath);
                } else if (/\.(js|html|css|json)$/.test(entry.name)) {
                    const content = fs.readFileSync(fullPath, "utf8");
                    assert.ok(!content.includes("SG.live_"), "Sendgrid live key found in " + entry.name);
                    assert.ok(!content.includes("SK_live_"), "Stripe/live key found in " + entry.name);
                    assert.ok(!content.includes("AC_live_twilio_"), "Twilio live secret found in " + entry.name);
                }
            }
        }
        scanDir(path.resolve(__dirname, "../frontend/shared"));
        scanDir(path.resolve(__dirname, "../frontend/citizen"));
        scanDir(path.resolve(__dirname, "../frontend/collector"));
    });

    assertTest("50. Realtime notification subscription is properly scoped to recipient user ID", () => {
        const realtimeSrc = fs.readFileSync(path.resolve(__dirname, "../frontend/shared/js/realtime.js"), "utf8");
        assert.ok(realtimeSrc.includes('subscribe("notifications", "notifications", {'), "Must subscribe to notifications");
        assert.ok(realtimeSrc.includes('column: "user_id"'), "Must scope subscription by column user_id");
        assert.ok(!realtimeSrc.includes('subscribe("notifications", "notifications");'), "Global broadcast to all users must not be allowed for notifications");
    });

    console.log(`\n${BOLD}=======================================================${RESET}`);
    console.log(`${BOLD}TOTAL PHASE 4G ASSERTIONS: ${passedCount + failedCount} | PASSED: ${GREEN}${passedCount}${RESET} | FAILED: ${failedCount ? RED + failedCount : "0"}${RESET}`);
    console.log(`${BOLD}=======================================================\n`);

    if (failedCount > 0) {
        process.exit(1);
    }
})();
