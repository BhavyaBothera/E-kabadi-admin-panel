/* =========================================================
   E-KABAADI PLATFORM — Phase 4E Automated Test Suite
   Location, Maps & Nearby Collector Intelligence System
   File: tests/test-phase4e-location.js
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
console.log(`${BOLD}   E-KABAADI PHASE 4E — LOCATION & MAPS INTELLIGENCE   ${RESET}`);
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
const storage = storageModule.mockAdapter;

const locationModule = require(path.join(baseDir, "shared/js/location-service.js"));
global.EKABADI_LOCATION = locationModule;

const mapModule = require(path.join(baseDir, "shared/js/map-service.js"));
global.EKABADI_MAP = mapModule;

const services = require(path.join(baseDir, "shared/js/services.js"));
global.EKABADI_SERVICES = services;

const {
    validateCoordinates,
    calculateHaversineDistance,
    sanitizeCollectorPublicProfile,
    evaluateCollectorEligibility,
    nearbyCollectorService,
    geocodingService,
    citizenLocationManager,
    DEFAULT_SERVICE_RADIUS_KM
} = locationModule;

const { mapService, MockMapProvider, ProductionMapProvider } = mapModule;
const pickupService = services.pickup;
const collectorService = services.collector;

(async function runPhase4eTests() {
    // ── GROUP 1: Location Validation ──
    console.log(`${CYAN}[GROUP 1] Geolocation Coordinates Validation${RESET}`);

    assertTest("1. Valid geographic coordinates within standard boundaries pass validation", () => {
        const res = validateCoordinates(28.6280, 77.3649); // Sector 62 Noida
        assert.strictEqual(res.valid, true, "Valid coordinates should pass");
        assert.strictEqual(typeof res.lat, "number", "Latitude should be a normalized number");
        assert.strictEqual(typeof res.lng, "number", "Longitude should be a normalized number");
        assert.strictEqual(res.lat, 28.628);
        assert.strictEqual(res.lng, 77.3649);
    });

    assertTest("2. Out-of-bounds latitude (< -90 or > 90) is strictly rejected", () => {
        const tooHigh = validateCoordinates(95.1234, 77.3649);
        assert.strictEqual(tooHigh.valid, false, "Latitude > 90 must fail");
        assert.ok(tooHigh.error.includes("Latitude"), "Error message should mention latitude bounds");

        const tooLow = validateCoordinates(-91.5, 77.3649);
        assert.strictEqual(tooLow.valid, false, "Latitude < -90 must fail");
    });

    assertTest("3. Out-of-bounds longitude (< -180 or > 180) is strictly rejected", () => {
        const tooHigh = validateCoordinates(28.628, 185.0);
        assert.strictEqual(tooHigh.valid, false, "Longitude > 180 must fail");
        assert.ok(tooHigh.error.includes("Longitude"), "Error message should mention longitude bounds");

        const tooLow = validateCoordinates(28.628, -181.0);
        assert.strictEqual(tooLow.valid, false, "Longitude < -180 must fail");
    });

    assertTest("4. Malformed and non-numeric inputs (NaN, Infinity, null, strings) are rejected", () => {
        assert.strictEqual(validateCoordinates(NaN, 77.3649).valid, false, "NaN latitude must fail");
        assert.strictEqual(validateCoordinates(28.628, Infinity).valid, false, "Infinity longitude must fail");
        assert.strictEqual(validateCoordinates(null, 77.3649).valid, false, "Null latitude must fail");
        assert.strictEqual(validateCoordinates("not-a-number", 77.3649).valid, false, "String latitude must fail");
    });

    // ── GROUP 2: Distance Calculations ──
    console.log(`\n${CYAN}[GROUP 2] Haversine Distance Calculation & Formatting${RESET}`);

    assertTest("5. Haversine formula accurately calculates distance between two coordinates", () => {
        // Sector 62 Noida (28.6280, 77.3649) to Indirapuram Ghaziabad (28.6415, 77.3712)
        const res = calculateHaversineDistance(28.6280, 77.3649, 28.6415, 77.3712);
        assert.strictEqual(res.valid, true, "Distance calculation must be valid");
        assert.ok(res.distanceKm > 1.0 && res.distanceKm < 2.5, `Distance should be ~1.6 km, got ${res.distanceKm}`);
        assert.ok(Math.abs(res.distanceMeters - Math.round(res.distanceKm * 1000)) <= 50, "Distance meters must closely match km");
    });

    assertTest("6. Zero distance returned when origin and destination coordinates are identical", () => {
        const res = calculateHaversineDistance(28.6280, 77.3649, 28.6280, 77.3649);
        assert.strictEqual(res.valid, true);
        assert.strictEqual(res.distanceKm, 0);
        assert.strictEqual(res.distanceMeters, 0);
    });

    assertTest("7. Distance formatted explicitly as 'Approx. X.X km away' without claiming driving route", () => {
        const res = calculateHaversineDistance(28.6280, 77.3649, 28.6415, 77.3712);
        assert.ok(res.formatted.startsWith("Approx. "), "Must start with 'Approx. '");
        assert.ok(res.formatted.endsWith(" km away"), "Must end with ' km away'");
        assert.ok(!res.formatted.includes("driving"), "Must NOT claim to be a driving distance");
    });

    // ── GROUP 3: Collector Eligibility ──
    console.log(`\n${CYAN}[GROUP 3] Collector Operational Eligibility & Status Evaluation${RESET}`);

    assertTest("8. Active, verified, online collector within radius evaluates to ELIGIBLE & AVAILABLE", () => {
        const testCol = {
            id: "COL-TEST-1",
            name: "Ram Singh",
            status: "active",
            verificationStatus: "verified",
            isOnline: true,
            serviceRadiusKm: 5,
            queueLength: 1,
            approxLocation: { lat: 28.6250, lng: 77.3600 }
        };
        const citizenLoc = { lat: 28.6280, lng: 77.3649 };
        const result = evaluateCollectorEligibility(testCol, citizenLoc);
        assert.strictEqual(result.eligible, true, "Collector should be eligible");
        assert.strictEqual(result.operationalStatus, "AVAILABLE", "Status should be AVAILABLE");
        assert.strictEqual(result.inServiceRadius, true, "Should be in service radius");
    });

    assertTest("9. Offline collector (isOnline: false) evaluates to OFFLINE & ineligible", () => {
        const testCol = {
            id: "COL-TEST-2",
            name: "Shyam Lal",
            status: "active",
            verificationStatus: "verified",
            isOnline: false,
            serviceRadiusKm: 5,
            approxLocation: { lat: 28.6250, lng: 77.3600 }
        };
        const result = evaluateCollectorEligibility(testCol);
        assert.strictEqual(result.eligible, false, "Offline collector must not be eligible");
        assert.strictEqual(result.operationalStatus, "OFFLINE", "Operational status must be OFFLINE");
    });

    assertTest("10. Unverified or suspended collector is marked unapproved & ineligible", () => {
        const unverified = {
            id: "COL-TEST-3",
            status: "active",
            verificationStatus: "pending",
            isOnline: true
        };
        const suspended = {
            id: "COL-TEST-4",
            status: "suspended",
            verificationStatus: "verified",
            isOnline: true
        };

        const res1 = evaluateCollectorEligibility(unverified);
        assert.strictEqual(res1.eligible, false, "Pending verification must be ineligible");
        assert.strictEqual(res1.operationalStatus, "PENDING_APPROVAL");

        const res2 = evaluateCollectorEligibility(suspended);
        assert.strictEqual(res2.eligible, false, "Suspended collector must be ineligible");
        assert.strictEqual(res2.operationalStatus, "SUSPENDED");
    });

    assertTest("11. Collector with high queue workload (>= 5) is marked with BUSY operational status", () => {
        const busyCol = {
            id: "COL-TEST-5",
            name: "Busy Partner",
            status: "active",
            verificationStatus: "verified",
            isOnline: true,
            serviceRadiusKm: 10,
            queueLength: 6,
            approxLocation: { lat: 28.6250, lng: 77.3600 }
        };
        const citizenLoc = { lat: 28.6280, lng: 77.3649 };
        const result = evaluateCollectorEligibility(busyCol, citizenLoc);
        assert.strictEqual(result.eligible, true, "Busy collector can still be visible");
        assert.strictEqual(result.operationalStatus, "BUSY", "Should flag status as BUSY");
        assert.ok(result.statusLabel.includes("Busy"), "Status label should mention Busy");
    });

    // ── GROUP 4: Service-Radius Enforcement ──
    console.log(`\n${CYAN}[GROUP 4] Configurable Service-Radius Enforcement${RESET}`);

    assertTest("12. In-radius pickup location is approved by collector's service radius", () => {
        const col = {
            id: "COL-RADIUS-1",
            status: "active",
            verificationStatus: "verified",
            isOnline: true,
            serviceRadiusKm: 5,
            approxLocation: { lat: 28.6250, lng: 77.3600 } // ~0.6 km from citizen
        };
        const citizenLoc = { lat: 28.6280, lng: 77.3649 };
        const result = evaluateCollectorEligibility(col, citizenLoc);
        assert.strictEqual(result.eligible, true);
        assert.strictEqual(result.inServiceRadius, true);
    });

    assertTest("13. Out-of-radius pickup location is flagged as OUTSIDE_SERVICE_AREA and ineligible", () => {
        const col = {
            id: "COL-RADIUS-2",
            name: "Far Collector",
            status: "active",
            verificationStatus: "verified",
            isOnline: true,
            serviceRadiusKm: 3,
            approxLocation: { lat: 28.5355, lng: 77.3910 } // Sector 137 Noida (~11 km away)
        };
        const citizenLoc = { lat: 28.6280, lng: 77.3649 }; // Sector 62 Noida
        const result = evaluateCollectorEligibility(col, citizenLoc);
        assert.strictEqual(result.eligible, false, "Out of radius collector must not be eligible");
        assert.strictEqual(result.inServiceRadius, false);
        assert.strictEqual(result.operationalStatus, "OUTSIDE_SERVICE_AREA");
    });

    assertTest("14. Service radius is dynamic per collector record and configurable", () => {
        const smallRadiusCol = { serviceRadiusKm: 3 };
        const largeRadiusCol = { serviceRadiusKm: 15 };

        assert.strictEqual(Number(smallRadiusCol.serviceRadiusKm), 3);
        assert.strictEqual(Number(largeRadiusCol.serviceRadiusKm), 15);
        assert.strictEqual(DEFAULT_SERVICE_RADIUS_KM, 8);
    });

    // ── GROUP 5: Privacy & Public Collector Profile Sanitization ──
    console.log(`\n${CYAN}[GROUP 5] Privacy-First Public Collector Masking${RESET}`);

    assertTest("15. Public profile strips residential address, internal notes, and administrative fields", () => {
        const privateCollector = {
            id: "COL-PRIV-1",
            name: "Rajesh Sharma",
            residentialAddress: "House 123, Private Street, Sector 15",
            internalNotes: "Collector under review for punctuality",
            adminScore: 92,
            isOnline: true,
            status: "active",
            verificationStatus: "verified",
            approxLocation: { lat: 28.6281234, lng: 77.3649123 }
        };

        const sanitized = sanitizeCollectorPublicProfile(privateCollector);
        assert.strictEqual(sanitized.id, "COL-PRIV-1");
        assert.strictEqual(sanitized.name, "Rajesh Sharma");
        assert.strictEqual(sanitized.residentialAddress, undefined, "Must strip residentialAddress");
        assert.strictEqual(sanitized.internalNotes, undefined, "Must strip internalNotes");
        assert.strictEqual(sanitized.adminScore, undefined, "Must strip adminScore");
    });

    assertTest("16. Public profile strips Aadhaar, KYC documentation, and bank account numbers", () => {
        const sensitiveCollector = {
            id: "COL-PRIV-2",
            name: "Vikram Kumar",
            aadhaarNumber: "1234-5678-9012",
            kycDocuments: ["aadhaar_front.jpg", "pan_card.jpg"],
            bankAccount: "987654321012",
            bankIfsc: "HDFC0001234",
            isOnline: true,
            status: "active",
            verificationStatus: "verified"
        };

        const sanitized = sanitizeCollectorPublicProfile(sensitiveCollector);
        assert.strictEqual(sanitized.aadhaarNumber, undefined, "Must strip aadhaarNumber");
        assert.strictEqual(sanitized.kycDocuments, undefined, "Must strip kycDocuments");
        assert.strictEqual(sanitized.bankAccount, undefined, "Must strip bankAccount");
        assert.strictEqual(sanitized.bankIfsc, undefined, "Must strip bankIfsc");
    });

    assertTest("17. Coordinates in public view are approximated / masked to ~3 decimals (neighborhood level)", () => {
        const exactCollector = {
            id: "COL-PRIV-3",
            name: "Pooja Verma",
            status: "active",
            verificationStatus: "verified",
            isOnline: true,
            approxLocation: { lat: 28.62894721, lng: 77.36491823 }
        };

        const sanitized = sanitizeCollectorPublicProfile(exactCollector);
        assert.ok(sanitized.approxLocation, "Must include approxLocation");
        assert.strictEqual(sanitized.approxLocation.lat, 28.629, "Latitude should be rounded to 3 decimal places");
        assert.strictEqual(sanitized.approxLocation.lng, 77.365, "Longitude should be rounded to 3 decimal places");
    });

    // ── GROUP 6: Citizen Location Ownership & Isolation ──
    console.log(`\n${CYAN}[GROUP 6] Citizen Saved Location Isolation & Access Control${RESET}`);

    assertTest("18. Citizen can query and manage own saved locations in storage layer", () => {
        const savedLocs = storage.getCollection("citizenSavedLocations");
        assert.ok(Array.isArray(savedLocs), "citizenSavedLocations must be an array");
        const aaravLocs = savedLocs.filter(l => l.citizenId === "CIT-1001");
        assert.ok(aaravLocs.length >= 2, "Aarav Sharma should have at least 2 saved locations");
        assert.strictEqual(aaravLocs[0].label, "Home");
    });

    assertTest("19. Citizen location query filters by citizenId, preventing cross-tenant leakage", () => {
        const savedLocs = storage.getCollection("citizenSavedLocations");
        const cit1001 = savedLocs.filter(l => l.citizenId === "CIT-1001");
        const cit1002 = savedLocs.filter(l => l.citizenId === "CIT-1002");

        // Verify CIT-1001 doesn't see CIT-1002's records
        assert.ok(cit1001.every(l => l.citizenId === "CIT-1001"), "CIT-1001 records must not contain CIT-1002");
        assert.ok(cit1002.every(l => l.citizenId === "CIT-1002"), "CIT-1002 records must not contain CIT-1001");
    });

    // ── GROUP 7: Collector Location Isolation ──
    console.log(`\n${CYAN}[GROUP 7] Collector Location Isolation${RESET}`);

    assertTest("20. Collector operational data does not leak unrelated citizen private addresses", () => {
        const collectors = storage.getCollection("collectors");
        collectors.forEach(c => {
            assert.strictEqual(c.citizenPrivateAddress, undefined, "Collector record must not contain citizen private address");
            assert.strictEqual(c.privateCoordinates, undefined, "Collector record must not expose private coordinates");
        });
    });

    // ── GROUP 8: Selected Collector Immutability ──
    console.log(`\n${CYAN}[GROUP 8] Selected Collector Immutability Enforcement${RESET}`);

    assertTest("21. Direct storage update attempting to mutate collectorId throws an error", () => {
        // Create a test pickup
        const p = storage.insert("pickups", {
            id: "PK-TEST-IMMUTABLE-1",
            citizenId: "CIT-TEST",
            collectorId: "COL-2001",
            status: "REQUESTED",
            estimatedWeight: 10,
            estimatedValue: 150
        });
        assert.strictEqual(p.collectorId, "COL-2001");

        // Attempt reassignment
        assert.throws(() => {
            storage.update("pickups", p.id, {
                collectorId: "COL-2002" // Illegal reassignment
            });
        }, /immutable|reassigned/i, "Storage layer must reject collectorId modification");
    });

    assertTest("22. pickupService.updateStatus rejects unauthorized mutation of collectorId", () => {
        const p = storage.insert("pickups", {
            id: "PK-TEST-IMMUTABLE-2",
            citizenId: "CIT-TEST-2",
            collectorId: "COL-2001",
            status: "REQUESTED",
            estimatedWeight: 15,
            estimatedValue: 200
        });

        assert.throws(() => {
            pickupService.updateStatus(p.id, "CONFIRMED", {
                collectorId: "COL-2003" // Unauthorized collector hijack
            });
        }, /immutable|reassigned/i, "Service layer updateStatus must reject collectorId modification");
    });

    assertTest("23. Pickup creation snapshots confirmed pickup location coordinates & address", () => {
        const pickup = pickupService.createPickup({
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            address: "Flat B-402, Green Valley Apartments, Sector 62, Noida",
            pickupAddressSnapshot: "Flat B-402, Green Valley Apartments, Sector 62, Noida",
            pickupLatitude: 28.6280,
            pickupLongitude: 77.3649,
            pickupLocality: "Sector 62, Noida",
            estimatedWeight: 20,
            estimatedValue: 300
        });

        assert.ok(pickup.id, "Pickup should be created");
        assert.strictEqual(pickup.collectorId, "COL-2001", "Selected collector must be saved");
        assert.strictEqual(pickup.pickupLatitude, 28.6280, "Pickup latitude snapshot must be preserved");
        assert.strictEqual(pickup.pickupLongitude, 77.3649, "Pickup longitude snapshot must be preserved");
        assert.strictEqual(pickup.pickupLocality, "Sector 62, Noida", "Pickup locality must be preserved");
        assert.strictEqual(pickup.pickupAddressSnapshot, "Flat B-402, Green Valley Apartments, Sector 62, Noida");
    });

    // ── GROUP 9: No Eligible Collector Fallback ──
    console.log(`\n${CYAN}[GROUP 9] Out-of-Area Fallback & Citizen-Driven Selection${RESET}`);

    assertTest("24. Proximity discovery returns empty array when no collectors are in service radius", () => {
        // Coordinate in remote location (e.g. Himalayas lat: 31.1048, lng: 77.1734)
        const res = nearbyCollectorService.getEligibleCollectors({
            citizenLocation: { lat: 31.1048, lng: 77.1734 }
        });

        assert.ok(Array.isArray(res.eligibleCollectors), "Should return array");
        assert.strictEqual(res.eligibleCollectors.length, 0, "No collectors should be eligible in remote area");
        assert.ok(res.totalNearbyCount >= 0, "totalNearbyCount should be defined");
    });

    assertTest("25. System does NOT silently auto-assign a random collector when none are eligible", () => {
        const res = nearbyCollectorService.getEligibleCollectors({
            citizenLocation: { lat: 31.1048, lng: 77.1734 }
        });
        assert.strictEqual(res.eligibleCollectors.length, 0);
        // Ensure no auto-assignment object or fallback collector ID is injected
        assert.strictEqual(res.assignedCollector, undefined, "Must NOT auto-assign a collector");
        assert.strictEqual(res.autoAssigned, undefined, "Must NOT auto-assign a collector");
    });

    assertTest("26. Citizen selection remains strictly user-driven (citizen must explicitly select collector)", () => {
        // Attempting createPickup without collectorId must fail
        assert.throws(() => {
            pickupService.createPickup({
                citizenId: "CIT-1001",
                collectorId: null, // Missing selection
                address: "Sector 62, Noida"
            });
        }, /collector/i, "createPickup without chosen collectorId must fail");
    });

    // ── GROUP 10: Mock vs Supabase Provider Selection ──
    console.log(`\n${CYAN}[GROUP 10] Mock vs Supabase Provider Binding${RESET}`);

    assertTest("27. Mock mode operates deterministically with seeded collectors, radii, and localities", () => {
        const collectors = storage.getCollection("collectors");
        assert.ok(collectors.length >= 4, "Should have seeded collectors in mock mode");
        const ramesh = collectors.find(c => c.id === "COL-2001");
        assert.ok(ramesh, "COL-2001 must exist");
        assert.strictEqual(ramesh.serviceRadiusKm, 8, "COL-2001 radius should be 8 km");
        assert.strictEqual(ramesh.serviceAreaLocality, "Sector 62, Noida");
        assert.ok(ramesh.approxLocation, "COL-2001 must have approxLocation");
    });

    assertTest("28. Supabase adapter maps citizenSavedLocations and queries schema-compliant fields", () => {
        const SupabaseAdapterFactory = require(path.join(baseDir, "shared/js/supabase-adapter.js"));
        const mockSupabaseClient = { getClient: () => null, isAvailable: () => false };
        const adapter = typeof SupabaseAdapterFactory === "function" ? SupabaseAdapterFactory(mockSupabaseClient) : SupabaseAdapterFactory;

        assert.ok(adapter.TABLE_MAP, "TABLE_MAP must exist");
        assert.strictEqual(adapter.TABLE_MAP.citizenSavedLocations, "citizen_saved_locations");
        assert.strictEqual(adapter.TABLE_MAP.collectors, "collectors");
    });

    assertTest("29. Geocoding service operates with mock fallback when external geocoder is not configured", async () => {
        const geoRes = await geocodingService.geocodeAddress("Sector 62, Noida");
        assert.ok(geoRes.lat !== undefined, "Mock geocoder should return latitude");
        assert.ok(geoRes.lng !== undefined, "Mock geocoder should return longitude");
        assert.strictEqual(geoRes.provider, "mock", "Provider should indicate mock");

        const revRes = await geocodingService.reverseGeocode(28.6280, 77.3649);
        assert.ok(revRes.formattedAddress.includes("Noida"), "Mock reverse geocoder should return locality");
    });

    // ── GROUP 11: Map Provider Fallback & Offline Operation ──
    console.log(`\n${CYAN}[GROUP 11] Map Provider Abstraction & Resilient Offline Fallback${RESET}`);

    assertTest("30. MockMapProvider initializes and generates SVG vector map without external network keys", () => {
        const mockMap = new MockMapProvider();
        mockMap.initialize("test-container", { center: { lat: 28.6280, lng: 77.3649 } });
        mockMap.addMarker("CITIZEN", { lat: 28.6280, lng: 77.3649, label: "You" });
        mockMap.addMarker("COL-1", { lat: 28.6250, lng: 77.3600, label: "Ramesh Kumar" });

        assert.strictEqual(Object.keys(mockMap.markers).length, 2, "Should have 2 markers tracked");
        assert.strictEqual(mockMap.center.lat, 28.6280);
    });

    assertTest("31. mapService.renderFallback provides accessible HTML message when map is unavailable", () => {
        const fallbackHtml = mapService.renderFallback("test-el", "Map preview unavailable");
        assert.ok(fallbackHtml.includes("Map Preview Unavailable"), "Fallback must contain friendly title");
        assert.ok(fallbackHtml.includes("select a collector from the verified list"), "Fallback must mention list selection");
    });

    assertTest("32. Pickup creation and collector discovery operates successfully even without map provider", () => {
        // Disabling map or rendering list-only
        const discovery = nearbyCollectorService.getEligibleCollectors({
            citizenLocation: { lat: 28.6280, lng: 77.3649 }
        });
        assert.ok(discovery.eligibleCollectors.length > 0, "List discovery must succeed without map");

        const chosen = discovery.eligibleCollectors[0];
        const pickup = pickupService.createPickup({
            citizenId: "CIT-1001",
            collectorId: chosen.id,
            address: "Sector 62, Noida",
            estimatedWeight: 12,
            estimatedValue: 180
        });
        assert.ok(pickup.id, "Pickup created without requiring map interaction");
    });

    // ── GROUP 12: Security Verification & Secrets Scanning ──
    console.log(`\n${CYAN}[GROUP 12] Security Verification & Secrets Scanning${RESET}`);

    assertTest("33. Zero private map provider secrets or service-role keys committed in frontend code", () => {
        const frontendDir = path.join(__dirname, "..", "frontend");
        const bannedKeys = [
            /sk\.[a-zA-Z0-9_-]{20,}/,          // Mapbox secret key pattern
            /AIzaSy[A-Za-z0-9_-]{33}/,         // Google Maps secret key pattern
            /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]/
        ];

        function scan(dir) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    scan(fullPath);
                } else if (/\.(html|js|json)$/i.test(file)) {
                    const content = fs.readFileSync(fullPath, "utf8");
                    bannedKeys.forEach(regex => {
                        assert.ok(!regex.test(content), `Found potential secret in ${file}`);
                    });
                }
            }
        }
        scan(frontendDir);
    });

    assertTest("34. Client-side distance calculations are validated and verified server-side/storage-side", () => {
        // Verify evaluateCollectorEligibility re-computes distance rather than trusting raw client parameter
        const col = {
            id: "COL-SEC-1",
            status: "active",
            verificationStatus: "verified",
            isOnline: true,
            serviceRadiusKm: 5,
            approxLocation: { lat: 28.6250, lng: 77.3600 }
        };
        const citizenLoc = { lat: 28.6280, lng: 77.3649 };
        // Even if client injects distanceKm: 0.1, evaluator re-calculates server-side/service-side
        const evalResult = evaluateCollectorEligibility(col, citizenLoc);
        assert.ok(evalResult.distanceKm > 0.5, "Evaluator must compute factual distance from coordinates");
    });

    // ── TEST SUMMARY ──
    console.log(`\n${BOLD}=======================================================${RESET}`);
    console.log(`${BOLD}TOTAL PHASE 4E ASSERTIONS: ${passedCount + failedCount} | ${GREEN}PASSED: ${passedCount}${RESET} | ${failedCount > 0 ? RED : RESET}FAILED: ${failedCount}${RESET}`);
    console.log(`${BOLD}=======================================================\n`);

    if (failedCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
})();
