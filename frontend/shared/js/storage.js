/* =========================================================
   E-KABAADI PLATFORM
   Centralized Reactive State Engine & Storage Adapter
   File: frontend/shared/js/storage.js
   
   Architecture:
   - Unified reactive database under `ekabadi_unified_db_v2`
   - Broadcasts `ekabadi:statechange` custom event on window
   - Preserves legacy Admin API methods for non-destructive integration
   - Backend-ready StateAdapter abstraction
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        const exported = factory();
        root.EKABADI_STORAGE = exported;
        // Mount global aliases for seamless backward compatibility
        Object.assign(root, exported.legacyApi);
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    const DB_KEY = "ekabadi_unified_db_v2";
    const SESSION_KEY = "ekabadi_platform_session_v2";

    function safeParse(json, fallback) {
        try {
            return json ? JSON.parse(json) : fallback;
        } catch (e) {
            console.warn("Storage JSON parse error:", e);
            return fallback;
        }
    }

    function safeStringify(data) {
        try {
            return JSON.stringify(data);
        } catch (e) {
            console.error("Storage JSON stringify error:", e);
            return null;
        }
    }

    function clone(data) {
        return JSON.parse(JSON.stringify(data));
    }

    function dispatchStateChange(entity, action, payload) {
        if (typeof window !== "undefined") {
            const event = new CustomEvent("ekabadi:statechange", {
                detail: { entity, action, payload, timestamp: new Date().toISOString() }
            });
            window.dispatchEvent(event);
        }
    }

    /* ── Initial State Seeding ── */
    function getSeedDatabase() {
        return {
            users: (typeof MOCK_USERS !== "undefined" ? clone(MOCK_USERS) : []),
            citizens: (typeof MOCK_CITIZENS !== "undefined" ? clone(MOCK_CITIZENS) : []),
            collectors: (typeof MOCK_COLLECTORS !== "undefined" ? clone(MOCK_COLLECTORS) : []),
            pickups: (typeof MOCK_PICKUPS !== "undefined" ? clone(MOCK_PICKUPS) : []),
            payments: (typeof MOCK_PAYMENTS !== "undefined" ? clone(MOCK_PAYMENTS) : []),
            rewards: (typeof MOCK_REWARDS !== "undefined" ? clone(MOCK_REWARDS) : { catalog: [], transactions: [] }),
            notifications: (typeof MOCK_NOTIFICATIONS !== "undefined" ? clone(MOCK_NOTIFICATIONS) : []),
            scrapCategories: (typeof MOCK_SCRAP !== "undefined" ? clone(MOCK_SCRAP) : []),
            issues: [
                {
                    id: "ISS-4001",
                    type: "payment",
                    category: "payment",
                    priority: "high",
                    citizenId: "CIT-1002",
                    pickupId: "PK-9482",
                    raisedBy: "Priya Verma",
                    title: "UPI Settlement Confirmation",
                    description: "Requested official digital tax invoice for corporate carbon audit.",
                    status: "resolved",
                    assignedTo: "Finance Team",
                    createdAt: "2026-09-22T15:00:00Z",
                    updatedAt: "2026-09-22T16:20:00Z"
                },
                {
                    id: "ISS-4002",
                    type: "pickup",
                    category: "pickup",
                    priority: "medium",
                    citizenId: "CIT-1001",
                    pickupId: "PK-9483",
                    raisedBy: "Aarav Sharma",
                    title: "Pickup Time Slot Preference",
                    description: "Requesting collector to arrive strictly before 1:00 PM due to society visitor hours.",
                    status: "investigating",
                    assignedTo: "Operations Team",
                    createdAt: "2026-09-23T08:30:00Z",
                    updatedAt: "2026-09-23T08:45:00Z"
                }
            ],
            approvalAuditTrail: [
                {
                    id: "AUD-001",
                    entityType: "citizen",
                    entityId: "CIT-1001",
                    reviewerName: "Bhavya Bothera (Super Admin)",
                    action: "APPROVE",
                    reason: "Aadhaar and residential address verified.",
                    createdAt: "2026-01-14T11:00:00Z"
                },
                {
                    id: "AUD-002",
                    entityType: "collector",
                    entityId: "COL-2001",
                    reviewerName: "Bhavya Bothera (Super Admin)",
                    action: "APPROVE",
                    reason: "Commercial vehicle RC and certified digital scale verified.",
                    createdAt: "2025-12-11T10:00:00Z"
                }
            ],
            aiAnalyses: [],
            citizenSavedLocations: [
                {
                    id: "LOC-101",
                    citizenId: "CIT-1001",
                    label: "Home",
                    addressLine: "Flat B-402, Green Valley Apartments, Sector 62",
                    locality: "Sector 62, Noida",
                    city: "Noida",
                    state: "Uttar Pradesh",
                    postalCode: "201309",
                    latitude: 28.6208,
                    longitude: 77.3639,
                    isDefault: true,
                    createdAt: "2026-01-14T12:00:00Z"
                },
                {
                    id: "LOC-102",
                    citizenId: "CIT-1001",
                    label: "Office",
                    addressLine: "Tower 3, Logix Cyber Park, Sector 62",
                    locality: "Sector 62, Noida",
                    city: "Noida",
                    state: "Uttar Pradesh",
                    postalCode: "201309",
                    latitude: 28.6235,
                    longitude: 77.3680,
                    isDefault: false,
                    createdAt: "2026-02-01T10:00:00Z"
                }
            ],
            version: "2.0.0"
        };
    }

    /* =========================================================
       STATE ADAPTER (Backend-Ready Abstract Interface)
       ========================================================= */

    const StateAdapter = {
        getDatabase() {
            let data = safeParse(localStorage.getItem(DB_KEY), null);
            if (!data || !data.version) {
                data = getSeedDatabase();
                localStorage.setItem(DB_KEY, safeStringify(data));
            }
            return data;
        },

        saveDatabase(data) {
            localStorage.setItem(DB_KEY, safeStringify(data));
        },

        getCollection(name) {
            const db = this.getDatabase();
            return db[name] || [];
        },

        saveCollection(name, items, action = "update") {
            const db = this.getDatabase();
            db[name] = items;
            this.saveDatabase(db);
            dispatchStateChange(name, action, items);
            return items;
        },

        findById(collectionName, id) {
            const collection = this.getCollection(collectionName);
            return collection.find(item => item.id === id) || null;
        },

        insert(collectionName, item) {
            const collection = this.getCollection(collectionName);
            collection.push(item);
            this.saveCollection(collectionName, collection, "insert");
            return item;
        },

        update(collectionName, id, updates) {
            const collection = this.getCollection(collectionName);
            const index = collection.findIndex(item => item.id === id);
            if (index === -1) return null;

            // Security Rule: Selected collector is strictly immutable once pickup is created
            if (collectionName === "pickups" && updates.collectorId && updates.collectorId !== collection[index].collectorId) {
                throw new Error("Security violation: Selected collector is immutable and cannot be reassigned once pickup is created.");
            }

            const updated = { ...collection[index], ...updates, updatedAt: new Date().toISOString() };
            collection[index] = updated;
            this.saveCollection(collectionName, collection, "update");
            return updated;
        },

        delete(collectionName, id) {
            let collection = this.getCollection(collectionName);
            collection = collection.filter(item => item.id !== id);
            this.saveCollection(collectionName, collection, "delete");
            return true;
        },

        // Session Handling
        getSession() {
            var session = safeParse(localStorage.getItem(SESSION_KEY), null);
            if (session && session.expiresAt && Date.now() > new Date(session.expiresAt).getTime()) {
                this.clearSession();
                return null;
            }
            return session;
        },

        setSession(session) {
            if (!session) {
                localStorage.removeItem(SESSION_KEY);
            } else {
                localStorage.setItem(SESSION_KEY, safeStringify(session));
            }
            dispatchStateChange("session", session ? "login" : "logout", session);
        },

        clearSession() {
            localStorage.removeItem(SESSION_KEY);
            dispatchStateChange("session", "logout", null);
        }
    };

    // Auto-listen to multi-tab storage synchronization
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
        window.addEventListener("storage", function (e) {
            if (e.key === DB_KEY) {
                dispatchStateChange("database", "sync", safeParse(e.newValue, null));
            }
        });
    }

    /* =========================================================
       LEGACY ADMIN API COMPATIBILITY LAYER
       Ensures existing Admin pages run flawlessly without changes
       ========================================================= */

    const legacyApi = {
        storageGetCitizens() { return StateAdapter.getCollection("citizens"); },
        storageGetCitizen(id) { return StateAdapter.findById("citizens", id); },
        storageUpdateCitizen(id, updates) { return StateAdapter.update("citizens", id, updates); },
        suspendCitizen(id) { return StateAdapter.update("citizens", id, { status: "suspended" }); },
        activateCitizen(id) { return StateAdapter.update("citizens", id, { status: "active" }); },

        storageGetCollectors() { return StateAdapter.getCollection("collectors"); },
        storageGetCollector(id) { return StateAdapter.findById("collectors", id); },
        storageUpdateCollector(id, updates) { return StateAdapter.update("collectors", id, updates); },
        approveCollector(id) { return StateAdapter.update("collectors", id, { verificationStatus: "verified", status: "active" }); },
        suspendCollector(id) { return StateAdapter.update("collectors", id, { status: "suspended" }); },
        activateCollector(id) { return StateAdapter.update("collectors", id, { status: "active" }); },

        storageGetPickups() { return StateAdapter.getCollection("pickups"); },
        storageGetPickup(id) { return StateAdapter.findById("pickups", id); },
        storageUpdatePickup(id, updates) { return StateAdapter.update("pickups", id, updates); },
        updatePickupStatus(id, status) {
            const updates = { status, updatedAt: new Date().toISOString() };
            if (status === "completed") updates.completedAt = new Date().toISOString();
            return StateAdapter.update("pickups", id, updates);
        },

        storageGetPayments() { return StateAdapter.getCollection("payments"); },
        storageGetPayment(id) { return StateAdapter.findById("payments", id); },
        storageUpdatePayment(id, updates) { return StateAdapter.update("payments", id, updates); },
        completePayment(id) { return StateAdapter.update("payments", id, { status: "paid" }); },

        storageGetMaterials() { return StateAdapter.getCollection("scrapCategories"); },
        storageGetMaterial(id) { return StateAdapter.findById("scrapCategories", id); },
        storageUpdateMaterial(id, updates) { return StateAdapter.update("scrapCategories", id, updates); },
        updateMaterialRate(id, rate) { return StateAdapter.update("scrapCategories", id, { ratePerKg: Number(rate) }); },
        toggleMaterialStatus(id) {
            const m = StateAdapter.findById("scrapCategories", id);
            return m ? StateAdapter.update("scrapCategories", id, { active: !m.active }) : null;
        },

        storageGetRewards() {
            const rew = StateAdapter.getCollection("rewards");
            return Array.isArray(rew) ? rew : (rew.catalog || []);
        },
        storageGetReward(id) {
            const list = legacyApi.storageGetRewards();
            return list.find(r => r.id === id) || null;
        },
        storageUpdateReward(id, updates) {
            const db = StateAdapter.getDatabase();
            if (Array.isArray(db.rewards)) {
                const idx = db.rewards.findIndex(r => r.id === id);
                if (idx !== -1) db.rewards[idx] = { ...db.rewards[idx], ...updates };
            } else if (db.rewards && db.rewards.catalog) {
                const idx = db.rewards.catalog.findIndex(r => r.id === id);
                if (idx !== -1) db.rewards.catalog[idx] = { ...db.rewards.catalog[idx], ...updates };
            }
            StateAdapter.saveDatabase(db);
            return true;
        },

        storageGetIssues() { return StateAdapter.getCollection("issues"); },
        storageGetIssue(id) { return StateAdapter.findById("issues", id); },
        storageUpdateIssue(id, updates) { return StateAdapter.update("issues", id, updates); },
        resolveIssue(id) { return StateAdapter.update("issues", id, { status: "resolved" }); },
        investigateIssue(id) { return StateAdapter.update("issues", id, { status: "investigating" }); },

        storageGetNotifications() { return StateAdapter.getCollection("notifications"); },
        storageSaveNotifications(items) { return StateAdapter.saveCollection("notifications", items); },
        markNotificationRead(id) {
            const notifs = StateAdapter.getCollection("notifications");
            const item = notifs.find(n => n.id === id);
            if (item) { item.read = true; StateAdapter.saveCollection("notifications", notifs); }
        },
        markAllNotificationsRead() {
            const notifs = StateAdapter.getCollection("notifications");
            notifs.forEach(n => n.read = true);
            StateAdapter.saveCollection("notifications", notifs);
        },
        getUnreadNotificationCount() {
            return StateAdapter.getCollection("notifications").filter(n => !n.read).length;
        },

        getAdminSession() { return StateAdapter.getSession(); },
        saveAdminSession(session) { return StateAdapter.setSession(session); },
        clearAdminSession() { return StateAdapter.clearSession(); },
        isAdminLoggedIn() {
            const session = StateAdapter.getSession();
            return !!(session && session.loggedIn && session.role === "admin");
        },

        resetDatabase() {
            const seed = getSeedDatabase();
            StateAdapter.saveDatabase(seed);
            return seed;
        },
        getDatabaseStats() {
            const db = StateAdapter.getDatabase();
            return {
                citizensCount: (db.citizens || []).length,
                collectorsCount: (db.collectors || []).length,
                pickupsCount: (db.pickups || []).length,
                paymentsCount: (db.payments || []).length
            };
        }
    };

    /* =========================================================
       ADAPTER FACTORY — Mode-Aware Selection
       Checks EKABADI_ENV.DATA_MODE:
         "mock"     → localStorage StateAdapter (default)
         "supabase" → SupabaseAdapter (from supabase-adapter.js)
       ========================================================= */

    var activeAdapter = StateAdapter; // Default to localStorage

    // Check if Supabase mode is requested
    (function selectAdapter() {
        var env = (typeof self !== "undefined" && self.EKABADI_ENV) ? self.EKABADI_ENV : null;
        if (!env && typeof self !== "undefined" && self.__EKABADI_CONFIG__) {
            env = self.__EKABADI_CONFIG__;
        }
        if (!env && typeof require === "function") {
            try {
                env = require("../../config/environment");
            } catch (e) {}
        }
        if (env && env.DATA_MODE === "supabase") {
            var supabaseAdapter = (typeof self !== "undefined" && self.EKABADI_SUPABASE_ADAPTER) 
                ? self.EKABADI_SUPABASE_ADAPTER 
                : null;
            if (!supabaseAdapter && typeof require === "function") {
                try {
                    supabaseAdapter = require("./supabase-adapter");
                } catch (e) {}
            }
            if (supabaseAdapter) {
                activeAdapter = supabaseAdapter;
                if (typeof console !== "undefined") {
                    console.info("[E-Kabaadi Storage] Using SupabaseAdapter");
                }
            } else {
                if (typeof console !== "undefined") {
                    console.warn("[E-Kabaadi Storage] Supabase mode requested but SupabaseAdapter not loaded. Falling back to localStorage.");
                }
            }
        } else {
            if (typeof console !== "undefined") {
                console.info("[E-Kabaadi Storage] Using localStorage StateAdapter (mock mode)");
            }
        }
    })();

    return {
        get adapter() {
            return activeAdapter;
        },
        setAdapter: function (adapter) {
            if (adapter) activeAdapter = adapter;
        },
        setMode: function (mode) {
            if (mode === "supabase") {
                var sbAdapter = (typeof self !== "undefined" && self.EKABADI_SUPABASE_ADAPTER) ? self.EKABADI_SUPABASE_ADAPTER : null;
                if (!sbAdapter && typeof require === "function") {
                    try { sbAdapter = require("./supabase-adapter"); } catch (e) {}
                }
                if (sbAdapter) {
                    activeAdapter = sbAdapter;
                    return true;
                }
                return false;
            } else {
                activeAdapter = StateAdapter;
                return true;
            }
        },
        mockAdapter: StateAdapter,       // Always available for tests/fallback
        legacyApi,
        getSeedDatabase,
        getActiveMode: function () {
            return activeAdapter === StateAdapter ? "mock" : "supabase";
        }
    };
}));

