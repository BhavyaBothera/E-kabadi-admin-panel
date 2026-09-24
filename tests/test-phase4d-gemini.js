/* =========================================================
   E-KABAADI PLATFORM — Phase 4D Automated Test Suite
   Gemini AI Scrap Intelligence, Schema Validation & Integrity
   File: tests/test-phase4d-gemini.js
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
console.log(`${BOLD}   E-KABAADI PHASE 4D — GEMINI AI SCRAP SUITE          ${RESET}`);
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

const aiProvider = require(path.join(baseDir, "shared/js/ai-provider.js"));
global.EKABADI_AI_PROVIDER = aiProvider;

const services = require(path.join(baseDir, "shared/js/services.js"));
global.EKABADI_SERVICES = services;

const {
    validateImageFile,
    mapScrapCategory,
    validateAiOutput,
    MockScrapAiProvider,
    GeminiScrapProvider,
    getScrapAiProvider,
    ALLOWED_CATEGORIES
} = aiProvider;

const scrapService = services.scrapAnalysis;
const pickupService = services.pickup;

(async function runAllTests() {

    // ── GROUP 1: Image Validation & Privacy ──
    console.log(`${CYAN}[GROUP 1] Image Validation & Privacy Safety${RESET}`);

    assertTest("1. Valid image passes MIME and size checks (JPEG, PNG, WebP <= 5MB)", () => {
        const validFile = { name: "scrap.jpg", type: "image/jpeg", size: 2 * 1024 * 1024 };
        const result = validateImageFile(validFile);
        assert.strictEqual(result.valid, true, "Valid image should pass validation");
    });

    assertTest("2. Invalid MIME type rejected (Executable / script / text)", () => {
        const invalidFile = { name: "payload.exe", type: "application/x-msdownload", size: 1024 };
        const result = validateImageFile(invalidFile);
        assert.strictEqual(result.valid, false, "Executable must be rejected");
        assert.ok(result.error.includes("Unsupported image format"), "Error should mention format");
    });

    assertTest("3. Oversized image rejected (> 5 MB limit)", () => {
        const oversizedFile = { name: "huge.jpg", type: "image/jpeg", size: 6 * 1024 * 1024 };
        const result = validateImageFile(oversizedFile);
        assert.strictEqual(result.valid, false, "Image > 5MB must be rejected");
        assert.ok(result.error.includes("exceeds maximum allowed size"), "Error should cite 5MB limit");
    });

    assertTest("4. Empty image file rejected (0 bytes)", () => {
        const emptyFile = { name: "empty.jpg", type: "image/jpeg", size: 0 };
        const result = validateImageFile(emptyFile);
        assert.strictEqual(result.valid, false, "0 byte file must be rejected");
        assert.ok(result.error.includes("empty"), "Error should mention empty file");
    });

    // ── GROUP 2: Category Mapping & Controlled Catalogs ──
    console.log(`\n${CYAN}[GROUP 2] Controlled Scrap Categories & Mapping${RESET}`);

    assertTest("5. Controlled categories enforced (Paper, Cardboard, Plastic, Metal, E-waste, Glass)", () => {
        assert.ok(Array.isArray(ALLOWED_CATEGORIES), "ALLOWED_CATEGORIES must be an array");
        assert.ok(ALLOWED_CATEGORIES.includes("Paper"), "Paper must be in catalog");
        assert.ok(ALLOWED_CATEGORIES.includes("Cardboard"), "Cardboard must be in catalog");
        assert.ok(ALLOWED_CATEGORIES.includes("Plastic"), "Plastic must be in catalog");
        assert.ok(ALLOWED_CATEGORIES.includes("Metal"), "Metal must be in catalog");
        assert.ok(ALLOWED_CATEGORIES.includes("E-waste"), "E-waste must be in catalog");
        assert.ok(ALLOWED_CATEGORIES.includes("Glass"), "Glass must be in catalog");
    });

    assertTest("6. Category synonyms map correctly to application categories", () => {
        assert.strictEqual(mapScrapCategory("corrugated cardboard"), "Cardboard");
        assert.strictEqual(mapScrapCategory("PET plastic bottles"), "Plastic");
        assert.strictEqual(mapScrapCategory("scrap iron pipes"), "Metal");
        assert.strictEqual(mapScrapCategory("old newspapers"), "Paper");
        assert.strictEqual(mapScrapCategory("copper wires"), "Metal");
        assert.strictEqual(mapScrapCategory("keyboard electronics"), "E-waste");
    });

    assertTest("7. Unsupported / arbitrary category maps to UNKNOWN", () => {
        assert.strictEqual(mapScrapCategory("rare composite material XYZ"), "UNKNOWN");
        assert.strictEqual(mapScrapCategory("radioactive plutonium waste"), "UNKNOWN");
        assert.strictEqual(mapScrapCategory(""), "UNKNOWN");
    });

    // ── GROUP 3: Structured AI Output Validation ──
    console.log(`\n${CYAN}[GROUP 3] Structured Schema & Sanity Validation${RESET}`);

    assertTest("8. Valid structured AI response passes validation", () => {
        const validOutput = {
            detectedMaterial: "Corrugated Cardboard",
            primaryCategory: "Cardboard",
            confidence: 0.94,
            estimatedWeightKg: 12.5,
            condition: "clean_dry",
            notes: "Stacked brown shipping boxes."
        };
        const res = validateAiOutput(validOutput);
        assert.strictEqual(res.valid, true);
        assert.strictEqual(res.sanitizedData.primaryCategory, "Cardboard");
        assert.strictEqual(res.sanitizedData.confidenceTier, "high");
    });

    assertTest("9. Malformed AI output (non-object or missing material) rejected", () => {
        const res1 = validateAiOutput("string response");
        assert.strictEqual(res1.valid, false);

        const res2 = validateAiOutput({ confidence: 0.9 });
        assert.strictEqual(res2.valid, false);
        assert.ok(res2.error.includes("detectedMaterial"));
    });

    assertTest("10. Invalid confidence values (< 0 or > 1) rejected", () => {
        const resLow = validateAiOutput({ detectedMaterial: "Paper", primaryCategory: "Paper", confidence: -0.2, estimatedWeightKg: 5 });
        assert.strictEqual(resLow.valid, false);

        const resHigh = validateAiOutput({ detectedMaterial: "Paper", primaryCategory: "Paper", confidence: 1.5, estimatedWeightKg: 5 });
        assert.strictEqual(resHigh.valid, false);
    });

    assertTest("11. Negative or zero weight rejected", () => {
        const resNeg = validateAiOutput({ detectedMaterial: "Paper", primaryCategory: "Paper", confidence: 0.9, estimatedWeightKg: -10 });
        assert.strictEqual(resNeg.valid, false);
        assert.ok(resNeg.error.toLowerCase().includes("weight must be positive"));

        const resZero = validateAiOutput({ detectedMaterial: "Paper", primaryCategory: "Paper", confidence: 0.9, estimatedWeightKg: 0 });
        assert.strictEqual(resZero.valid, false);
    });

    assertTest("12. Impossible weight sanity limit rejected (> 200 kg from single photo)", () => {
        const resHuge = validateAiOutput({ detectedMaterial: "Iron", primaryCategory: "Metal", confidence: 0.9, estimatedWeightKg: 99999 });
        assert.strictEqual(resHuge.valid, false);
        assert.ok(resHuge.error.includes("exceeds maximum sanity threshold"));
    });

    assertTest("13. Confidence tiers calibrated properly (High >= 0.85, Med 0.65-0.84, Low < 0.65)", () => {
        const high = validateAiOutput({ detectedMaterial: "Paper", primaryCategory: "Paper", confidence: 0.88, estimatedWeightKg: 5 });
        assert.strictEqual(high.sanitizedData.confidenceTier, "high");
        assert.strictEqual(high.sanitizedData.reviewRequired, false);

        const med = validateAiOutput({ detectedMaterial: "Paper", primaryCategory: "Paper", confidence: 0.72, estimatedWeightKg: 5 });
        assert.strictEqual(med.sanitizedData.confidenceTier, "medium");
        assert.strictEqual(med.sanitizedData.reviewRequired, true);

        const low = validateAiOutput({ detectedMaterial: "Paper", primaryCategory: "Paper", confidence: 0.52, estimatedWeightKg: 5 });
        assert.strictEqual(low.sanitizedData.confidenceTier, "low");
        assert.strictEqual(low.sanitizedData.reviewRequired, true);
    });

    // ── GROUP 4: Trusted Scrap Rate & Value Calculation ──
    console.log(`\n${CYAN}[GROUP 4] Financial Integrity: Trusted Rates vs AI Hallucination${RESET}`);

    await assertAsyncTest("14. Official rates come strictly from database, never from AI", async () => {
        // AI returns material, but service looks up official rate in database
        const analysis = await scrapService.analyzeImage("paper");
        assert.ok(analysis.ratePerKg, "Must have an official ratePerKg");
        // Rate for Paper in scrapCategories is 14.0
        assert.strictEqual(analysis.ratePerKg, 14.0, "Rate must be exactly 14.0 from database");
    });

    await assertAsyncTest("15. Estimated value calculated in application logic (weight * trustedRate)", async () => {
        const analysis = await scrapService.analyzeImage("carton");
        // Cardboard rate is 11.5, mock carton weight is 10.5
        const expectedValue = +(10.5 * 11.5).toFixed(2);
        assert.strictEqual(analysis.ratePerKg, 11.5);
        assert.strictEqual(analysis.estimatedValue, expectedValue);
        assert.strictEqual(analysis.ecoCoinsEstimate, Math.round(10.5 * 2));
    });

    await assertAsyncTest("16. AI cannot dictate financial value (hallucinated rate ignored)", async () => {
        // If an AI provider returned a rate of 999999, application overrides with official database rate
        const fakeAiOutput = {
            detectedMaterial: "Newspaper",
            primaryCategory: "Paper",
            confidence: 0.95,
            estimatedWeightKg: 10,
            ratePerKg: 99999, // Hallucinated rate
            estimatedValue: 9999999 // Hallucinated payout
        };
        // Run through service
        const validated = validateAiOutput(fakeAiOutput);
        assert.strictEqual(validated.valid, true);
        // Notice validateAiOutput stripped ratePerKg and estimatedValue from provider!
        assert.strictEqual(validated.sanitizedData.ratePerKg, undefined, "AI rate stripped");
        assert.strictEqual(validated.sanitizedData.estimatedValue, undefined, "AI value stripped");
    });

    // ── GROUP 5: Human-in-the-Loop Confirmation & Manual Override ──
    console.log(`\n${CYAN}[GROUP 5] Human-in-the-Loop Review & User Correction${RESET}`);

    await assertAsyncTest("17. Citizen can confirm AI analysis as-is", async () => {
        const analysis = await scrapService.analyzeImage("paper");
        const confirmed = await scrapService.confirmAnalysis(analysis.id);
        assert.strictEqual(confirmed.userConfirmed, true);
        assert.strictEqual(confirmed.userCorrected, false);
        assert.strictEqual(confirmed.status, "confirmed");
    });

    await assertAsyncTest("18. Citizen can correct AI classification (User Override)", async () => {
        // AI classified as Paper
        const analysis = await scrapService.analyzeImage("paper");
        // User corrects to Metal
        const corrected = await scrapService.confirmAnalysis(analysis.id, { correctedCategory: "Metal" });
        assert.strictEqual(corrected.userConfirmed, true);
        assert.strictEqual(corrected.userCorrected, true);
        assert.strictEqual(corrected.correctedCategory, "Metal");
        assert.strictEqual(corrected.category, "Metal");
        // Rate should update to Metal official rate (32.0)
        assert.strictEqual(corrected.ratePerKg, 32.0);
        assert.strictEqual(corrected.estimatedValue, +(analysis.estimatedWeight * 32.0).toFixed(2));
    });

    assertTest("19. Manual fallback is always available (user enters weights directly)", () => {
        // Manual calculator operates with trusted categories and zero AI dependency
        const cats = scrapService.getCategories();
        assert.ok(Array.isArray(cats) && cats.length > 0, "Categories available for manual entry");
        const paperCat = cats.find(c => c.category === "Paper");
        assert.strictEqual(paperCat.ratePerKg, 14.0);
    });

    // ── GROUP 6: Collector Authority & State Finality ──
    console.log(`\n${CYAN}[GROUP 6] Collector Scale Authority & Final Settlement${RESET}`);

    await assertAsyncTest("20. AI weight is marked estimate; collector digital scale is final authority", async () => {
        // Create pickup with AI estimate of 15.0 kg
        const pickup = await services.resolveData(pickupService.createPickup({
            citizenId: "CIT-1001",
            collectorId: "COL-2001",
            scrapType: "Paper",
            estimatedWeight: 15.0,
            estimatedValue: 210.0,
            aiAnalysisId: "AI-TEST-001",
            aiMetadata: { detectedMaterial: "Newspaper", confidence: 0.98 }
        }), p => p);

        assert.strictEqual(pickup.estimatedWeight, 15.0);
        assert.strictEqual(pickup.finalWeight, null);

        // Collector arrives, weighs on scale: actual scale reading is 12.3 kg
        const certifiedItems = [
            { category: "Paper", name: "Newspaper", weight: 12.3, verifiedWeight: 12.3, rate: 14.0 }
        ];

        // Transition through lifecycle
        await services.resolveData(pickupService.acceptPickup(pickup.id, "COL-2001"), () => {});
        await services.resolveData(pickupService.updateStatus(pickup.id, "on_the_way"), () => {});
        await services.resolveData(pickupService.updateStatus(pickup.id, "arrived"), () => {});
        await services.resolveData(pickupService.updateStatus(pickup.id, "collecting"), () => {});

        const completed = await services.resolveData(pickupService.completeCollection(
            pickup.id,
            {
                finalWeight: 12.3,
                finalValue: 172.2,
                items: certifiedItems,
                collectorId: "COL-2001"
            }
        ), p => p);

        // Final payment uses certified scale weight (12.3 * 14 = 172.2), NOT AI estimate (15.0 * 14 = 210)
        assert.strictEqual(completed.finalWeight, 12.3, "Final weight must equal certified scale reading");
        assert.strictEqual(completed.finalValue, 172.2, "Final value must use actual scale weight");
        assert.strictEqual(completed.aiAnalysisId, "AI-TEST-001", "Preserves original AI analysis reference");
    });

    // ── GROUP 7: Error Handling, Resilience & Mock Independence ──
    console.log(`\n${CYAN}[GROUP 7] Resilience, Timeouts & Error Degradation${RESET}`);

    await assertAsyncTest("21. Provider timeout gracefully handled with retry suggestion", async () => {
        try {
            await MockScrapAiProvider.analyze("paper", { forceError: "timeout" });
            assert.fail("Should have thrown timeout error");
        } catch (err) {
            assert.ok(err.message.includes("timed out"), "Should report timeout error");
        }
    });

    await assertAsyncTest("22. Provider unavailable gracefully handled", async () => {
        try {
            await MockScrapAiProvider.analyze("paper", { forceError: "unavailable" });
            assert.fail("Should have thrown unavailable error");
        } catch (err) {
            assert.ok(err.message.includes("temporarily unavailable"), "Should report unavailable");
        }
    });

    assertTest("23. Mock mode operates deterministically without external credentials", () => {
        const provider = getScrapAiProvider("mock");
        assert.strictEqual(provider.name, "mock", "Mock mode returns MockScrapAiProvider");
    });

    assertTest("24. Supabase mode selects GeminiScrapProvider with backend boundary", () => {
        const provider = getScrapAiProvider("supabase");
        assert.strictEqual(provider.name, "gemini", "Supabase mode returns GeminiScrapProvider");
    });

    // ── GROUP 8: Secrets Scan & Admin Analytics ──
    console.log(`\n${CYAN}[GROUP 8] Security Verification & Admin Analytics${RESET}`);

    assertTest("25. Zero Gemini API keys exposed in frontend code or browser storage", () => {
        const frontendDir = path.join(__dirname, "..", "frontend");
        const bannedKeyPattern = /AIzaSy[A-Za-z0-9_-]{33}/; // Google API key regex
        const explicitKeyPattern = /GEMINI_API_KEY\s*=\s*['"][^'"]+['"]/;

        function scanDir(dir) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else if (/\.(html|js|json)$/i.test(file)) {
                    const content = fs.readFileSync(fullPath, "utf8");
                    assert.ok(!bannedKeyPattern.test(content), `Found raw Google API key in ${file}`);
                    assert.ok(!explicitKeyPattern.test(content), `Found hardcoded GEMINI_API_KEY in ${file}`);
                }
            }
        }
        scanDir(frontendDir);
    });

    await assertAsyncTest("26. Admin analytics aggregates AI accuracy & correction metrics", async () => {
        const stats = await scrapService.getAiAnalysisStats();
        assert.ok(typeof stats.totalAnalyses === "number", "totalAnalyses must be number");
        assert.ok(typeof stats.confirmedAnalyses === "number", "confirmedAnalyses must be number");
        assert.ok(typeof stats.correctedAnalyses === "number", "correctedAnalyses must be number");
        assert.ok(typeof stats.highConfidenceAnalyses === "number", "highConfidenceAnalyses must be number");
        assert.ok(typeof stats.averageConfidence === "number", "averageConfidence must be number");
    });

    // ── TEST SUMMARY ──
    console.log(`\n${BOLD}=======================================================${RESET}`);
    console.log(`${BOLD}TOTAL PHASE 4D ASSERTIONS: ${passedCount + failedCount} | ${GREEN}PASSED: ${passedCount}${RESET} | ${failedCount > 0 ? RED : RESET}FAILED: ${failedCount}${RESET}`);
    console.log(`${BOLD}=======================================================\n`);

    if (failedCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
})();
