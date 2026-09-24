/* =========================================================
   E-KABAADI PLATFORM — Shared AI Vision & Intelligence Module
   Phase 4D: Real Gemini AI Provider, Validation & Category Mapping
   File: frontend/shared/js/ai-provider.js
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EKABADI_AI_PROVIDER = factory();
        root.ScrapAiProviderFactory = root.EKABADI_AI_PROVIDER;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    // ─────────────────────────────────────────────
    // 1. CONSTANTS & CONTROLLED CATEGORIES
    // ─────────────────────────────────────────────
    const ALLOWED_CATEGORIES = [
        "Paper",
        "Cardboard",
        "Plastic",
        "Metal",
        "E-waste",
        "Glass"
    ];

    const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
    const MAX_SANITY_WEIGHT_KG = 200.0;           // Single photo max weight limit

    const CATEGORY_SYNONYMS = {
        "paper": "Paper",
        "newspaper": "Paper",
        "notebooks": "Paper",
        "office paper": "Paper",
        "books": "Paper",
        "magazines": "Paper",
        "kraft": "Paper",

        "cardboard": "Cardboard",
        "corrugated": "Cardboard",
        "carton": "Cardboard",
        "patti": "Cardboard",
        "brown box": "Cardboard",
        "shipping box": "Cardboard",

        "plastic": "Plastic",
        "pet": "Plastic",
        "pet bottle": "Plastic",
        "pet bottles": "Plastic",
        "hdpe": "Plastic",
        "rigid plastic": "Plastic",
        "milk pouch": "Plastic",
        "polythene": "Plastic",

        "metal": "Metal",
        "iron": "Metal",
        "steel": "Metal",
        "scrap iron": "Metal",
        "aluminum": "Metal",
        "aluminium": "Metal",
        "cans": "Metal",
        "drink can": "Metal",
        "copper": "Metal",
        "brass": "Metal",
        "pital": "Metal",
        "wire": "Metal",

        "e-waste": "E-waste",
        "ewaste": "E-waste",
        "electronic": "E-waste",
        "electronics": "E-waste",
        "circuit board": "E-waste",
        "pcb": "E-waste",
        "keyboard": "E-waste",
        "charger": "E-waste",
        "cables": "E-waste",

        "glass": "Glass",
        "glass bottle": "Glass",
        "glass jar": "Glass",
        "jars": "Glass"
    };

    // ─────────────────────────────────────────────
    // 2. IMAGE VALIDATION
    // ─────────────────────────────────────────────
    function validateImageFile(file) {
        if (!file) {
            return { valid: false, error: "No image file provided." };
        }

        const size = file.size !== undefined ? file.size : (file.length || 0);
        if (size <= 0) {
            return { valid: false, error: "Image file is empty (0 bytes)." };
        }

        if (size > MAX_IMAGE_SIZE_BYTES) {
            return { 
                valid: false, 
                error: `Image file exceeds maximum allowed size of 5 MB (${(size / (1024 * 1024)).toFixed(1)} MB provided).` 
            };
        }

        const type = (file.type || "").toLowerCase();
        const name = (file.name || "").toLowerCase();
        const validMime = ["image/jpeg", "image/png", "image/webp"].includes(type);
        const validExt = /\.(jpe?g|png|webp)$/i.test(name);

        if (!validMime && !validExt && type !== "") {
            return { 
                valid: false, 
                error: "Unsupported image format. Allowed formats: JPEG, PNG, WebP." 
            };
        }

        return { valid: true };
    }

    // ─────────────────────────────────────────────
    // 3. CATEGORY MAPPING & NORMALIZATION
    // ─────────────────────────────────────────────
    function mapScrapCategory(rawCategory) {
        if (!rawCategory || typeof rawCategory !== "string") {
            return "UNKNOWN";
        }
        const clean = rawCategory.trim().toLowerCase();
        
        // Exact synonym match
        if (CATEGORY_SYNONYMS[clean]) {
            return CATEGORY_SYNONYMS[clean];
        }

        // Substring search
        for (const [synonym, targetCat] of Object.entries(CATEGORY_SYNONYMS)) {
            if (clean.includes(synonym)) {
                return targetCat;
            }
        }

        // Exact match in allowed categories (case-insensitive)
        const direct = ALLOWED_CATEGORIES.find(c => c.toLowerCase() === clean);
        if (direct) return direct;

        return "UNKNOWN";
    }

    // ─────────────────────────────────────────────
    // 4. STRUCTURED AI RESPONSE VALIDATOR
    // ─────────────────────────────────────────────
    function validateAiOutput(data) {
        if (!data || typeof data !== "object") {
            return { valid: false, error: "AI output must be an object." };
        }

        // Required material description
        if (!data.detectedMaterial || typeof data.detectedMaterial !== "string" || !data.detectedMaterial.trim()) {
            return { valid: false, error: "Missing or invalid detectedMaterial field." };
        }

        // Category mapping
        const mappedCat = mapScrapCategory(data.primaryCategory);
        if (mappedCat === "UNKNOWN") {
            return { 
                valid: true, 
                reviewRequired: true, 
                unknownCategory: true,
                sanitizedData: {
                    ...data,
                    primaryCategory: "UNKNOWN",
                    confidenceTier: "low",
                    reviewRequired: true
                }
            };
        }

        // Confidence validation: [0.0, 1.0]
        const confidence = parseFloat(data.confidence);
        if (isNaN(confidence) || confidence < 0.0 || confidence > 1.0) {
            return { valid: false, error: `Invalid confidence score: ${data.confidence}. Must be between 0.0 and 1.0.` };
        }

        // Weight validation: > 0.0 and <= MAX_SANITY_WEIGHT_KG
        const weight = parseFloat(data.estimatedWeightKg);
        if (isNaN(weight) || weight <= 0.0) {
            return { valid: false, error: `Invalid estimated weight: ${data.estimatedWeightKg}. Weight must be positive.` };
        }

        if (weight > MAX_SANITY_WEIGHT_KG) {
            return { valid: false, error: `Estimated weight (${weight} kg) exceeds maximum sanity threshold of ${MAX_SANITY_WEIGHT_KG} kg.` };
        }

        // Normalize confidence tier
        const confidenceTier = confidence >= 0.85 ? "high" : (confidence >= 0.65 ? "medium" : "low");
        const reviewRequired = confidenceTier !== "high" || mappedCat === "UNKNOWN";

        // Detected items array
        const items = Array.isArray(data.detectedItems) ? data.detectedItems.map(item => ({
            material: String(item.material || mappedCat).slice(0, 60),
            category: mapScrapCategory(item.category || mappedCat),
            confidence: Math.min(1, Math.max(0, parseFloat(item.confidence) || confidence)),
            estimatedWeightKg: Math.min(MAX_SANITY_WEIGHT_KG, Math.max(0.1, parseFloat(item.estimatedWeightKg) || 1.0))
        })) : [{
            material: data.detectedMaterial,
            category: mappedCat,
            confidence: confidence,
            estimatedWeightKg: weight
        }];

        const sanitized = {
            success: true,
            analysisId: data.analysisId || ("AI-" + Math.random().toString(36).substring(2, 9)),
            provider: data.provider || "gemini",
            model: data.model || "gemini-1.5-flash",
            detectedMaterial: data.detectedMaterial.trim(),
            primaryCategory: mappedCat,
            confidence: +(confidence.toFixed(2)),
            confidenceTier,
            estimatedWeightKg: +(weight.toFixed(1)),
            condition: String(data.condition || "clean_dry"),
            notes: String(data.notes || "").slice(0, 250),
            detectedItems: items,
            reviewRequired,
            timestamp: data.timestamp || new Date().toISOString()
        };

        return { valid: true, sanitizedData: sanitized };
    }

    // ─────────────────────────────────────────────
    // 5. DETERMINISTIC MOCK AI PROVIDER
    // ─────────────────────────────────────────────
    const MockScrapAiProvider = {
        name: "mock",

        async analyze(imageInput, options = {}) {
            // Options allow simulating specific test outcomes
            const sampleType = options.sample || (typeof imageInput === "string" ? imageInput : "paper");

            // Handle forced test error scenarios
            if (options.forceError === "timeout") {
                return new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("AI analysis request timed out.")), 100);
                });
            }
            if (options.forceError === "unavailable") {
                return Promise.reject(new Error("AI analysis service is temporarily unavailable."));
            }
            if (options.forceError === "malformed") {
                return { malformed: true }; // Fails validation
            }

            // Return deterministic preset
            let rawResult;
            switch (sampleType) {
                case "carton":
                case "cardboard":
                    rawResult = {
                        detectedMaterial: "Corrugated Cardboard (Patti)",
                        primaryCategory: "Cardboard",
                        confidence: 0.95,
                        estimatedWeightKg: 10.5,
                        condition: "clean_dry",
                        notes: "Folded shipping cartons and packaging boxes.",
                        detectedItems: [
                            { material: "Corrugated Cardboard", category: "Cardboard", confidence: 0.95, estimatedWeightKg: 10.5 }
                        ]
                    };
                    break;
                case "plastic":
                    rawResult = {
                        detectedMaterial: "Sorted PET Beverage Bottles",
                        primaryCategory: "Plastic",
                        confidence: 0.91,
                        estimatedWeightKg: 8.0,
                        condition: "clean_dry",
                        notes: "Transparent Grade 1 PET beverage bottles.",
                        detectedItems: [
                            { material: "PET Bottles", category: "Plastic", confidence: 0.91, estimatedWeightKg: 8.0 }
                        ]
                    };
                    break;
                case "metal":
                    rawResult = {
                        detectedMaterial: "Mixed Metal (Iron & Brass)",
                        primaryCategory: "Metal",
                        confidence: 0.88,
                        estimatedWeightKg: 12.0,
                        condition: "clean_dry",
                        notes: "Heavy iron pipes and brass hardware.",
                        detectedItems: [
                            { material: "Iron Pipes", category: "Metal", confidence: 0.90, estimatedWeightKg: 8.0 },
                            { material: "Brass Valves", category: "Metal", confidence: 0.84, estimatedWeightKg: 4.0 }
                        ]
                    };
                    break;
                case "multi":
                    rawResult = {
                        detectedMaterial: "Mixed Household Recyclables",
                        primaryCategory: "Paper",
                        confidence: 0.89,
                        estimatedWeightKg: 25.5,
                        condition: "mixed",
                        notes: "Newspapers with cardboard boxes and plastic bottles.",
                        detectedItems: [
                            { material: "Newspapers", category: "Paper", confidence: 0.95, estimatedWeightKg: 15.0 },
                            { material: "Cardboard Cartons", category: "Cardboard", confidence: 0.92, estimatedWeightKg: 10.5 }
                        ]
                    };
                    break;
                case "low_confidence":
                    rawResult = {
                        detectedMaterial: "Unclear Mixed Scrap",
                        primaryCategory: "Plastic",
                        confidence: 0.54, // Low confidence
                        estimatedWeightKg: 6.0,
                        condition: "soiled",
                        notes: "Image resolution low or items obscured.",
                        detectedItems: [
                            { material: "Unclear Scrap", category: "Plastic", confidence: 0.54, estimatedWeightKg: 6.0 }
                        ]
                    };
                    break;
                case "unsupported":
                    rawResult = {
                        detectedMaterial: "Rare Composite Foam Material XYZ",
                        primaryCategory: "RareCompositeFoam", // Not in catalog
                        confidence: 0.75,
                        estimatedWeightKg: 4.0,
                        condition: "clean_dry",
                        notes: "Uncategorized industrial composite.",
                        detectedItems: []
                    };
                    break;
                case "impossible_weight":
                    rawResult = {
                        detectedMaterial: "Heavy Metal Stacks",
                        primaryCategory: "Metal",
                        confidence: 0.90,
                        estimatedWeightKg: 999999.0, // Exceeds sanity limit
                        condition: "clean_dry",
                        notes: "Massive scrap pile.",
                        detectedItems: []
                    };
                    break;
                case "paper":
                default:
                    rawResult = {
                        detectedMaterial: "Newspaper & Old Office Paper",
                        primaryCategory: "Paper",
                        confidence: 0.98,
                        estimatedWeightKg: 15.0,
                        condition: "clean_dry",
                        notes: "Clean dry newspapers and notebook lots.",
                        detectedItems: [
                            { material: "Newspapers", category: "Paper", confidence: 0.98, estimatedWeightKg: 15.0 }
                        ]
                    };
                    break;
            }

            rawResult.analysisId = "MOCK-AI-" + Math.random().toString(36).substring(2, 8).toUpperCase();
            rawResult.provider = "mock";
            rawResult.model = "mock-vision-v2";

            const validated = validateAiOutput(rawResult);
            if (!validated.valid) {
                throw new Error(validated.error);
            }
            return validated.sanitizedData;
        }
    };

    // ─────────────────────────────────────────────
    // 6. REAL GEMINI PROVIDER (BACKEND BOUNDARY)
    // ─────────────────────────────────────────────
    const GeminiScrapProvider = {
        name: "gemini",

        async analyze(imageFile, options = {}) {
            // 1. Validate Image File
            const validation = validateImageFile(imageFile);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // 2. Convert File / Blob to Base64
            const base64Data = await this._fileToBase64(imageFile);
            const mimeType = imageFile.type || "image/jpeg";

            // 3. Resolve Supabase Client or Local Proxy
            const supabaseClient = typeof window !== "undefined" && window.EKABADI_SUPABASE 
                ? window.EKABADI_SUPABASE.client 
                : null;

            if (!supabaseClient) {
                // If running in Node.js test environment, delegate to local server/test boundary if configured
                if (typeof process !== "undefined" && process.env && process.env.GEMINI_API_KEY) {
                    return this._callGeminiDirect(base64Data, mimeType, process.env.GEMINI_API_KEY);
                }
                throw new Error("Supabase client not initialized and no backend AI endpoint available.");
            }

            // 4. Call Supabase Edge Function (Server-Side Secret Boundary)
            const { data, error } = await supabaseClient.functions.invoke("analyze-scrap", {
                body: { imageBase64: base64Data, mimeType, options }
            });

            if (error) {
                console.error("[Gemini Provider Error]", error);
                throw new Error(error.message || "Scrap analysis backend unavailable.");
            }

            if (!data || !data.success) {
                throw new Error(data?.error || "AI analysis failed to identify scrap.");
            }

            // 5. Validate Normalized Response
            const validated = validateAiOutput(data);
            if (!validated.valid) {
                throw new Error(validated.error);
            }

            return validated.sanitizedData;
        },

        // Helper: Convert File to base64
        _fileToBase64(file) {
            return new Promise((resolve, reject) => {
                if (typeof file === "string") {
                    return resolve(file); // Already base64
                }
                if (typeof FileReader !== "undefined") {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const result = reader.result;
                        const base64 = typeof result === "string" 
                            ? result.replace(/^data:image\/[a-z]+;base64,/, "") 
                            : "";
                        resolve(base64);
                    };
                    reader.onerror = (err) => reject(new Error("Failed to read image file: " + err));
                    reader.readAsDataURL(file);
                } else if (typeof Buffer !== "undefined" && file instanceof Buffer) {
                    resolve(file.toString("base64"));
                } else {
                    reject(new Error("Environment does not support file reading."));
                }
            });
        },

        // Node.js direct test runner method (Uses process.env.GEMINI_API_KEY exclusively on server/test runner)
        async _callGeminiDirect(base64Data, mimeType, apiKey) {
            const https = require("https");
            const model = (typeof process !== "undefined" && process.env.GEMINI_MODEL) || "gemini-1.5-flash";
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const payload = JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            { text: "Analyze this scrap photo. Identify primary material (Paper, Cardboard, Plastic, Metal, E-waste, Glass). Estimate weight in kg. Return JSON: { detectedMaterial, primaryCategory, confidence, estimatedWeightKg, condition, notes, detectedItems }." },
                            { inline_data: { mime_type: mimeType, data: base64Data } }
                        ]
                    }
                ],
                generationConfig: {
                    response_mime_type: "application/json",
                    temperature: 0.1
                }
            });

            return new Promise((resolve, reject) => {
                const req = https.request(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(payload)
                    },
                    timeout: 15000
                }, (res) => {
                    let body = "";
                    res.on("data", chunk => { body += chunk; });
                    res.on("end", () => {
                        if (res.statusCode < 200 || res.statusCode >= 300) {
                            return reject(new Error(`Gemini API error (HTTP ${res.statusCode}): ${body.slice(0, 150)}`));
                        }
                        try {
                            const parsed = JSON.parse(body);
                            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                            const result = JSON.parse(text);
                            const validated = validateAiOutput(result);
                            if (!validated.valid) return reject(new Error(validated.error));
                            resolve(validated.sanitizedData);
                        } catch (err) {
                            reject(new Error("Failed to parse Gemini output: " + err.message));
                        }
                    });
                });

                req.on("error", err => reject(err));
                req.on("timeout", () => {
                    req.destroy();
                    reject(new Error("Gemini API call timed out."));
                });
                req.write(payload);
                req.end();
            });
        }
    };

    // ─────────────────────────────────────────────
    // 7. FACTORY EXPORT
    // ─────────────────────────────────────────────
    function getScrapAiProvider(mode) {
        if (mode === "supabase") {
            return GeminiScrapProvider;
        }
        return MockScrapAiProvider;
    }

    return {
        ALLOWED_CATEGORIES,
        MAX_IMAGE_SIZE_BYTES,
        MAX_SANITY_WEIGHT_KG,
        validateImageFile,
        mapScrapCategory,
        validateAiOutput,
        MockScrapAiProvider,
        GeminiScrapProvider,
        getScrapAiProvider
    };
}));
