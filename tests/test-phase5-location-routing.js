/* =========================================================
   E-KABAADI PLATFORM — Phase 5 Automated Test Suite
   Real-Time Fleet Tracking, Routing, ETA & Geo-Spatial Operations
   File: tests/test-phase5-location-routing.js
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
console.log(`${BOLD}   E-KABAADI PHASE 5 — FLEET TRACKING & ROUTING TESTS ${RESET}`);
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

// Load core storage & engine
const storageModule = require(path.join(baseDir, "shared/js/storage.js"));
global.EKABADI_STORAGE = storageModule;
if (typeof storageModule.init === "function") {
    storageModule.init();
}
const storage = storageModule.adapter;

const notificationEngine = require(path.join(baseDir, "shared/js/notification-engine.js"));
global.notificationEngine = notificationEngine;

const routingModule = require(path.join(baseDir, "shared/js/routing-service.js"));
global.EKABADI_ROUTING = routingModule;
const routingService = routingModule.routingService;
const MockRoutingProvider = routingModule.MockRoutingProvider;
const ProductionRoutingProvider = routingModule.ProductionRoutingProvider;

const trackingModule = require(path.join(baseDir, "shared/js/tracking-service.js"));
global.EKABADI_TRACKING = trackingModule;
const trackingService = trackingModule.trackingService;

const servicesExports = require(path.join(baseDir, "shared/js/services.js"));
const pickupService = servicesExports.pickup;

(async function runPhase5Tests() {

    // [GROUP 1] Migration 009 SQL Schema & Immutability Trigger
    console.log(`\n${CYAN}[GROUP 1] Migration 009 SQL Schema & Immutability Trigger${RESET}`);

    const migrationFile = path.resolve(__dirname, "../supabase/migrations/009_fleet_tracking_and_routing.sql");
    const migrationContent = fs.readFileSync(migrationFile, "utf8");

    assertTest("1. Migration 009 defines collector_live_locations table with check constraints", () => {
        assert.ok(migrationContent.includes("CREATE TABLE IF NOT EXISTS public.collector_live_locations"), "Must create collector_live_locations");
        assert.ok(migrationContent.includes("latitude DECIMAL(9,6) NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0)"), "Must constrain latitude");
        assert.ok(migrationContent.includes("longitude DECIMAL(9,6) NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0)"), "Must constrain longitude");
    });

    assertTest("2. Migration 009 defines pickup_tracking_sessions table and trigger preventing tampering", () => {
        assert.ok(migrationContent.includes("CREATE TABLE IF NOT EXISTS public.pickup_tracking_sessions"), "Must create pickup_tracking_sessions");
        assert.ok(migrationContent.includes("CREATE TRIGGER trg_prevent_tracking_session_tampering"), "Must declare immutability trigger");
        assert.ok(migrationContent.includes("prevent_tracking_session_tampering()"), "Must define trigger function");
    });

    assertTest("3. Migration 009 defines purge_stale_location_history stored procedure for ephemeral retention", () => {
        assert.ok(migrationContent.includes("CREATE OR REPLACE FUNCTION public.purge_stale_location_history"), "Must declare purge_stale_location_history");
        assert.ok(migrationContent.includes("recorded_at < (NOW() - (p_retention_hours || ' hours')::INTERVAL)"), "Must enforce retention cutoff");
    });

    assertTest("4. Migration 009 configures publication to supabase_realtime", () => {
        assert.ok(migrationContent.includes("ALTER PUBLICATION supabase_realtime ADD TABLE public.collector_live_locations"), "Must add live locations to realtime");
        assert.ok(migrationContent.includes("ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_tracking_sessions"), "Must add tracking sessions to realtime");
    });

    // [GROUP 2] Coordinate Validation & Bounds Checking
    console.log(`\n${CYAN}[GROUP 2] Coordinate Validation & Bounds Checking${RESET}`);

    assertTest("5. validateCoordinates accepts valid geographic coordinates", () => {
        const valid = trackingService.validateCoordinates(28.6139, 77.2090);
        assert.strictEqual(valid.valid, true, "New Delhi coordinates must be valid");
        assert.strictEqual(valid.latitude, 28.6139);
        assert.strictEqual(valid.longitude, 77.2090);
        assert.strictEqual(valid.lat, 28.6139);
        assert.strictEqual(valid.lng, 77.2090);
    });

    assertTest("6. validateCoordinates strictly rejects out-of-bounds latitude (>90 or <-90)", () => {
        const invalidHigh = trackingService.validateCoordinates(95.0, 77.2);
        assert.strictEqual(invalidHigh.valid, false, "Latitude > 90 must be rejected");
        const invalidLow = trackingService.validateCoordinates(-91.5, 77.2);
        assert.strictEqual(invalidLow.valid, false, "Latitude < -90 must be rejected");
    });

    assertTest("7. validateCoordinates strictly rejects out-of-bounds longitude (>180 or <-180)", () => {
        const invalidHigh = trackingService.validateCoordinates(28.6, 185.0);
        assert.strictEqual(invalidHigh.valid, false, "Longitude > 180 must be rejected");
        const invalidLow = trackingService.validateCoordinates(28.6, -181.0);
        assert.strictEqual(invalidLow.valid, false, "Longitude < -180 must be rejected");
    });

    assertTest("8. validateCoordinates rejects non-numeric, NaN, and Infinity inputs", () => {
        assert.strictEqual(trackingService.validateCoordinates(NaN, 77.2).valid, false);
        assert.strictEqual(trackingService.validateCoordinates(28.6, Infinity).valid, false);
        assert.strictEqual(trackingService.validateCoordinates("bad_lat", "bad_lng").valid, false);
        assert.strictEqual(trackingService.validateCoordinates(null, undefined).valid, false);
    });

    // [GROUP 3] Collector Location Authorization & Anti-Spoofing
    console.log(`\n${CYAN}[GROUP 3] Collector Location Authorization & Anti-Spoofing${RESET}`);

    assertTest("9. publishLocation successfully publishes for authenticated collector", () => {
        const res = trackingService.publishLocation("COL-001", {
            latitude: 28.6280,
            longitude: 77.3649,
            speedKmh: 24.5,
            heading: 90
        }, "COL-001");
        assert.strictEqual(res.success, true, "Authorized collector publication must succeed");
        assert.strictEqual(res.location.collectorId, "COL-001");
    });

    assertTest("10. publishLocation strictly rejects spoofing attempt where actor does not match collectorId", () => {
        assert.throws(() => {
            trackingService.publishLocation("COL-001", {
                latitude: 28.6280,
                longitude: 77.3649
            }, "COL-999"); // Impersonator actor
        }, /Security violation/);
    });

    assertTest("11. publishLocation throws when caller authentication is missing", () => {
        assert.throws(() => {
            trackingService.publishLocation("COL-001", {
                latitude: 28.6280,
                longitude: 77.3649
            }, null);
        }, /Security violation: Unauthenticated location transmission/);
    });

    // [GROUP 4] Non-Destructive GPS Teleportation & Movement Anomaly Detection
    console.log(`\n${CYAN}[GROUP 4] Non-Destructive GPS Teleportation & Movement Anomaly Detection${RESET}`);

    assertTest("12. detectMovementAnomaly flags impossible speed (>120 km/h) as EXCESSIVE_SPEED anomaly", () => {
        // 50 km jump in 60 seconds = 3000 km/h
        const prev = { latitude: 28.6000, longitude: 77.3000, updatedAt: new Date(Date.now() - 60000).toISOString() };
        const next = { latitude: 29.0500, longitude: 77.3000, updatedAt: new Date().toISOString() };
        const anomaly = trackingService.detectMovementAnomaly(next, prev);

        assert.strictEqual(anomaly.isAnomaly, true, "Must be flagged as movement anomaly");
        assert.strictEqual(anomaly.flag, "EXCESSIVE_SPEED");
        assert.ok(anomaly.calculatedSpeedKmh > 120, "Calculated speed must exceed threshold");
    });

    assertTest("13. GPS Teleportation anomaly is NON-DESTRUCTIVE: coordinates preserved, anomaly flagged", () => {
        // Publish a baseline location
        trackingService.publishLocation("COL-002", {
            latitude: 28.6000,
            longitude: 77.3000,
            timestamp: new Date(Date.now() - 60000).toISOString()
        }, "COL-002");

        // Simulate teleportation (50 km away in 60s)
        const teleportRes = trackingService.publishLocation("COL-002", {
            latitude: 29.0500,
            longitude: 77.3000,
            timestamp: new Date().toISOString()
        }, "COL-002");

        assert.strictEqual(teleportRes.success, true, "Teleportation must not crash or be dropped");
        assert.strictEqual(teleportRes.location.anomalyFlag, "EXCESSIVE_SPEED", "Anomaly flag must be recorded");
        assert.strictEqual(teleportRes.location.latitude, 29.0500, "Raw coordinate must NOT be silently rewritten");
        assert.strictEqual(teleportRes.location.longitude, 77.3000, "Raw coordinate must be preserved for audit");
    });

    assertTest("14. Reasonable urban movement (<120 km/h) is not flagged as anomaly", () => {
        // 300 meters in 30 seconds = 36 km/h
        const prev = { latitude: 28.6000, longitude: 77.3000, updatedAt: new Date(Date.now() - 30000).toISOString() };
        const next = { latitude: 28.6027, longitude: 77.3000, updatedAt: new Date().toISOString() };
        const anomaly = trackingService.detectMovementAnomaly(next, prev);

        assert.strictEqual(anomaly.isAnomaly, false, "36 km/h movement must not be an anomaly");
        assert.strictEqual(anomaly.flag, null);
    });

    // [GROUP 5] Location Freshness States
    console.log(`\n${CYAN}[GROUP 5] Location Freshness States${RESET}`);

    assertTest("15. evaluateLocationFreshness returns LIVE for timestamp <= 30 seconds old", () => {
        const now = new Date().toISOString();
        const freshness = trackingService.evaluateLocationFreshness(now, true);
        assert.strictEqual(freshness.status, "LIVE");
        assert.strictEqual(freshness.isLive, true);
    });

    assertTest("16. evaluateLocationFreshness returns RECENT for timestamp between 31 and 120 seconds old", () => {
        const sixtySecAgo = new Date(Date.now() - 60 * 1000).toISOString();
        const freshness = trackingService.evaluateLocationFreshness(sixtySecAgo, true);
        assert.strictEqual(freshness.status, "RECENT");
        assert.strictEqual(freshness.isLive, true);
    });

    assertTest("17. evaluateLocationFreshness returns STALE for timestamp > 120 seconds old", () => {
        const threeMinAgo = new Date(Date.now() - 180 * 1000).toISOString();
        const freshness = trackingService.evaluateLocationFreshness(threeMinAgo, true);
        assert.strictEqual(freshness.status, "STALE");
        assert.strictEqual(freshness.isLive, false);
    });

    assertTest("18. evaluateLocationFreshness returns OFFLINE for inactive collector or timestamp > 300 seconds", () => {
        const sixMinAgo = new Date(Date.now() - 360 * 1000).toISOString();
        const freshness = trackingService.evaluateLocationFreshness(sixMinAgo, true);
        assert.strictEqual(freshness.status, "OFFLINE");
        assert.strictEqual(freshness.isLive, false);

        const inactiveFreshness = trackingService.evaluateLocationFreshness(new Date().toISOString(), false);
        assert.strictEqual(inactiveFreshness.status, "OFFLINE", "Inactive collector must evaluate to OFFLINE");
    });

    // [GROUP 6] Tracking Session Lifecycle & Immutability
    console.log(`\n${CYAN}[GROUP 6] Tracking Session Lifecycle & Immutability${RESET}`);

    let testSessionId = null;

    assertTest("19. startSession initiates session in ACTIVE state with timestamps", () => {
        const session = trackingService.startSession("PK-LIFECYCLE-1", "COL-001", "USR-CIT-001");
        assert.ok(session, "Session must be created");
        assert.strictEqual(session.status, "active");
        assert.strictEqual(session.pickupId, "PK-LIFECYCLE-1");
        assert.strictEqual(session.collectorId, "COL-001");
        assert.strictEqual(session.citizenId, "USR-CIT-001");
        assert.ok(session.startedAt, "Must record startedAt timestamp");
        testSessionId = session.id;
    });

    assertTest("20. pauseSession transitions session to PAUSED state", () => {
        const paused = trackingService.pauseSession(testSessionId);
        assert.ok(paused);
        assert.strictEqual(paused.status, "paused");
    });

    assertTest("21. resumeSession restores session to ACTIVE state", () => {
        const resumed = trackingService.resumeSession(testSessionId);
        assert.ok(resumed);
        assert.strictEqual(resumed.status, "active");
    });

    assertTest("22. endSession transitions session to STOPPED state with endedAt", () => {
        const ended = trackingService.endSession(testSessionId, "Collection completed");
        assert.ok(ended);
        assert.strictEqual(ended.status, "stopped");
        assert.ok(ended.endedAt, "Must record endedAt timestamp");
    });

    assertTest("23. StateAdapter immutability guard prevents tampering with collectorId or pickupId", () => {
        assert.throws(() => {
            storage.update("pickupTrackingSessions", testSessionId, {
                collectorId: "COL-TAMPERED-999"
            });
        }, /Security violation: Cannot modify immutable field collectorId/);

        assert.throws(() => {
            storage.update("pickupTrackingSessions", testSessionId, {
                pickupId: "PK-TAMPERED-999"
            });
        }, /Security violation: Cannot modify immutable field pickupId/);
    });

    // [GROUP 7] Pickup State Machine Lifecycle Integration
    console.log(`\n${CYAN}[GROUP 7] Pickup State Machine Lifecycle Integration${RESET}`);

    await assertAsyncTest("24. pickup transition to on_the_way automatically starts active tracking session", async () => {
        const pickup = storage.insert("pickups", {
            id: "PK-SM-TEST-1",
            citizenId: "USR-CIT-001",
            collectorId: "COL-001",
            collectorName: "Ramesh Kumar",
            status: "accepted",
            scheduledDate: "2026-09-25"
        });

        await pickupService.updateStatus(pickup.id, "on_the_way");
        const session = trackingService.getSessionByPickupId(pickup.id);

        assert.ok(session, "Tracking session must exist for on_the_way pickup");
        assert.strictEqual(session.status, "active");
        assert.strictEqual(session.collectorId, "COL-001");
    });

    await assertAsyncTest("25. pickup transition to arrived automatically pauses tracking session", async () => {
        await pickupService.updateStatus("PK-SM-TEST-1", "arrived");
        const session = trackingService.getSessionByPickupId("PK-SM-TEST-1");

        assert.ok(session);
        assert.strictEqual(session.status, "paused", "Session should be paused upon doorstep arrival");
    });

    await assertAsyncTest("26. pickup transition to completed automatically stops tracking session", async () => {
        await pickupService.updateStatus("PK-SM-TEST-1", "completed");
        const session = trackingService.getSessionByPickupId("PK-SM-TEST-1");

        assert.ok(session);
        assert.strictEqual(session.status, "stopped", "Session should be stopped when pickup completes");
    });

    // [GROUP 8] MockRoutingProvider: Explicitly Simulated & Deterministic
    console.log(`\n${CYAN}[GROUP 8] MockRoutingProvider: Explicitly Simulated & Deterministic${RESET}`);

    await assertAsyncTest("27. MockRoutingProvider explicitly flags all output as simulated (isSimulated = true)", async () => {
        const mockProvider = new MockRoutingProvider();
        const origin = { lat: 28.6280, lng: 77.3649 };
        const destination = { lat: 28.6304, lng: 77.3720 };

        const result = await mockProvider.calculateRoute(origin, destination);

        assert.strictEqual(result.isSimulated, true, "Mandatory Correction 1: Mock routing must be explicitly simulated");
        assert.strictEqual(result.source, "simulated_mock", "Source must state simulated_mock");
        assert.ok(result.distanceKm > 0, "Distance must be calculated");
        assert.ok(result.durationMinutes > 0, "ETA minutes must be calculated");
        assert.ok(Array.isArray(result.waypoints) && result.waypoints.length >= 2, "Waypoints must exist");
    });

    await assertAsyncTest("28. MockRoutingProvider applies Haversine x 1.25 urban road detour factor", async () => {
        const mockProvider = new MockRoutingProvider({ speedKmh: 20 });
        const origin = { lat: 28.6000, lng: 77.3000 };
        const destination = { lat: 28.6100, lng: 77.3000 }; // ~1.112 km straight line

        const result = await mockProvider.calculateRoute(origin, destination);
        // Straight line ~1.11 km, x 1.25 ~ 1.39 km
        assert.ok(result.distanceKm >= 1.3 && result.distanceKm <= 1.5, "Distance must apply 1.25 road detour multiplier");
    });

    // [GROUP 9] Production Routing Failure & NO SILENT FALLBACK
    console.log(`\n${CYAN}[GROUP 9] Production Routing Failure & NO SILENT FALLBACK${RESET}`);

    await assertAsyncTest("29. ProductionRoutingProvider returns ROUTE_UNAVAILABLE when API key is missing (Mandatory Correction 2)", async () => {
        const prodProvider = new ProductionRoutingProvider({ apiKey: "" });
        const origin = { lat: 28.6280, lng: 77.3649 };
        const destination = { lat: 28.6304, lng: 77.3720 };

        const result = await prodProvider.calculateRoute(origin, destination);

        assert.strictEqual(result.error, "ROUTING_PROVIDER_UNCONFIGURED");
        assert.strictEqual(result.routeFreshness, "UNAVAILABLE");
        assert.strictEqual(result.isSimulated, false, "Must NOT generate fake simulation in production");
        assert.strictEqual(result.distanceKm, null, "Must NOT generate fake distance");
        assert.strictEqual(result.durationMinutes, null, "Must NOT generate fake duration");
    });

    await assertAsyncTest("30. routingService in production returns ROUTE_UNAVAILABLE and ETA_UNAVAILABLE on failure", async () => {
        // Instantiate a failing production provider
        const failingProdProvider = {
            name: "osrm_production",
            calculateRoute: async () => ({
                error: "NETWORK_TIMEOUT",
                routeFreshness: "UNAVAILABLE",
                isSimulated: false,
                distanceKm: null,
                durationMinutes: null
            })
        };

        const prevProvider = routingService.getProvider();
        routingService.setProvider(failingProdProvider);

        try {
            const etaResult = await routingService.getEta(
                { lat: 28.6280, lng: 77.3649 },
                { lat: 28.6304, lng: 77.3720 }
            );

            assert.strictEqual(etaResult.etaStatus, "ROUTE_UNAVAILABLE", "Must return ROUTE_UNAVAILABLE on provider failure");
            assert.strictEqual(etaResult.routeFreshness, "UNAVAILABLE");
            assert.strictEqual(etaResult.formattedEta, "ETA Unavailable", "Must NOT display fake ETA in production");
            assert.strictEqual(etaResult.isSimulated, false, "Must NOT silently fall back to mock simulation");
        } finally {
            routingService.setProvider(prevProvider);
        }
    });

    // [GROUP 10] ETA Engine & Freshness Evaluation
    console.log(`\n${CYAN}[GROUP 10] ETA Engine & Freshness Evaluation${RESET}`);

    assertTest("31. evaluateEtaStatus returns ROUTE_UNAVAILABLE when routeFreshness is UNAVAILABLE", () => {
        const status = routingService.evaluateEtaStatus(new Date().toISOString(), "UNAVAILABLE");
        assert.strictEqual(status, "ROUTE_UNAVAILABLE");
    });

    assertTest("32. evaluateEtaStatus returns AVAILABLE for recent calculation with FRESH route", () => {
        const status = routingService.evaluateEtaStatus(new Date().toISOString(), "FRESH");
        assert.strictEqual(status, "AVAILABLE");
    });

    assertTest("33. evaluateEtaStatus returns STALE when calculation is older than 60 seconds", () => {
        const seventySecAgo = new Date(Date.now() - 70 * 1000).toISOString();
        const status = routingService.evaluateEtaStatus(seventySecAgo, "FRESH");
        assert.strictEqual(status, "STALE");
    });

    // [GROUP 11] Route Refresh Throttling (Displacement & Age)
    console.log(`\n${CYAN}[GROUP 11] Route Refresh Throttling (Displacement & Age)${RESET}`);

    await assertAsyncTest("34. getRoute reuses cached route when displacement is < 100m and age < 60s", async () => {
        routingService.clearCache();
        const origin1 = { lat: 28.6280, lng: 77.3649 };
        const destination = { lat: 28.6350, lng: 77.3750 };

        const firstCall = await routingService.getRoute(origin1, destination);
        assert.strictEqual(firstCall.cached, false, "First call must compute route");

        // Small displacement (~20 meters)
        const origin2 = { lat: 28.62815, lng: 77.3649 };
        const secondCall = await routingService.getRoute(origin2, destination);
        assert.strictEqual(secondCall.cached, true, "Minor displacement (<100m) must reuse cached route to avoid thrashing");
    });

    await assertAsyncTest("35. getRoute recalculates route when displacement exceeds 100m", async () => {
        // Displacement ~300 meters
        const origin3 = { lat: 28.6310, lng: 77.3649 };
        const destination = { lat: 28.6350, lng: 77.3750 };

        const thirdCall = await routingService.getRoute(origin3, destination);
        assert.strictEqual(thirdCall.cached, false, "Displacement > 100m must trigger route recalculation");
    });

    // [GROUP 12] Non-Destructive Route Deviation Detection
    console.log(`\n${CYAN}[GROUP 12] Non-Destructive Route Deviation Detection${RESET}`);

    assertTest("36. detectRouteDeviation detects ON_ROUTE when collector is near route waypoints", () => {
        const waypoints = [
            { lat: 28.6280, lng: 77.3649 },
            { lat: 28.6290, lng: 77.3680 },
            { lat: 28.6300, lng: 77.3720 }
        ];
        const currentLoc = { lat: 28.62805, lng: 77.3650 }; // ~10m from waypoint 0
        const deviation = routingService.detectRouteDeviation(currentLoc, waypoints);
        assert.strictEqual(deviation, "ON_ROUTE");
    });

    assertTest("37. detectRouteDeviation detects MINOR_DEVIATION when collector is 80m - 250m off route", () => {
        const waypoints = [
            { lat: 28.6280, lng: 77.3649 },
            { lat: 28.6290, lng: 77.3680 }
        ];
        // ~120m away from route
        const currentLoc = { lat: 28.6290, lng: 77.3693 };
        const deviation = routingService.detectRouteDeviation(currentLoc, waypoints);
        assert.strictEqual(deviation, "MINOR_DEVIATION");
    });

    assertTest("38. detectRouteDeviation detects OFF_ROUTE when collector is > 250m off route", () => {
        const waypoints = [
            { lat: 28.6280, lng: 77.3649 },
            { lat: 28.6290, lng: 77.3680 }
        ];
        // ~500m away
        const currentLoc = { lat: 28.6330, lng: 77.3680 };
        const deviation = routingService.detectRouteDeviation(currentLoc, waypoints);
        assert.strictEqual(deviation, "OFF_ROUTE");
    });

    // [GROUP 13] Informational Arrival Geofence (<150m) & Invariant Preservation
    console.log(`\n${CYAN}[GROUP 13] Informational Arrival Geofence (<150m) & Invariant Preservation${RESET}`);

    assertTest("39. checkProximityGeofence returns isNearDestination = true within 150m", () => {
        const collectorLoc = { latitude: 28.6300, longitude: 77.3700 };
        const destinationLoc = { latitude: 28.6308, longitude: 77.3700 }; // ~89 meters
        const result = trackingService.checkProximityGeofence(collectorLoc, destinationLoc);

        assert.strictEqual(result.isNearDestination, true, "Must flag near destination under 150m");
        assert.strictEqual(result.thresholdMeters, 150);
        assert.ok(result.distanceMeters < 150);
    });

    assertTest("40. Mandatory Correction 4: Proximity geofence NEVER automatically transitions pickup to ARRIVED", () => {
        const pickup = storage.insert("pickups", {
            id: "PK-GEOFENCE-TEST-1",
            citizenId: "USR-CIT-001",
            collectorId: "COL-001",
            collectorName: "Ramesh Kumar",
            status: "on_the_way",
            scheduledDate: "2026-09-25"
        });

        // Publish location within 50m of pickup
        const collectorLoc = { latitude: 28.6302, longitude: 77.3700 };
        const destinationLoc = { latitude: 28.6300, longitude: 77.3700 };
        const proximity = trackingService.checkProximityGeofence(collectorLoc, destinationLoc);

        assert.strictEqual(proximity.isNearDestination, true);

        // Verify pickup status in storage is still strictly "on_the_way"
        const storedPickup = storage.findById("pickups", pickup.id);
        assert.strictEqual(storedPickup.status, "on_the_way", "Pickup state authority must NOT be auto-mutated by geofence");
    });

    // [GROUP 14] Privacy, Tenant Isolation & Access Control
    console.log(`\n${CYAN}[GROUP 14] Privacy, Tenant Isolation & Access Control${RESET}`);

    assertTest("41. Citizen can view location of assigned collector during active pickup session", () => {
        // Set up active pickup and session
        const pickup = storage.insert("pickups", {
            id: "PK-PRIVACY-1",
            citizenId: "USR-CIT-001",
            collectorId: "COL-001",
            collectorName: "Ramesh Kumar",
            status: "on_the_way"
        });
        trackingService.startSession(pickup.id, "COL-001", "USR-CIT-001");
        trackingService.publishLocation("COL-001", { latitude: 28.6280, longitude: 77.3649 }, "COL-001");

        const locationView = trackingService.getPickupCollectorLocation(pickup.id, "USR-CIT-001");
        assert.ok(locationView, "Assigned citizen must see location");
        assert.strictEqual(locationView.collectorId, "COL-001");
        assert.strictEqual(locationView.latitude, 28.6280);
    });

    assertTest("42. Tenant Isolation: Unauthorized citizen cannot view collector location for another citizen's pickup", () => {
        const unauthorizedView = trackingService.getPickupCollectorLocation("PK-PRIVACY-1", "USR-CIT-999");
        assert.strictEqual(unauthorizedView, null, "Cross-tenant access must return null");
    });

    assertTest("43. Citizen cannot view collector location when pickup has ended", () => {
        const completedPickup = storage.insert("pickups", {
            id: "PK-PRIVACY-COMPLETED",
            citizenId: "USR-CIT-001",
            collectorId: "COL-001",
            status: "completed"
        });
        const view = trackingService.getPickupCollectorLocation(completedPickup.id, "USR-CIT-001");
        assert.strictEqual(view, null, "Citizen cannot track collector once pickup is completed (No surveillance)");
    });

    // [GROUP 15] Ephemeral Telemetry Retention & Purge
    console.log(`\n${CYAN}[GROUP 15] Ephemeral Telemetry Retention & Purge${RESET}`);

    assertTest("44. Telemetry older than retention window is purged by purgeStaleTelemetry", () => {
        const now = Date.now();
        const freshTimestamp = new Date(now - 2 * 3600 * 1000).toISOString(); // 2 hours old
        const staleTimestamp = new Date(now - 30 * 3600 * 1000).toISOString(); // 30 hours old

        storage.insert("collectorLocationHistory", {
            id: "LOC-HIST-FRESH",
            collectorId: "COL-001",
            latitude: 28.6280,
            longitude: 77.3649,
            recordedAt: freshTimestamp
        });
        storage.insert("collectorLocationHistory", {
            id: "LOC-HIST-STALE",
            collectorId: "COL-001",
            latitude: 28.6290,
            longitude: 77.3659,
            recordedAt: staleTimestamp
        });

        const purgedCount = trackingService.purgeStaleTelemetry(24);
        assert.ok(purgedCount >= 1, "Must purge at least 1 record older than 24 hours");

        const remaining = storage.getCollection("collectorLocationHistory");
        const hasStale = remaining.some(r => r.id === "LOC-HIST-STALE");
        const hasFresh = remaining.some(r => r.id === "LOC-HIST-FRESH");

        assert.strictEqual(hasStale, false, "Stale telemetry must be purged");
        assert.strictEqual(hasFresh, true, "Fresh telemetry within retention window must remain");
    });

    // [GROUP 16] Phase 4G Notification & Event Integration
    console.log(`\n${CYAN}[GROUP 16] Phase 4G Notification & Event Integration${RESET}`);

    assertTest("45. Notification engine registers Phase 5 tracking event types", () => {
        const events = [
            "COLLECTOR_LOCATION_ACTIVE",
            "COLLECTOR_LOCATION_STALE",
            "COLLECTOR_LOCATION_UNAVAILABLE",
            "ETA_UPDATED",
            "ROUTE_DEVIATION_DETECTED",
            "COLLECTOR_NEAR_DESTINATION",
            "ROUTING_PROVIDER_FAILURE"
        ];
        events.forEach(evtType => {
            const evt = notificationEngine.createBusinessEvent(evtType, "tracking", "TRK-001", {
                collectorId: "COL-001"
            });
            assert.strictEqual(evt.eventType, evtType, `Must support event ${evtType}`);
        });
    });

    assertTest("46. COLLECTOR_NEAR_DESTINATION event resolves notification to citizen", () => {
        const recipients = notificationEngine.resolveRecipients({
            eventType: "COLLECTOR_NEAR_DESTINATION",
            metadata: {
                citizenId: "USR-CIT-001",
                collectorName: "Ramesh Kumar"
            }
        });
        assert.ok(recipients.length > 0, "Recipient must be resolved");
        assert.strictEqual(recipients[0].userId, "USR-CIT-001");
        assert.strictEqual(recipients[0].role, "citizen");
        assert.strictEqual(recipients[0].priority, "high");
    });

    assertTest("47. ROUTING_PROVIDER_FAILURE event routes critical alert to admin", () => {
        const recipients = notificationEngine.resolveRecipients({
            eventType: "ROUTING_PROVIDER_FAILURE",
            metadata: {
                providerName: "osrm_production",
                error: "TIMEOUT"
            }
        });
        assert.ok(recipients.length > 0);
        assert.strictEqual(recipients[0].userId, "USR-ADMIN-001");
        assert.strictEqual(recipients[0].role, "admin");
        assert.strictEqual(recipients[0].priority, "high");
    });

    // [GROUP 17] Admin Fleet Overview Aggregation
    console.log(`\n${CYAN}[GROUP 17] Admin Fleet Overview Aggregation${RESET}`);

    assertTest("48. getFleetOverview aggregates online, in-transit, stale, and offline collectors", () => {
        const overview = trackingService.getFleetOverview();
        assert.ok(overview.totalCount > 0, "Must count total collectors");
        assert.strictEqual(typeof overview.onlineCount, "number");
        assert.strictEqual(typeof overview.inTransitCount, "number");
        assert.strictEqual(typeof overview.staleCount, "number");
        assert.strictEqual(typeof overview.offlineCount, "number");
        assert.ok(Array.isArray(overview.collectors), "Must include collector details list");
    });

    assertTest("49. getFleetOverview includes freshness status and simulation indicator for each collector", () => {
        const overview = trackingService.getFleetOverview();
        const first = overview.collectors[0];
        assert.ok(first.freshness, "Must have freshness evaluated");
        assert.ok(["LIVE", "RECENT", "STALE", "OFFLINE"].includes(first.freshness.status));
        assert.strictEqual(typeof first.isSimulated, "boolean", "Must declare simulation flag");
    });

    // [GROUP 18] Security & Zero Secrets in Code
    console.log(`\n${CYAN}[GROUP 18] Security & Zero Secrets in Code${RESET}`);

    assertTest("50. Secret Scanner: ZERO private routing API keys, tokens, or credentials in frontend code", () => {
        const routingSrc = fs.readFileSync(path.join(baseDir, "shared/js/routing-service.js"), "utf8");
        const trackingSrc = fs.readFileSync(path.join(baseDir, "shared/js/tracking-service.js"), "utf8");

        // Verify no hardcoded production keys (e.g. pk.eyJ..., AIzaSy...)
        const mapboxRegex = /pk\.[a-zA-Z0-9_\-\.]{50,}/g;
        const googleKeyRegex = /AIzaSy[a-zA-Z0-9_\-]{30,}/g;

        assert.strictEqual(mapboxRegex.test(routingSrc), false, "No Mapbox secret tokens allowed in routing-service.js");
        assert.strictEqual(mapboxRegex.test(trackingSrc), false, "No Mapbox secret tokens allowed in tracking-service.js");
        assert.strictEqual(googleKeyRegex.test(routingSrc), false, "No Google Maps keys allowed in routing-service.js");
        assert.strictEqual(googleKeyRegex.test(trackingSrc), false, "No Google Maps keys allowed in tracking-service.js");
    });

    // Summary
    console.log(`\n${BOLD}=======================================================${RESET}`);
    console.log(`${BOLD}TOTAL PHASE 5 ASSERTIONS: ${passedCount + failedCount} | PASSED: ${GREEN}${passedCount}${RESET} | FAILED: ${failedCount ? RED + failedCount : "0"}${RESET}`);
    console.log(`${BOLD}=======================================================\n`);

    if (failedCount > 0) {
        process.exit(1);
    }
})();
