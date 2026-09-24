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
            financialLedger: [],
            paymentProviderEvents: [],
            paymentAdjustments: [],
            notificationPreferences: [
                {
                    id: "PREF-CIT-001",
                    userId: "USR-CIT-001",
                    emailEnabled: true,
                    smsEnabled: true,
                    pushEnabled: true,
                    pickupUpdates: true,
                    paymentUpdates: true,
                    rewardUpdates: true,
                    accountUpdates: true,
                    issueUpdates: true,
                    marketingUpdates: false,
                    quietHoursEnabled: false,
                    quietHoursStart: "22:00",
                    quietHoursEnd: "07:00",
                    createdAt: "2026-01-14T10:00:00Z",
                    updatedAt: "2026-01-14T10:00:00Z"
                },
                {
                    id: "PREF-COL-001",
                    userId: "USR-COL-001",
                    emailEnabled: true,
                    smsEnabled: true,
                    pushEnabled: true,
                    pickupUpdates: true,
                    paymentUpdates: true,
                    rewardUpdates: true,
                    accountUpdates: true,
                    issueUpdates: true,
                    marketingUpdates: false,
                    quietHoursEnabled: false,
                    quietHoursStart: "22:00",
                    quietHoursEnd: "07:00",
                    createdAt: "2025-12-11T10:00:00Z",
                    updatedAt: "2025-12-11T10:00:00Z"
                }
            ],
            notificationOutbox: [],
            collectorLiveLocations: [
                {
                    id: "COL-2001",
                    collectorId: "COL-2001",
                    pickupId: "PK-9481",
                    latitude: 28.6235,
                    longitude: 77.3590,
                    heading: 85.0,
                    speedKmh: 22.5,
                    accuracyMeters: 8.0,
                    source: "mock_simulation",
                    status: "active",
                    freshnessStatus: "LIVE",
                    isSimulated: true,
                    anomalyFlag: null,
                    updatedAt: new Date().toISOString()
                }
            ],
            pickupTrackingSessions: [
                {
                    id: "TRK-PK-9481",
                    pickupId: "PK-9481",
                    collectorId: "COL-2001",
                    citizenId: "CIT-1001",
                    status: "active",
                    locationFreshness: "LIVE",
                    routeFreshness: "FRESH",
                    etaStatus: "AVAILABLE",
                    etaSeconds: 540,
                    distanceMeters: 1650,
                    isNearDestination: false,
                    deviationStatus: "ON_ROUTE",
                    isSimulated: true,
                    startedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ],
            collectorLocationHistory: [],
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

        resetDatabase() {
            const data = getSeedDatabase();
            this.saveDatabase(data);
            return data;
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

            // Security Rule: Final verified scale weight is strictly immutable once pickup is settled
            if (collectionName === "pickups" && (collection[index].status === "completed" || collection[index].paymentStatus === "paid")) {
                if (updates.finalWeight !== undefined && updates.finalWeight !== collection[index].finalWeight) {
                    throw new Error("Security violation: Final scale weight is immutable once collection is settled.");
                }
            }

            // Security Rule: Financial ledger entries cannot be mutated
            if (collectionName === "financialLedger") {
                throw new Error("Security violation: Financial ledger entries are strictly immutable.");
            }

            // Security Rule: Settled payments are immutable
            if (collectionName === "payments" && (collection[index].status === "settled" || collection[index].status === "paid")) {
                if (updates.amount !== undefined && updates.amount !== collection[index].amount) {
                    throw new Error("Security violation: Settled payment amount is immutable. Use adjustments ledger.");
                }
                if (updates.pickupId && updates.pickupId !== collection[index].pickupId) {
                    throw new Error("Security violation: Payment pickup reference is strictly immutable.");
                }
            }

            // Security Rule: Notification recipient, event type, and idempotency key are immutable
            if (collectionName === "notifications") {
                if (updates.userId && updates.userId !== collection[index].userId) {
                    throw new Error("Security violation: Notification recipient is immutable.");
                }
                if (updates.eventType && updates.eventType !== collection[index].eventType) {
                    throw new Error("Security violation: Notification event type is immutable.");
                }
                if (updates.idempotencyKey && updates.idempotencyKey !== collection[index].idempotencyKey) {
                    throw new Error("Security violation: Notification idempotency key is immutable.");
                }
                if (updates.createdAt && updates.createdAt !== collection[index].createdAt) {
                    throw new Error("Security violation: Notification timestamp is immutable.");
                }
            }

            // Security Rule: Tracking sessions immutable fields
            if (collectionName === "pickupTrackingSessions") {
                if (updates.collectorId && updates.collectorId !== collection[index].collectorId) {
                    throw new Error("Security violation: Cannot modify immutable field collectorId (Collector cannot be changed on a tracking session).");
                }
                if (updates.citizenId && updates.citizenId !== collection[index].citizenId) {
                    throw new Error("Security violation: Cannot modify immutable field citizenId (Citizen cannot be changed on a tracking session).");
                }
                if (updates.pickupId && updates.pickupId !== collection[index].pickupId) {
                    throw new Error("Security violation: Cannot modify immutable field pickupId (Pickup reference is immutable on a tracking session).");
                }
            }

            const updated = { ...collection[index], ...updates, updatedAt: new Date().toISOString() };
            collection[index] = updated;
            this.saveCollection(collectionName, collection, "update");
            return updated;
        },

        delete(collectionName, id) {
            if (collectionName === "financialLedger") {
                throw new Error("Security violation: Financial ledger entries are strictly immutable.");
            }
            if (collectionName === "notifications") {
                throw new Error("Security violation: Notification audit records cannot be deleted.");
            }
            if (collectionName === "pickupTrackingSessions" || collectionName === "collectorLiveLocations") {
                throw new Error("Security violation: Active tracking session and live location records cannot be arbitrarily deleted by clients.");
            }
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
        },

        getNotificationPreferences(userId) {
            const prefs = this.getCollection("notificationPreferences");
            const found = prefs.find(p => p.userId === userId);
            if (found) return found;
            return {
                userId,
                emailEnabled: true,
                smsEnabled: true,
                pushEnabled: true,
                pickupUpdates: true,
                paymentUpdates: true,
                rewardUpdates: true,
                accountUpdates: true,
                issueUpdates: true,
                marketingUpdates: false,
                quietHoursEnabled: false
            };
        },

        updateNotificationPreferences(userId, updates, currentUserId) {
            if (currentUserId && userId !== currentUserId) {
                throw new Error("Security violation: Cannot update another user's notification preferences.");
            }
            const prefs = this.getCollection("notificationPreferences");
            let idx = prefs.findIndex(p => p.userId === userId);
            if (idx === -1) {
                const newPref = {
                    id: "PREF-" + Math.floor(Math.random() * 90000 + 10000),
                    userId,
                    emailEnabled: true,
                    smsEnabled: true,
                    pushEnabled: true,
                    pickupUpdates: true,
                    paymentUpdates: true,
                    rewardUpdates: true,
                    accountUpdates: true,
                    issueUpdates: true,
                    marketingUpdates: false,
                    quietHoursEnabled: false,
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                prefs.push(newPref);
                this.saveCollection("notificationPreferences", prefs);
                return newPref;
            }
            prefs[idx] = { ...prefs[idx], ...updates, updatedAt: new Date().toISOString() };
            this.saveCollection("notificationPreferences", prefs);
            return prefs[idx];
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
        markNotificationRead(id, currentUserId) {
            const notifs = StateAdapter.getCollection("notifications");
            const item = notifs.find(n => n.id === id);
            if (item) {
                if (currentUserId && item.userId && item.userId !== currentUserId) {
                    throw new Error("Security violation: Cannot mark another user's notification as read.");
                }
                item.read = true;
                item.readAt = new Date().toISOString();
                item.status = "read";
                StateAdapter.saveCollection("notifications", notifs);
                return item;
            }
            return null;
        },
        markAllNotificationsRead(userId) {
            const notifs = StateAdapter.getCollection("notifications");
            notifs.forEach(n => {
                if (!userId || n.userId === userId) {
                    n.read = true;
                    n.readAt = new Date().toISOString();
                    n.status = "read";
                }
            });
            StateAdapter.saveCollection("notifications", notifs);
        },
        getUnreadNotificationCount(userId) {
            const notifs = StateAdapter.getCollection("notifications");
            if (userId) {
                return notifs.filter(n => n.userId === userId && !n.read).length;
            }
            return notifs.filter(n => !n.read).length;
        },
        getNotificationPreferences(userId) {
            const prefs = StateAdapter.getCollection("notificationPreferences");
            const found = prefs.find(p => p.userId === userId);
            if (found) return found;
            return {
                userId,
                emailEnabled: true,
                smsEnabled: true,
                pushEnabled: true,
                pickupUpdates: true,
                paymentUpdates: true,
                rewardUpdates: true,
                accountUpdates: true,
                issueUpdates: true,
                marketingUpdates: false,
                quietHoursEnabled: false
            };
        },
        updateNotificationPreferences(userId, updates, currentUserId) {
            if (currentUserId && userId !== currentUserId) {
                throw new Error("Security violation: Cannot update another user's notification preferences.");
            }
            const prefs = StateAdapter.getCollection("notificationPreferences");
            let idx = prefs.findIndex(p => p.userId === userId);
            if (idx === -1) {
                const newPref = {
                    id: "PREF-" + Math.floor(Math.random() * 90000 + 10000),
                    userId,
                    emailEnabled: true,
                    smsEnabled: true,
                    pushEnabled: true,
                    pickupUpdates: true,
                    paymentUpdates: true,
                    rewardUpdates: true,
                    accountUpdates: true,
                    issueUpdates: true,
                    marketingUpdates: false,
                    quietHoursEnabled: false,
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                prefs.push(newPref);
                StateAdapter.saveCollection("notificationPreferences", prefs);
                return newPref;
            }
            prefs[idx] = { ...prefs[idx], ...updates, updatedAt: new Date().toISOString() };
            StateAdapter.saveCollection("notificationPreferences", prefs);
            return prefs[idx];
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

