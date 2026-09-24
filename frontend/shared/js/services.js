/* =========================================================
   E-KABAADI PLATFORM
   Centralized Service Abstraction Layer
   File: frontend/shared/js/services.js
   
   Architecture:
   - Backend-Ready Service Layer
   - Backed by EKABADI_STORAGE.adapter (localStorage prototype)
   - Ready for direct Supabase/REST replacement without UI rewrites
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(["./storage", "../../config/constants"], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory(require("./storage"), require("../../config/constants"));
    } else {
        root.EKABADI_SERVICES = factory(root.EKABADI_STORAGE, root.EKABADI_CONSTANTS);
        // Expose individual services globally
        root.authService = root.EKABADI_SERVICES.auth;
        root.citizenService = root.EKABADI_SERVICES.citizen;
        root.collectorService = root.EKABADI_SERVICES.collector;
        root.scrapAnalysisService = root.EKABADI_SERVICES.scrapAnalysis;
        root.pickupService = root.EKABADI_SERVICES.pickup;
        root.paymentService = root.EKABADI_SERVICES.payment;
        root.rewardService = root.EKABADI_SERVICES.reward;
        root.notificationService = root.EKABADI_SERVICES.notification;
        root.supportService = root.EKABADI_SERVICES.support;
        root.locationService = root.EKABADI_SERVICES.location;
        root.nearbyCollectorService = root.EKABADI_SERVICES.nearbyCollector;
        root.resolveData = root.EKABADI_SERVICES.resolveData;
    }
}(typeof self !== "undefined" ? self : this, function (storageModule, constantsModule) {
    "use strict";

    var defaultStorage = (storageModule && storageModule.adapter) ? storageModule.adapter : (typeof window !== "undefined" && window.EKABADI_STORAGE ? window.EKABADI_STORAGE.adapter : null);

    function getStorage() {
        if (typeof window !== "undefined" && window.EKABADI_STORAGE && window.EKABADI_STORAGE.adapter) {
            return window.EKABADI_STORAGE.adapter;
        }
        if (storageModule && storageModule.adapter) {
            return storageModule.adapter;
        }
        return defaultStorage;
    }

    function getAiProvider() {
        if (typeof window !== "undefined" && window.EKABADI_AI_PROVIDER) {
            return window.EKABADI_AI_PROVIDER;
        }
        if (typeof require === "function") {
            try {
                return require("./ai-provider");
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    function getLocationService() {
        if (typeof window !== "undefined" && window.EKABADI_LOCATION) {
            return window.EKABADI_LOCATION;
        }
        if (typeof require === "function") {
            try {
                return require("./location-service");
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    function isSupabaseMode() {
        if (storageModule && typeof storageModule.getActiveMode === "function") {
            return storageModule.getActiveMode() === "supabase";
        }
        if (typeof window !== "undefined" && window.EKABADI_STORAGE && typeof window.EKABADI_STORAGE.getActiveMode === "function") {
            return window.EKABADI_STORAGE.getActiveMode() === "supabase";
        }
        return false;
    }

    /* ── Progressive Async Helper ──
       If val is a Promise, chains callback via .then().
       If val is synchronous, invokes callback immediately.
       Returns val or the chained promise.
    */
    function resolveData(val, callback) {
        if (val && typeof val.then === "function") {
            return val.then(callback);
        }
        if (typeof callback === "function") {
            return callback(val);
        }
        return val;
    }

    // Dynamic Proxy: forwards all calls & property lookups to active adapter
    var storage = new Proxy({}, {
        get: function (target, prop) {
            var active = getStorage();
            if (active && prop in active) {
                var val = active[prop];
                if (typeof val === "function") {
                    return val.bind(active);
                }
                return val;
            }
            return target[prop];
        }
    });
    const CONSTANTS = constantsModule || (typeof window !== "undefined" ? window.EKABADI_CONSTANTS : {}) || {};

    function genId(prefix) {
        return prefix + "-" + Math.floor(1000 + Math.random() * 9000);
    }

    /* =========================================================
       1. AUTH SERVICE
       ========================================================= */
    const authService = {
        login(emailOrPhone, password) {
            if (isSupabaseMode()) {
                return this.loginWithSupabase(emailOrPhone, password);
            }
            const users = storage.getCollection("users");
            const query = String(emailOrPhone).trim().toLowerCase();
            const cleanPhone = query.replace(/\s+/g, "");

            const user = users.find(u => {
                const uEmail = (u.email || "").toLowerCase();
                const uPhone = (u.phone || "").replace(/\s+/g, "");
                return (uEmail === query || uPhone === cleanPhone);
            });

            if (!user) {
                return { success: false, error: "No account found matching this email or phone number." };
            }
            if (user.password !== password) {
                return { success: false, error: "Invalid password. Please check your credentials." };
            }
            if (user.status === "pending_approval") {
                return {
                    success: false,
                    error: "Your registration is currently under admin verification.",
                    status: "pending_approval",
                    user
                };
            }
            if (user.status === "rejected") {
                return {
                    success: false,
                    error: "Your application was not approved. Please review administrator notes.",
                    status: "rejected",
                    user
                };
            }
            if (user.status === "suspended") {
                return { success: false, error: "This account has been suspended by administration.", status: "suspended" };
            }
            if (user.status === "deactivated") {
                return { success: false, error: "This account has been deactivated. Please contact support.", status: "deactivated" };
            }

            const session = {
                loggedIn: true,
                user: {
                    id: user.id,
                    role: user.role,
                    email: user.email,
                    phone: user.phone,
                    name: user.name || `${user.firstName} ${user.lastName}`,
                    avatar: user.avatar || user.name.split(" ").map(w => w[0]).join(""),
                    citizenId: user.citizenId,
                    collectorId: user.collectorId
                },
                role: user.role,
                loginTime: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
            };

            storage.setSession(session);
            return { success: true, session, role: user.role };
        },

        isSupabaseMode() {
            return isSupabaseMode();
        },

        loginWithSupabase(email, password) {
            var activeStorage = getStorage();
            if (activeStorage && typeof activeStorage.signIn === "function") {
                return activeStorage.signIn(email, password).then(function (res) {
                    if (!res.success) return res;
                    var sessionVal = res.session || (typeof activeStorage.getSession === "function" ? activeStorage.getSession() : null);
                    return Promise.resolve(sessionVal).then(function (session) {
                        if (!session) {
                            return { success: false, error: "Failed to establish session." };
                        }
                        if (session.status === "pending_approval") {
                            return {
                                success: false,
                                error: "Your registration is currently under admin verification.",
                                status: "pending_approval",
                                session: session
                            };
                        }
                        if (session.status === "rejected") {
                            return {
                                success: false,
                                error: "Your application was not approved. Please review administrator notes.",
                                status: "rejected",
                                session: session
                            };
                        }
                        if (session.status === "suspended") {
                            return {
                                success: false,
                                error: "This account has been suspended by administration.",
                                status: "suspended",
                                session: session
                            };
                        }
                        if (session.status === "deactivated") {
                            return {
                                success: false,
                                error: "This account has been deactivated. Please contact support.",
                                status: "deactivated",
                                session: session
                            };
                        }
                        return { success: true, session: session, role: session.role, user: session.user };
                    });
                });
            }
            return Promise.resolve({ success: false, error: "Supabase adapter not available" });
        },

        signupWithSupabase(userData) {
            var activeStorage = getStorage();
            if (activeStorage && typeof activeStorage.signUp === "function") {
                return activeStorage.signUp(userData.email, userData.password, {
                    role: userData.role,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    name: userData.name,
                    phone: userData.phone,
                    location: userData.location,
                    vehicleType: userData.vehicleType,
                    vehicleNumber: userData.vehicleNumber,
                    serviceArea: userData.serviceArea,
                    serviceRadius: userData.serviceRadius,
                    scrapCategories: userData.scrapCategories,
                    businessName: userData.businessName,
                    collectorType: userData.collectorType,
                    phoneVerified: userData.phoneVerified,
                    emailVerified: userData.emailVerified
                }).then(function (res) {
                    if (!res.success) return res;
                    return {
                        success: true,
                        user: res.user,
                        citizenId: res.citizenId,
                        collectorId: res.collectorId,
                        applicationId: res.citizenId || res.collectorId || "APP-" + Math.floor(1000 + Math.random() * 9000),
                        message: "Registration submitted successfully. Pending admin approval."
                    };
                });
            }
            return Promise.resolve({ success: false, error: "Supabase adapter not available" });
        },

        resetPassword(email) {
            if (!email || !email.includes("@")) {
                return Promise.resolve({ success: false, error: "Please enter a valid email address." });
            }
            var activeStorage = getStorage();
            if (isSupabaseMode() && activeStorage && typeof activeStorage.resetPassword === "function") {
                return activeStorage.resetPassword(email);
            }
            return Promise.resolve({ success: true, message: "If an account exists with that email, a password reset link has been dispatched." });
        },

        updatePassword(newPassword) {
            if (!newPassword || newPassword.length < 6) {
                return Promise.resolve({ success: false, error: "Password must be at least 6 characters long." });
            }
            var activeStorage = getStorage();
            if (isSupabaseMode() && activeStorage && typeof activeStorage.updatePassword === "function") {
                return activeStorage.updatePassword(newPassword);
            }
            return Promise.resolve({ success: true, message: "Password updated successfully." });
        },

        getKycSignedUrl(filePath, expiresInSeconds) {
            var activeStorage = getStorage();
            if (activeStorage && typeof activeStorage.getKycSignedUrl === "function") {
                return activeStorage.getKycSignedUrl(filePath, expiresInSeconds || 60);
            }
            return Promise.resolve({ success: false, error: "Storage client unavailable" });
        },

        uploadKycDocument(userId, file, docType, fileName) {
            var activeStorage = getStorage();
            if (activeStorage && typeof activeStorage.uploadKycDocument === "function") {
                return activeStorage.uploadKycDocument(userId, file, docType, fileName);
            }
            return Promise.resolve({ success: true, path: "mock/" + (fileName || "doc.pdf") });
        },

        logout() {
            var activeStorage = getStorage();
            if (isSupabaseMode()) {
                return activeStorage.clearSession();
            }
            activeStorage.clearSession();
            return { success: true };
        },

        getSession() {
            return storage.getSession();
        },

        getCurrentUser() {
            const session = storage.getSession();
            return session ? session.user : null;
        },

        getRole() {
            const session = storage.getSession();
            return session ? session.role : null;
        },

        isAuthenticated() {
            return !!storage.getSession();
        },

        registerUser(userData) {
            if (isSupabaseMode()) {
                return this.signupWithSupabase(userData);
            }
            const users = storage.getCollection("users");
            const existing = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
            if (existing) {
                return { success: false, error: "An account with this email address already exists." };
            }

            const newUserId = genId("USR-" + (userData.role === "citizen" ? "CIT" : "COL"));
            const entityId = (userData.role === "citizen") ? genId("CIT") : genId("COL");

            const newUser = {
                id: newUserId,
                role: userData.role,
                citizenId: userData.role === "citizen" ? entityId : undefined,
                collectorId: userData.role === "collector" ? entityId : undefined,
                email: userData.email,
                phone: userData.phone,
                password: userData.password,
                firstName: userData.firstName || (userData.name ? userData.name.split(" ")[0] : "New"),
                lastName: userData.lastName || (userData.name ? userData.name.split(" ").slice(1).join(" ") : "User"),
                name: userData.name || `${userData.firstName || "New"} ${userData.lastName || "User"}`.trim(),
                avatar: userData.avatar || (userData.firstName && userData.lastName ? `${userData.firstName[0]}${userData.lastName[0]}` : (userData.name ? userData.name.split(" ").map(w => w[0]).join("") : "NU")),
                status: "pending_approval",
                applicationStatus: "pending_approval",
                phoneVerified: true,
                emailVerified: true,
                maskedAadhaar: "XXXX-XXXX-" + Math.floor(1000 + Math.random() * 9000),
                createdAt: new Date().toISOString()
            };

            storage.insert("users", newUser);

            let newCitizen = null;
            let newCollector = null;

            // Create corresponding role profile
            if (userData.role === "citizen") {
                newCitizen = {
                    id: entityId,
                    userId: newUserId,
                    name: newUser.name,
                    phone: newUser.phone,
                    email: newUser.email,
                    avatar: newUser.avatar,
                    joinedDate: new Date().toISOString().split("T")[0],
                    status: "pending_approval",
                    kycStatus: "pending",
                    maskedAadhaar: newUser.maskedAadhaar,
                    payoutMethod: "UPI",
                    upiId: userData.upiId || `${userData.phone}@upi`,
                    addresses: [{
                        id: "ADDR-" + Date.now(),
                        label: "Home",
                        address: userData.address || "Sector 62",
                        city: "Noida",
                        state: "Uttar Pradesh",
                        pincode: userData.pincode || "201309",
                        isDefault: true
                    }],
                    totalPickups: 0,
                    completedPickups: 0,
                    totalWasteSold: 0,
                    totalEarnings: 0,
                    ecoCoins: 0,
                    rating: 5.0
                };
                storage.insert("citizens", newCitizen);
            } else if (userData.role === "collector") {
                newCollector = {
                    id: entityId,
                    userId: newUserId,
                    name: newUser.name,
                    phone: newUser.phone,
                    email: newUser.email,
                    avatar: newUser.avatar,
                    businessName: userData.businessName || `${newUser.name} Recycling`,
                    vehicleType: userData.vehicleType || "Three-Wheeler Tempo",
                    vehicleNumber: userData.vehicleNumber || "UP 16 XX 0000",
                    serviceRadius: Number(userData.serviceRadius) || 8,
                    serviceArea: "Sector 1-65, Noida",
                    location: { address: "Sector 62, Noida", city: "Noida", lat: 28.62, lng: 77.36 },
                    distance: 1.5,
                    joinedDate: new Date().toISOString().split("T")[0],
                    status: "pending_approval",
                    verificationStatus: "pending",
                    scaleStatus: "certified",
                    scaleId: "EKB-" + Math.floor(100 + Math.random() * 900),
                    acceptedMaterials: userData.acceptedMaterials || ["Paper", "Plastic", "Metal"],
                    scrapCategories: userData.acceptedMaterials || ["Paper", "Plastic", "Metal"],
                    rating: 5.0,
                    totalPickups: 0,
                    completedPickups: 0,
                    pendingPickups: 0,
                    queueLength: 0,
                    responseTime: "~20 min",
                    totalWasteCollected: 0,
                    totalEarnings: 0,
                    ecoCoins: 0,
                    isOnline: false,
                    maskedBank: "Verified Bank Account (XXXXXX4821)"
                };
                storage.insert("collectors", newCollector);
            }

            // Emit Admin Notification
            notificationService.create({
                userId: "USR-ADMIN-001",
                role: "admin",
                type: "verification",
                title: `New ${userData.role === "citizen" ? "Citizen" : "Collector"} Application`,
                message: `${newUser.name} submitted registration for admin approval.`
            });

            return { success: true, user: newUser, citizen: newCitizen, collector: newCollector };
        },

        register(userData) {
            return this.registerUser(userData);
        },

        reviewRegistration(entityType, entityId, action, reason = "", reviewerName = "Super Admin") {
            return this.processApplication(entityType, entityId, action, reason, reviewerName);
        },

        // Admin Approval / Rejection Workflow with Audit Trail
        processApplication(entityType, entityId, action, reason = "", reviewerName = "Super Admin") {
            if (isSupabaseMode()) {
                var activeStorage = getStorage();
                if (activeStorage && typeof activeStorage.adminProcessApplication === "function") {
                    return activeStorage.adminProcessApplication(entityType, entityId, action, reason);
                }
                var table = entityType === "citizen" ? "citizens" : "collectors";
                return activeStorage.findById(table, entityId).then(function (entity) {
                    var userId = entity ? (entity.userId || entity.user_id) : entityId;
                    var newStatus = action === "APPROVE" ? "active" : (action === "REJECT" ? "rejected" : "pending_approval");
                    var newAppStatus = action === "APPROVE" ? "approved" : (action === "REJECT" ? "rejected" : "pending_approval");

                    var roleUpdates = {
                        status: newStatus,
                        updated_at: new Date().toISOString()
                    };
                    if (entityType === "citizen") {
                        roleUpdates.kyc_status = action === "APPROVE" ? "verified" : (action === "REJECT" ? "rejected" : "pending");
                    } else {
                        roleUpdates.verification_status = action === "APPROVE" ? "verified" : (action === "REJECT" ? "rejected" : "pending");
                        if (action === "APPROVE") roleUpdates.is_online = true;
                    }

                    return activeStorage.update(table, entityId, roleUpdates).then(function () {
                        var profileUpdates = {
                            status: newStatus,
                            application_status: newAppStatus,
                            updated_at: new Date().toISOString()
                        };
                        return activeStorage.update("users", userId, profileUpdates).then(function () {
                            var auditEntry = {
                                id: genId("AUD"),
                                entity_type: entityType,
                                entity_id: entityId,
                                reviewer_name: reviewerName,
                                action: action,
                                previous_status: entity ? entity.status : "pending_approval",
                                new_status: newStatus,
                                reason: reason || "",
                                created_at: new Date().toISOString()
                            };
                            return activeStorage.insert("approvalAuditTrail", auditEntry).then(function () {
                                notificationService.create({
                                    userId: userId,
                                    role: entityType,
                                    type: "verification",
                                    title: action === "APPROVE" ? "Application Approved! 🎉" : (action === "REJECT" ? "Application Update" : "Action Required"),
                                    message: action === "APPROVE" 
                                        ? "Welcome to E-Kabaadi! Your profile is verified and active."
                                        : `Admin note: ${reason || "Please check with support for details."}`
                                });

                                return { success: true, action: action, auditEntry: auditEntry };
                            });
                        });
                    });
                });
            }

            const users = storage.getCollection("users");
            const user = users.find(u => (entityType === "citizen" ? u.citizenId === entityId : u.collectorId === entityId));

            if (!user) return { success: false, error: "Associated user not found." };

            // Idempotency check: If already in target status, return existing audit record without duplicating
            if ((action === "APPROVE" && user.status === "active") || (action === "REJECT" && user.status === "rejected")) {
                const audits = storage.getCollection("approvalAuditTrail") || [];
                const existingAudit = audits.find(a => a.entityId === entityId && a.action === action);
                return { success: true, action, auditEntry: existingAudit, alreadyProcessed: true };
            }

            let newAccountStatus = user.status;
            let newAppStatus = user.applicationStatus;

            if (action === "APPROVE") {
                newAccountStatus = "active";
                newAppStatus = "approved";
                if (entityType === "citizen") {
                    storage.update("citizens", entityId, { status: "active", kycStatus: "verified" });
                } else {
                    storage.update("collectors", entityId, { status: "active", verificationStatus: "verified", isOnline: true });
                }
            } else if (action === "REJECT") {
                newAccountStatus = "rejected";
                newAppStatus = "rejected";
                if (entityType === "citizen") {
                    storage.update("citizens", entityId, { status: "rejected", kycStatus: "rejected" });
                } else {
                    storage.update("collectors", entityId, { status: "rejected", verificationStatus: "rejected", isOnline: false });
                }
            } else if (action === "REQUEST_CORRECTION") {
                newAppStatus = "correction_required";
            }

            storage.update("users", user.id, {
                status: newAccountStatus,
                applicationStatus: newAppStatus
            });

            // Record in Audit Trail
            const auditEntry = {
                id: genId("AUD"),
                entityType,
                entityId,
                reviewerName,
                action,
                reason,
                createdAt: new Date().toISOString()
            };
            const audits = storage.getCollection("approvalAuditTrail") || [];
            audits.unshift(auditEntry);
            storage.saveCollection("approvalAuditTrail", audits, "audit");

            // Notify user
            notificationService.create({
                userId: user.id,
                role: user.role,
                type: "verification",
                title: action === "APPROVE" ? "Application Approved! 🎉" : (action === "REJECT" ? "Application Update" : "Action Required"),
                message: action === "APPROVE" 
                    ? "Welcome to E-Kabaadi! Your profile is verified and active."
                    : `Admin note: ${reason || "Please check with support for details."}`
            });

            return { success: true, action, auditEntry };
        }
    };

    /* =========================================================
       2. CITIZEN SERVICE
       ========================================================= */
    const citizenService = {
        getAll() {
            return storage.getCollection("citizens");
        },

        getById(citizenId) {
            return this.getProfile(citizenId);
        },

        getProfile(citizenId) {
            return storage.findById("citizens", citizenId);
        },

        updateProfile(citizenId, updates) {
            const citizen = storage.update("citizens", citizenId, updates);
            // Sync user snapshot name if name was changed
            if (updates.name && citizen && citizen.userId) {
                storage.update("users", citizen.userId, { name: updates.name });
            }
            return citizen;
        },

        getDashboardStats(citizenId) {
            const citizen = this.getProfile(citizenId);
            if (!citizen) return null;

            const allPickups = pickupService.getByCitizen(citizenId);
            const activePickup = allPickups.find(p => !["completed", "cancelled"].includes(p.status)) || null;
            const completed = allPickups.filter(p => p.status === "completed");

            const totalEarnings = completed.reduce((sum, p) => sum + (p.finalValue || p.estimatedValue || 0), 0);
            const totalKg = completed.reduce((sum, p) => sum + (p.finalWeight || p.estimatedWeight || 0), 0);

            return {
                name: citizen.name,
                ecoCoins: citizen.ecoCoins || 0,
                totalEarnings: Math.round(totalEarnings),
                totalPickups: allPickups.length,
                completedPickups: completed.length,
                totalWasteSold: +(totalKg).toFixed(1),
                co2Saved: Math.round(totalKg * 2.3),
                waterSaved: Math.round(totalKg * 14.5),
                treesEquivalent: +(totalKg * 0.05).toFixed(1),
                activePickup
            };
        }
    };

    /* =========================================================
       3. COLLECTOR SERVICE
       ========================================================= */
    const collectorService = {
        getAll() {
            return storage.getCollection("collectors");
        },

        getById(collectorId) {
            return this.getCollectorById(collectorId);
        },

        getActiveCollectors() {
            var activeStorage = getStorage();
            if (activeStorage && typeof activeStorage.getActiveCollectors === "function" && isSupabaseMode()) {
                return activeStorage.getActiveCollectors();
            }
            return storage.getCollection("collectors").filter(c => c.status === "active");
        },

        getNearbyCollectors(filters = {}) {
            var self = this;
            var collectorsData = isSupabaseMode() ? this.getActiveCollectors() : storage.getCollection("collectors").filter(c => c.status === "active");
            return resolveData(collectorsData, function (rawList) {
                var locService = getLocationService();
                if (locService && locService.nearbyCollectorService) {
                    var citizenLoc = filters.citizenLocation || filters.location || null;
                    var discovery = locService.nearbyCollectorService.findNearbyCollectors(citizenLoc, rawList, filters);
                    return discovery.collectors;
                }

                let list = (rawList || []).filter(c => c.status === "active");

                if (filters.onlineOnly) {
                    list = list.filter(c => c.isOnline);
                }
                if (filters.material && filters.material !== "all") {
                    list = list.filter(c => (c.acceptedMaterials || c.scrapCategories || []).includes(filters.material));
                }
                if (filters.maxDistance && list.some(c => c.distance !== undefined)) {
                    list = list.filter(c => c.distance === undefined || c.distance <= filters.maxDistance);
                }
                if (filters.minRating) {
                    list = list.filter(c => c.rating >= filters.minRating);
                }

                // Sorting
                if (filters.sortBy === "rating") {
                    list.sort((a, b) => b.rating - a.rating);
                } else if (filters.sortBy === "pickups") {
                    list.sort((a, b) => b.completedPickups - a.completedPickups);
                } else if (list.some(c => c.distance !== undefined)) {
                    list.sort((a, b) => (a.distance || 0) - (b.distance || 0)); // default closest
                }

                return list;
            });
        },

        discoverNearby(citizenLocation, filters = {}) {
            var self = this;
            var collectorsData = isSupabaseMode() ? this.getActiveCollectors() : storage.getCollection("collectors").filter(c => c.status === "active");
            return resolveData(collectorsData, function (rawList) {
                var locService = getLocationService();
                if (locService && locService.nearbyCollectorService) {
                    return locService.nearbyCollectorService.findNearbyCollectors(citizenLocation, rawList, filters);
                }
                var filtered = (rawList || []).filter(c => c.status === "active");
                return {
                    citizenLocation: citizenLocation,
                    totalFound: filtered.length,
                    eligibleCount: filtered.filter(c => c.isOnline).length,
                    collectors: filtered
                };
            });
        },

        getCollectorById(id) {
            return storage.findById("collectors", id);
        },

        getProfile(id) {
            return this.getCollectorById(id);
        },

        toggleOnline(collectorId) {
            const collector = storage.findById("collectors", collectorId);
            if (!collector) return false;
            const newState = !collector.isOnline;
            storage.update("collectors", collectorId, { isOnline: newState });
            return newState;
        },

        getDashboardStats(collectorId) {
            const collector = this.getCollectorById(collectorId);
            if (!collector) return null;

            const pickups = pickupService.getByCollector(collectorId);
            const activePickup = pickups.find(p => ["accepted", "on_the_way", "arrived", "collecting"].includes(p.status)) || null;
            const requested = pickups.filter(p => p.status === "requested");
            const completed = pickups.filter(p => p.status === "completed");

            const today = new Date().toISOString().split("T")[0];
            const todayCompleted = completed.filter(p => (p.completedAt || p.createdAt || "").startsWith(today));
            const todayEarnings = todayCompleted.reduce((s, p) => s + (p.finalValue || 0), 0);
            const totalEarnings = completed.reduce((s, p) => s + (p.finalValue || 0), 0);

            return {
                name: collector.name,
                businessName: collector.businessName,
                isOnline: collector.isOnline,
                rating: collector.rating,
                scaleStatus: collector.scaleStatus,
                todayPickups: todayCompleted.length,
                pendingRequests: requested.length,
                completedPickups: completed.length,
                todayEarnings: Math.round(todayEarnings),
                totalEarnings: Math.round(totalEarnings) || collector.totalEarnings || 0,
                ecoCoins: collector.ecoCoins || 0,
                activePickup
            };
        },

        updateProfile(collectorId, updates) {
            return storage.update("collectors", collectorId, updates);
        }
    };

    /* =========================================================
       4. SCRAP ANALYSIS SERVICE (Gemini AI Vision & Intelligence)
       ========================================================= */
    const scrapAnalysisService = {
        getCategories() {
            var activeStorage = getStorage();
            return activeStorage.getCollection("scrapCategories");
        },

        getCategoryRate(categoryName) {
            const categories = this.getCategories();
            return resolveData(categories, function (cats) {
                const list = Array.isArray(cats) ? cats : [];
                const clean = (categoryName || "").toLowerCase().trim();
                const found = list.find(c => 
                    (c.category && c.category.toLowerCase() === clean) ||
                    (c.name && c.name.toLowerCase().includes(clean)) ||
                    (c.code && c.code.toLowerCase().includes(clean))
                );
                return found ? (Number(found.ratePerKg || found.rate) || 0) : 0;
            });
        },

        // Primary AI Scrap Analysis Entrypoint
        analyzeImage(imageInput, options = {}) {
            const self = this;
            const aiModule = getAiProvider();
            if (!aiModule) {
                return Promise.reject(new Error("AI Provider module not loaded."));
            }

            // Determine active data mode (mock vs supabase)
            const activeStorage = getStorage();
            const currentMode = (activeStorage && typeof activeStorage.getMode === "function") 
                ? activeStorage.getMode() 
                : ((typeof window !== "undefined" && window.__EKABADI_CONFIG__ && window.__EKABADI_CONFIG__.DATA_MODE) || "mock");

            const provider = aiModule.getScrapAiProvider(currentMode);

            return provider.analyze(imageInput, options).then(function (rawAiResult) {
                // Fetch official scrap categories from trusted storage (Never Gemini)
                const categoriesData = self.getCategories();
                return resolveData(categoriesData, function (cats) {
                    const categoriesList = Array.isArray(cats) ? cats : [];

                    // Match primaryCategory to trusted catalog
                    let matchedCat = null;
                    if (rawAiResult.primaryCategory && rawAiResult.primaryCategory !== "UNKNOWN") {
                        matchedCat = categoriesList.find(c => 
                            c.category && c.category.toLowerCase() === rawAiResult.primaryCategory.toLowerCase()
                        );
                    }
                    if (!matchedCat && rawAiResult.detectedMaterial) {
                        const mapped = aiModule.mapScrapCategory(rawAiResult.detectedMaterial);
                        if (mapped !== "UNKNOWN") {
                            matchedCat = categoriesList.find(c => 
                                c.category && c.category.toLowerCase() === mapped.toLowerCase()
                            );
                        }
                    }

                    // Fallback to Paper or unclassified
                    if (!matchedCat && rawAiResult.primaryCategory !== "UNKNOWN") {
                        matchedCat = categoriesList[0] || null;
                    }

                    // CRITICAL: Official rate comes strictly from Supabase / admin table
                    const officialRate = matchedCat ? (Number(matchedCat.ratePerKg || matchedCat.rate) || 0) : 0;
                    const estimatedWeight = Number(rawAiResult.estimatedWeightKg) || 1.0;
                    const estimatedValue = +(estimatedWeight * officialRate).toFixed(2);
                    const ecoCoinsEstimate = Math.round(estimatedWeight * 2);

                    // Map detected line items with trusted rates
                    const mappedItems = (rawAiResult.detectedItems || []).map(function (item) {
                        const itemCat = categoriesList.find(c => 
                            c.category && c.category.toLowerCase() === (item.category || "").toLowerCase()
                        );
                        const itemRate = itemCat ? (Number(itemCat.ratePerKg || itemCat.rate) || 0) : officialRate;
                        const itemWeight = Number(item.estimatedWeightKg) || 1.0;
                        return {
                            material: item.material || rawAiResult.detectedMaterial,
                            category: itemCat ? itemCat.category : (item.category || "General"),
                            weight: itemWeight,
                            rate: itemRate,
                            subtotal: +(itemWeight * itemRate).toFixed(2),
                            confidence: item.confidence || rawAiResult.confidence
                        };
                    });

                    const analysisRecord = {
                        id: rawAiResult.analysisId || ("AI-" + Math.random().toString(36).substring(2, 9)),
                        provider: rawAiResult.provider || "gemini",
                        model: rawAiResult.model || "gemini-1.5-flash",
                        detectedMaterial: rawAiResult.detectedMaterial,
                        primaryCategory: rawAiResult.primaryCategory,
                        category: matchedCat ? matchedCat.category : "UNKNOWN",
                        categoryName: matchedCat ? matchedCat.name : "Unclassified Scrap",
                        categoryCode: matchedCat ? matchedCat.code : "UNK",
                        icon: matchedCat ? matchedCat.icon : "❓",
                        ratePerKg: officialRate, // TRUSTED RATE ONLY
                        estimatedWeight: estimatedWeight,
                        estimatedValue: estimatedValue,
                        ecoCoinsEstimate: ecoCoinsEstimate,
                        confidence: rawAiResult.confidence,
                        confidenceTier: rawAiResult.confidenceTier,
                        reviewRequired: rawAiResult.reviewRequired || rawAiResult.primaryCategory === "UNKNOWN",
                        condition: rawAiResult.condition || "clean_dry",
                        notes: rawAiResult.notes || "",
                        detectedItems: mappedItems,
                        userConfirmed: false,
                        userCorrected: false,
                        correctedCategory: null,
                        appliedRateSnapshot: officialRate,
                        status: "analyzed",
                        createdAt: rawAiResult.timestamp || new Date().toISOString()
                    };

                    // Persist analysis record
                    try {
                        activeStorage.insert("aiAnalyses", analysisRecord);
                    } catch (e) {
                        console.warn("[ScrapAnalysisService] Failed to persist analysis:", e);
                    }

                    return analysisRecord;
                });
            });
        },

        // Human-in-the-Loop Confirmation / Correction
        confirmAnalysis(analysisId, options = {}) {
            const self = this;
            const activeStorage = getStorage();
            const existingRecord = activeStorage.findById("aiAnalyses", analysisId);

            return resolveData(existingRecord, function (analysis) {
                if (!analysis) {
                    throw new Error("Analysis record not found: " + analysisId);
                }

                const updates = {
                    userConfirmed: true,
                    updatedAt: new Date().toISOString()
                };

                // Check if user manually corrected the category
                const newCategoryName = options.correctedCategory || options.selectedCategory;
                if (newCategoryName && newCategoryName !== analysis.category) {
                    const categoriesData = self.getCategories();
                    return resolveData(categoriesData, function (cats) {
                        const categoriesList = Array.isArray(cats) ? cats : [];
                        const clean = newCategoryName.toLowerCase().trim();
                        const found = categoriesList.find(c => 
                            c.category.toLowerCase() === clean || 
                            c.name.toLowerCase().includes(clean)
                        );

                        if (found) {
                            const newRate = Number(found.ratePerKg || found.rate) || 0;
                            updates.userCorrected = true;
                            updates.correctedCategory = found.category;
                            updates.category = found.category;
                            updates.categoryName = found.name;
                            updates.categoryCode = found.code;
                            updates.ratePerKg = newRate;
                            updates.appliedRateSnapshot = newRate;
                            updates.estimatedValue = +(analysis.estimatedWeight * newRate).toFixed(2);
                            updates.status = "corrected";
                        }

                        const updateResult = activeStorage.update("aiAnalyses", analysisId, updates);
                        return resolveData(updateResult, function (updated) {
                            return Object.assign({}, analysis, updates);
                        });
                    });
                } else {
                    updates.status = "confirmed";
                    const updateResult = activeStorage.update("aiAnalyses", analysisId, updates);
                    return resolveData(updateResult, function (updated) {
                        return Object.assign({}, analysis, updates);
                    });
                }
            });
        },

        getAnalysisById(id) {
            var activeStorage = getStorage();
            return activeStorage.findById("aiAnalyses", id);
        },

        getAiAnalysisStats() {
            var activeStorage = getStorage();
            const allAnalyses = activeStorage.getCollection("aiAnalyses");
            return resolveData(allAnalyses, function (records) {
                const list = Array.isArray(records) ? records : [];
                const total = list.length;
                const confirmed = list.filter(r => r.userConfirmed).length;
                const corrected = list.filter(r => r.userCorrected).length;
                const highConf = list.filter(r => (r.confidence || 0) >= 0.85).length;
                const avgConf = total > 0 
                    ? +(list.reduce((acc, r) => acc + (r.confidence || 0), 0) / total).toFixed(2) 
                    : 0.00;

                return {
                    totalAnalyses: total,
                    confirmedAnalyses: confirmed,
                    correctedAnalyses: corrected,
                    highConfidenceAnalyses: highConf,
                    averageConfidence: avgConf
                };
            });
        },

        // Backward compatibility
        analyze(imageIdentifier = "sample") {
            return this.analyzeImage(imageIdentifier);
        }
    };

    /* =========================================================
       5. PICKUP SERVICE (Full State Machine)
       ========================================================= */
    const pickupService = {
        getAll() {
            return storage.getCollection("pickups");
        },

        getById(id) {
            return storage.findById("pickups", id);
        },

        getByCitizen(citizenId) {
            return this.getAll().filter(p => p.citizenId === citizenId);
        },

        getByCollector(collectorId) {
            return this.getAll().filter(p => p.collectorId === collectorId);
        },

        // Step 1: Citizen creates Pickup (Citizen chooses collector!)
        createPickup(data) {
            if (!data.collectorId) {
                throw new Error("Core business rule violation: Citizen must choose a Collector.");
            }

            const self = this;
            const pickupsData = this.getAll();
            return resolveData(pickupsData, function (allPickups) {
                const list = Array.isArray(allPickups) ? allPickups : [];
                // Idempotency check: Prevent duplicate booking within 3 seconds
                const recentDuplicate = list.find(p => 
                    p.citizenId === data.citizenId && 
                    p.collectorId === data.collectorId && 
                    p.status === "requested" &&
                    (Date.now() - new Date(p.createdAt).getTime()) < 3000
                );
                if (recentDuplicate) return recentDuplicate;

                const collectorData = storage.findById("collectors", data.collectorId);
                const citizenData = storage.findById("citizens", data.citizenId);

                return resolveData(collectorData, function (collector) {
                    if (!collector) {
                        throw new Error("Selected collector not found: " + data.collectorId);
                    }
                    if (collector.status !== "active" || (collector.verificationStatus && collector.verificationStatus !== "verified")) {
                        throw new Error("Security violation: Selected collector is not approved or active.");
                    }

                    // Validate location coordinates if present
                    var locService = getLocationService();
                    var pLat = data.pickupLatitude !== undefined ? data.pickupLatitude : (data.lat !== undefined ? data.lat : null);
                    var pLng = data.pickupLongitude !== undefined ? data.pickupLongitude : (data.lng !== undefined ? data.lng : null);
                    if (locService && pLat !== null && pLng !== null) {
                        var coordVal = locService.validateCoordinates(pLat, pLng);
                        if (!coordVal.valid) {
                            throw new Error("Invalid pickup coordinates: " + coordVal.error);
                        }
                        pLat = coordVal.lat;
                        pLng = coordVal.lng;
                    }

                    return resolveData(citizenData, function (citizen) {
                        const pickup = {
                            id: data.id || genId("PK"),
                            citizenId: data.citizenId,
                            collectorId: data.collectorId, // IMMUTABLE
                            citizenName: citizen ? citizen.name : data.citizenName || "Citizen",
                            collectorName: collector ? collector.name : "Collector Partner",
                            address: data.address || (citizen && citizen.addresses ? (citizen.addresses[0].address || citizen.addresses[0]) : "Noida"),
                            pickupLatitude: pLat,
                            pickupLongitude: pLng,
                            pickupLocality: data.pickupLocality || data.locality || "Sector 62, Noida",
                            pickupAddressSnapshot: data.address || (citizen && citizen.addresses ? (citizen.addresses[0].address || citizen.addresses[0]) : "Noida"),
                            scheduledDate: data.scheduledDate || new Date().toISOString().split("T")[0],
                            scheduledTime: data.scheduledTime || "10:00 AM - 12:00 PM",
                            date: data.scheduledDate || new Date().toISOString().split("T")[0],
                            timeSlot: data.scheduledTime || "10:00 AM - 12:00 PM",
                            scrapType: data.scrapType || "Mixed Recyclables",
                            items: data.items || [
                                { category: "Paper", type: "Newspaper", estimatedWeight: 10.0, verifiedWeight: null, rate: 14.0 }
                            ],
                            estimatedWeight: Number(data.estimatedWeight) || 10.0,
                            estimatedValue: Number(data.estimatedValue) || 140.0,
                            finalWeight: null,
                            finalValue: null,
                            status: "requested",
                            paymentStatus: "pending",
                            paymentMethod: data.paymentMethod || "UPI",
                            ecoCoinsAwarded: 0,
                            notes: data.notes || "",
                            aiAnalysisId: data.aiAnalysisId || null,
                            aiMetadata: data.aiMetadata || null,
                            createdAt: new Date().toISOString()
                        };

                        const insertResult = storage.insert("pickups", pickup);
                        return resolveData(insertResult, function (inserted) {
                            const finalPickup = inserted && inserted.id ? inserted : pickup;

                            // Associate AI analysis record if provided
                            if (finalPickup.aiAnalysisId) {
                                try {
                                    storage.update("aiAnalyses", finalPickup.aiAnalysisId, {
                                        pickupId: finalPickup.id,
                                        status: "booked",
                                        updatedAt: new Date().toISOString()
                                    });
                                } catch (e) {}
                            }

                            // Notify Citizen
                            notificationService.create({
                                userId: citizen ? (citizen.userId || citizen.user_id) : "USR-CIT-001",
                                role: "citizen",
                                type: "pickup",
                                title: "Pickup Scheduled",
                                message: `Request ${finalPickup.id} sent to ${finalPickup.collectorName} for ${finalPickup.scheduledDate}.`
                            });

                            // Notify Collector
                            notificationService.create({
                                userId: collector ? (collector.userId || collector.user_id) : "USR-COL-001",
                                role: "collector",
                                type: "pickup",
                                title: "New Pickup Request!",
                                message: `${finalPickup.citizenName} booked pickup for ${finalPickup.scrapType} (${finalPickup.estimatedWeight} kg).`
                            });

                            // Notify Admin Activity
                            notificationService.create({
                                userId: "USR-ADMIN-001",
                                role: "admin",
                                type: "pickup",
                                title: "New Pickup Order",
                                message: `${finalPickup.citizenName} scheduled ${finalPickup.id} with ${finalPickup.collectorName}.`
                            });

                            return finalPickup;
                        });
                    });
                });
            });
        },

        // Step 2: Collector accepts
        acceptPickup(pickupId, collectorId) {
            const self = this;
            if (isSupabaseMode()) {
                var activeStorage = getStorage();
                if (activeStorage && typeof activeStorage.pickupAccept === "function") {
                    return activeStorage.pickupAccept(pickupId, collectorId);
                }
            }
            const pickupData = storage.findById("pickups", pickupId);
            return resolveData(pickupData, function (pickup) {
                if (!pickup) return null;

                if (pickup.status === "accepted") {
                    return { ...pickup, success: true, alreadyAccepted: true };
                }

                const updateResult = storage.update("pickups", pickupId, {
                    status: "accepted",
                    acceptedAt: new Date().toISOString()
                });

                return resolveData(updateResult, function (updated) {
                    const citizenData = storage.findById("citizens", pickup.citizenId);
                    return resolveData(citizenData, function (citizen) {
                        if (citizen) {
                            notificationService.create({
                                userId: citizen.userId || citizen.user_id,
                                role: "citizen",
                                type: "pickup",
                                title: "Collector Accepted Request! 🚛",
                                message: `${pickup.collectorName} confirmed your pickup slot.`
                            });
                        }

                        if (updated) {
                            updated.success = true;
                        }
                        return updated;
                    });
                });
            });
        },

        // State Machine transitions: ON_THE_WAY, ARRIVED, COLLECTING, COMPLETED, PAID, CANCELLED
        updateStatus(pickupId, newStatus, extra = {}) {
            const self = this;
            const pickupData = storage.findById("pickups", pickupId);
            return resolveData(pickupData, function (pickup) {
                if (!pickup) return null;

                if (extra.collectorId && extra.collectorId !== pickup.collectorId) {
                    throw new Error("Security violation: Selected collector is immutable and cannot be reassigned once pickup is created.");
                }

                const updates = {
                    status: newStatus,
                    ...extra,
                    updatedAt: new Date().toISOString()
                };

                if (newStatus === "on_the_way") updates.enrouteAt = new Date().toISOString();
                if (newStatus === "arrived") updates.arrivedAt = new Date().toISOString();
                if (newStatus === "completed") updates.completedAt = new Date().toISOString();
                if (newStatus === "paid") updates.paidAt = new Date().toISOString();
                if (newStatus === "cancelled") {
                    updates.cancelledAt = new Date().toISOString();
                    updates.cancellationReason = extra.reason || "Cancelled by user";
                }

                const updateResult = storage.update("pickups", pickupId, updates);
                return resolveData(updateResult, function (updated) {
                    // Citizen notifications
                    const citizenData = storage.findById("citizens", pickup.citizenId);
                    return resolveData(citizenData, function (citizen) {
                        if (citizen) {
                            let title = "Pickup Status Update";
                            let msg = `Your pickup is now ${newStatus.replace(/_/g, " ")}.`;

                            if (newStatus === "on_the_way") {
                                title = "Collector is En Route! 📍";
                                msg = `${pickup.collectorName} is heading to your doorstep.`;
                            } else if (newStatus === "arrived") {
                                title = "Collector Has Arrived! 🔔";
                                msg = `${pickup.collectorName} has reached your gate with digital scale.`;
                            } else if (newStatus === "collecting") {
                                title = "Weighing In Progress ⚖️";
                                msg = "Certified scale measurement is underway.";
                            } else if (newStatus === "completed") {
                                title = "Collection Completed! ✅";
                                msg = `Final weight: ${updated ? updated.finalWeight : ""} kg. Preparing payment settlement.`;
                            }

                            notificationService.create({
                                userId: citizen.userId || citizen.user_id,
                                role: "citizen",
                                type: "pickup",
                                title,
                                message: msg
                            });
                        }

                        return updated;
                    });
                });
            });
        },

        // Step 3: Complete collection, Digital scale settlement, auto-payment & Eco Coins
        completeCollection(pickupId, collectionData) {
            if (isSupabaseMode()) {
                var pickupData = storage.findById("pickups", pickupId);
                return resolveData(pickupData, function (p) {
                    var collectorId = (p && p.collectorId) || (collectionData && collectionData.collectorId);
                    return pickupService.completeWithSupabase(pickupId, collectorId, collectionData || {});
                });
            }

            const pickup = storage.findById("pickups", pickupId);
            if (!pickup) return null;

            // Idempotency: Never re-process a pickup that is already completed or paid
            if (pickup.status === "completed" || pickup.paymentStatus === "paid") {
                const existingPayment = paymentService.getAll().find(p => p.pickupId === pickup.id);
                return {
                    ...pickup,
                    success: true,
                    payment: existingPayment,
                    alreadyCompleted: true
                };
            }

            const finalWeight = Number(collectionData.finalWeight) || pickup.estimatedWeight;
            const finalValue = Number(collectionData.finalValue) || pickup.estimatedValue;
            const items = collectionData.items || pickup.items;

            // 1. Calculate Eco Coins (2 coins per kg)
            const earnedCoins = Math.max(10, Math.round(finalWeight * 2));

            // 2. Update Pickup Status to COMPLETED then PAID
            const completedPickup = storage.update("pickups", pickupId, {
                status: "completed",
                paymentStatus: "paid",
                finalWeight,
                finalValue,
                items,
                ecoCoinsAwarded: earnedCoins,
                completedAt: new Date().toISOString(),
                paidAt: new Date().toISOString()
            });

            // 3. Auto-generate Payment Record
            paymentService.createPayment({
                pickupId: pickup.id,
                citizenId: pickup.citizenId,
                citizenName: pickup.citizenName,
                collectorId: pickup.collectorId,
                collectorName: pickup.collectorName,
                amount: finalValue,
                method: pickup.paymentMethod || "UPI"
            });

            // 4. Award Eco Coins & Update Citizen Wallet
            rewardService.awardEcoCoins(pickup.citizenId, earnedCoins, pickup.id, `Eco Coins earned from Pickup ${pickup.id}`);

            // 5. Update Citizen Stats
            const citizen = storage.findById("citizens", pickup.citizenId);
            if (citizen) {
                storage.update("citizens", citizen.id, {
                    totalEarnings: +(citizen.totalEarnings + finalValue).toFixed(2),
                    totalWasteSold: +(citizen.totalWasteSold + finalWeight).toFixed(1),
                    completedPickups: citizen.completedPickups + 1
                });
            }

            // 6. Update Collector Stats
            const collector = storage.findById("collectors", pickup.collectorId);
            if (collector) {
                storage.update("collectors", collector.id, {
                    totalEarnings: +(collector.totalEarnings + finalValue).toFixed(2),
                    totalWasteCollected: +(collector.totalWasteCollected + finalWeight).toFixed(1),
                    completedPickups: collector.completedPickups + 1
                });
            }

            // 7. Send Notifications
            if (citizen) {
                notificationService.create({
                    userId: citizen.userId,
                    role: "citizen",
                    type: "payment",
                    title: "₹" + finalValue.toFixed(2) + " Transferred via Instant UPI!",
                    message: `Certified settlement for ${finalWeight} kg completed. You also earned +${earnedCoins} Eco Coins!`
                });
            }

            notificationService.create({
                userId: "USR-ADMIN-001",
                role: "admin",
                type: "payment",
                title: "Pickup Settled & Paid",
                message: `Order ${pickup.id} completed by ${pickup.collectorName}. Payout: ₹${finalValue.toFixed(2)}.`
            });

            if (completedPickup) {
                completedPickup.success = true;
            }
            return completedPickup;
        },

        // Atomic completion via Supabase RPC or fallback to completeCollection
        completeWithSupabase(pickupId, collectorId, collectionData) {
            var activeStorage = getStorage();
            if (activeStorage && typeof activeStorage.rpc === "function") {
                return activeStorage.rpc("process_collection_completion", {
                    p_pickup_id: pickupId,
                    p_final_weight: Number(collectionData.finalWeight) || 0,
                    p_final_value: Number(collectionData.finalValue) || 0,
                    p_items: collectionData.items || []
                }).then(function (rpcResult) {
                    if (rpcResult && rpcResult.success) {
                        return {
                            id: pickupId,
                            status: "completed",
                            paymentStatus: "paid",
                            finalWeight: Number(collectionData.finalWeight),
                            finalValue: Number(collectionData.finalValue),
                            ecoCoinsAwarded: rpcResult.eco_coins_awarded || Math.round(Number(collectionData.finalWeight) * 2),
                            success: true,
                            alreadyCompleted: !!rpcResult.already_completed,
                            rpcResult: rpcResult
                        };
                    }
                    return rpcResult;
                });
            }
            return Promise.resolve(this.completeCollection(pickupId, collectionData));
        },

        // Cancellation Rule: Allowed strictly prior to arrival
        cancelPickup(pickupId, roleOrReason = "citizen", reasonOrRole = "Cancelled by user") {
            const self = this;
            let role = "citizen";
            let reason = "Cancelled by user";
            if (["citizen", "collector", "admin"].includes(String(roleOrReason).toLowerCase())) {
                role = String(roleOrReason).toLowerCase();
                reason = reasonOrRole || "Cancelled by " + role;
            } else {
                reason = roleOrReason || "Cancelled by user";
                role = ["citizen", "collector", "admin"].includes(String(reasonOrRole).toLowerCase()) ? reasonOrRole : "citizen";
            }

            if (isSupabaseMode()) {
                var activeStorage = getStorage();
                if (activeStorage && typeof activeStorage.pickupCancel === "function") {
                    return activeStorage.pickupCancel(pickupId, reason);
                }
            }

            const pickupData = storage.findById("pickups", pickupId);
            return resolveData(pickupData, function (pickup) {
                if (!pickup) return { success: false, error: "Pickup not found" };

                if (["arrived", "collecting", "completed", "paid", "payment_pending"].includes(pickup.status)) {
                    return { success: false, error: "Cannot cancel pickup once collector has arrived or collection is active/complete." };
                }

                const updated = self.updateStatus(pickupId, "cancelled", { reason });
                return resolveData(updated, function (up) {
                    return { success: true, pickup: up };
                });
            });
        }
    };

    /* =========================================================
       6. PAYMENT SERVICE
       ========================================================= */
    const paymentService = {
        getAll() {
            return storage.getCollection("payments");
        },

        getByCitizen(citizenId) {
            return this.getAll().filter(p => p.citizenId === citizenId);
        },

        getByCollector(collectorId) {
            return this.getAll().filter(p => p.collectorId === collectorId);
        },

        createPayment(data) {
            // Idempotency: Never create duplicate payment for the same pickup
            if (data.pickupId) {
                const existing = this.getAll().find(p => p.pickupId === data.pickupId);
                if (existing) return existing;
            }

            const payment = {
                id: genId("TXN"),
                pickupId: data.pickupId,
                citizenId: data.citizenId,
                citizenName: data.citizenName,
                collectorId: data.collectorId,
                collectorName: data.collectorName,
                amount: Number(data.amount) || 0,
                method: data.method || "UPI",
                status: "paid",
                transactionId: "UPI-" + Math.floor(1000 + Math.random() * 9000) + "-" + Math.floor(10000 + Math.random() * 90000),
                createdAt: new Date().toISOString()
            };

            storage.insert("payments", payment);
            return payment;
        }
    };

    /* =========================================================
       7. REWARD SERVICE
       ========================================================= */
    const rewardService = {
        getCatalog() {
            const raw = storage.getCollection("rewards");
            return Array.isArray(raw) ? raw : (raw.catalog || []);
        },

        getUserTransactions(userId) {
            if (isSupabaseMode()) {
                var activeStorage = getStorage();
                return activeStorage.getCollection("rewardTransactions").then(function (txns) {
                    return (txns || []).filter(t => t.userId === userId);
                });
            }
            const db = storage.getDatabase();
            const txns = (db.rewards && db.rewards.transactions) ? db.rewards.transactions : [];
            return txns.filter(t => t.userId === userId);
        },

        awardEcoCoins(citizenId, points, pickupId, description) {
            const citizen = storage.findById("citizens", citizenId);
            if (!citizen) return null;

            // Idempotency: Never award eco coins twice for the same pickup
            const db = storage.getDatabase();
            if (!db.rewards) db.rewards = { catalog: [], transactions: [] };
            if (!db.rewards.transactions) db.rewards.transactions = [];
            if (pickupId) {
                const existingTxn = db.rewards.transactions.find(t => t.pickupId === pickupId && t.type === "earned_pickup");
                if (existingTxn) return existingTxn;
            }

            const newTotal = (citizen.ecoCoins || 0) + points;
            storage.update("citizens", citizenId, { ecoCoins: newTotal });

            const freshDb = storage.getDatabase();
            if (!freshDb.rewards) freshDb.rewards = { catalog: [], transactions: [] };
            if (!freshDb.rewards.transactions) freshDb.rewards.transactions = [];

            const txn = {
                id: genId("RWD-TXN"),
                userId: citizen.userId,
                type: "earned_pickup",
                points,
                pickupId,
                description: description || `Eco Coins earned from Pickup ${pickupId}`,
                createdAt: new Date().toISOString()
            };
            freshDb.rewards.transactions.unshift(txn);
            storage.saveDatabase(freshDb);

            return txn;
        },

        redeemReward(citizenId, rewardId) {
            const citizen = storage.findById("citizens", citizenId);
            if (!citizen) return { success: false, error: "Citizen profile not found." };

            const catalog = this.getCatalog();
            const reward = catalog.find(r => r.id === rewardId);
            if (!reward) return { success: false, error: "Reward item not found." };

            if ((citizen.ecoCoins || 0) < reward.cost) {
                return { success: false, error: `Insufficient Eco Coins. You need ${reward.cost} coins.` };
            }

            const newTotal = citizen.ecoCoins - reward.cost;
            storage.update("citizens", citizenId, { ecoCoins: newTotal });

            const db = storage.getDatabase();
            if (!db.rewards.transactions) db.rewards.transactions = [];

            const txn = {
                id: genId("RWD-TXN"),
                userId: citizen.userId,
                type: "redeemed_perk",
                points: -reward.cost,
                description: `Redeemed: ${reward.name}`,
                createdAt: new Date().toISOString()
            };
            db.rewards.transactions.unshift(txn);
            storage.saveDatabase(db);

            notificationService.create({
                userId: citizen.userId,
                role: "citizen",
                type: "reward",
                title: "Reward Redeemed! 🎁",
                message: `You successfully redeemed ${reward.name} for ${reward.cost} Eco Coins.`
            });

            return { success: true, reward, remainingCoins: newTotal };
        }
    };

    /* =========================================================
       8. NOTIFICATION SERVICE (Event-Driven)
       ========================================================= */
    const notificationService = {
        getAll() {
            return storage.getCollection("notifications");
        },

        getForUser(userId) {
            return this.getAll().filter(n => n.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        },

        getForRole(role) {
            return this.getAll().filter(n => n.role === role).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        },

        getUnreadCount(userId) {
            return this.getForUser(userId).filter(n => !n.read).length;
        },

        markAsRead(notificationId) {
            return storage.update("notifications", notificationId, { read: true });
        },

        markAllAsRead(userId) {
            const notifs = storage.getCollection("notifications");
            notifs.forEach(n => {
                if (n.userId === userId) n.read = true;
            });
            storage.saveCollection("notifications", notifs, "markRead");
            return true;
        },

        create(data) {
            const notification = {
                id: genId("NOTIF"),
                userId: data.userId,
                role: data.role || "citizen",
                type: data.type || "pickup",
                title: data.title,
                message: data.message,
                read: false,
                createdAt: new Date().toISOString()
            };
            storage.insert("notifications", notification);
            return notification;
        }
    };

    /* =========================================================
       9. SUPPORT SERVICE (Disputes & Tickets)
       ========================================================= */
    const supportService = {
        getAllTickets() {
            return storage.getCollection("issues");
        },

        getTicketsByUser(userId) {
            return this.getAllTickets().filter(t => t.userId === userId);
        },

        createTicket(data) {
            const allTicketsData = this.getAllTickets();
            return resolveData(allTicketsData, function (allTickets) {
                const list = Array.isArray(allTickets) ? allTickets : [];
                // Idempotency: Prevent duplicate support ticket within 5 seconds
                const recentDuplicate = list.find(t => 
                    t.userId === data.userId && 
                    t.title === data.title && 
                    (Date.now() - new Date(t.createdAt).getTime()) < 5000
                );
                if (recentDuplicate) return recentDuplicate;

                const ticket = {
                    id: genId("ISS"),
                    raisedBy: data.raisedBy,
                    userId: data.userId,
                    role: data.role || "citizen",
                    category: data.category || "pickup",
                    type: data.category || "pickup",
                    title: data.title,
                    description: data.description,
                    priority: data.priority || "medium",
                    status: "open",
                    assignedTo: "Customer Support",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                const insertResult = storage.insert("issues", ticket);
                return resolveData(insertResult, function (inserted) {
                    notificationService.create({
                        userId: "USR-ADMIN-001",
                        role: "admin",
                        type: "dispute",
                        title: "New Support Ticket",
                        message: `${ticket.raisedBy} submitted #${ticket.id}: "${ticket.title}".`
                    });

                    return inserted && inserted.id ? inserted : ticket;
                });
            });
        },

        updateTicketStatus(ticketId, newStatus, assignedTo) {
            const updates = { status: newStatus, updatedAt: new Date().toISOString() };
            if (assignedTo) updates.assignedTo = assignedTo;

            const ticket = storage.update("issues", ticketId, updates);
            if (!ticket) return null;

            if (ticket.userId) {
                notificationService.create({
                    userId: ticket.userId,
                    role: ticket.role,
                    type: "dispute",
                    title: `Ticket #${ticket.id} Updated`,
                    message: `Status changed to ${newStatus.replace(/_/g, " ").toUpperCase()}.`
                });
            }

            return ticket;
        }
    };

    /* =========================================================
       10. PHONE VERIFICATION SERVICE (Production Abstraction)
       ========================================================= */
    const phoneVerificationService = {
        getStatus() {
            return {
                configured: false,
                provider: null,
                status: "unconfigured",
                message: "SMS provider integration deferred to future phase. Real OTP verification inactive."
            };
        },
        requestOtp(phone) {
            return Promise.resolve({
                success: false,
                error: "SMS provider is not configured. Production phone verification is deferred.",
                configured: false
            });
        },
        verifyOtp(phone, otp) {
            return Promise.resolve({
                success: false,
                error: "SMS provider is not configured. Production phone verification is deferred.",
                configured: false
            });
        }
    };

    return {
        auth: authService,
        citizen: citizenService,
        collector: collectorService,
        scrapAnalysis: scrapAnalysisService,
        pickup: pickupService,
        payment: paymentService,
        reward: rewardService,
        notification: notificationService,
        support: supportService,
        phoneVerification: phoneVerificationService,
        location: (function () {
            var loc = getLocationService();
            return loc || {};
        })(),
        nearbyCollector: (function () {
            var loc = getLocationService();
            return loc && loc.nearbyCollectorService ? loc.nearbyCollectorService : {};
        })(),
        resolveData: resolveData,
        isSupabaseMode: isSupabaseMode
    };
}));
