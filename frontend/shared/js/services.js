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
    }
}(typeof self !== "undefined" ? self : this, function (storageModule, constantsModule) {
    "use strict";

    const storage = (storageModule && storageModule.adapter) ? storageModule.adapter : window.EKABADI_STORAGE.adapter;
    const CONSTANTS = constantsModule || window.EKABADI_CONSTANTS || {};

    function genId(prefix) {
        return prefix + "-" + Math.floor(1000 + Math.random() * 9000);
    }

    /* =========================================================
       1. AUTH SERVICE
       ========================================================= */
    const authService = {
        login(emailOrPhone, password) {
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
                return { success: false, error: "This account has been suspended by administration." };
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

        logout() {
            storage.clearSession();
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

        getNearbyCollectors(filters = {}) {
            let list = storage.getCollection("collectors").filter(c => c.status === "active");

            if (filters.onlineOnly) {
                list = list.filter(c => c.isOnline);
            }
            if (filters.material && filters.material !== "all") {
                list = list.filter(c => (c.acceptedMaterials || []).includes(filters.material));
            }
            if (filters.maxDistance) {
                list = list.filter(c => c.distance <= filters.maxDistance);
            }
            if (filters.minRating) {
                list = list.filter(c => c.rating >= filters.minRating);
            }

            // Sorting
            if (filters.sortBy === "rating") {
                list.sort((a, b) => b.rating - a.rating);
            } else if (filters.sortBy === "pickups") {
                list.sort((a, b) => b.completedPickups - a.completedPickups);
            } else {
                list.sort((a, b) => a.distance - b.distance); // default closest
            }

            return list;
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
       4. SCRAP ANALYSIS SERVICE (Modular AI Vision Simulation)
       ========================================================= */
    const scrapAnalysisService = {
        analyze(imageIdentifier = "sample") {
            const categories = storage.getCollection("scrapCategories");
            const candidate = categories[Math.floor(Math.random() * categories.length)] || {
                category: "Paper",
                name: "Newspaper & Notebooks",
                ratePerKg: 14.0
            };

            const randomKg = +(Math.random() * 12 + 2).toFixed(1);
            const confidence = +(0.88 + Math.random() * 0.1).toFixed(2);
            const estimatedValue = +(randomKg * candidate.ratePerKg).toFixed(2);

            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        material: candidate.category,
                        name: candidate.name,
                        icon: candidate.icon || "♻️",
                        estimatedWeight: randomKg,
                        ratePerKg: candidate.ratePerKg,
                        estimatedValue,
                        confidence,
                        recyclability: candidate.recyclability || "Certified Recyclable",
                        co2Saved: +(randomKg * 2.3).toFixed(1)
                    });
                }, 1200);
            });
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

            // Idempotency check: Prevent duplicate booking within 3 seconds
            const allPickups = this.getAll();
            const recentDuplicate = allPickups.find(p => 
                p.citizenId === data.citizenId && 
                p.collectorId === data.collectorId && 
                p.status === "requested" &&
                (Date.now() - new Date(p.createdAt).getTime()) < 3000
            );
            if (recentDuplicate) return recentDuplicate;

            const collector = storage.findById("collectors", data.collectorId);
            const citizen = storage.findById("citizens", data.citizenId);

            const pickup = {
                id: genId("PK"),
                citizenId: data.citizenId,
                collectorId: data.collectorId,
                citizenName: citizen ? citizen.name : data.citizenName || "Citizen",
                collectorName: collector ? collector.name : "Collector Partner",
                address: data.address || (citizen && citizen.addresses ? citizen.addresses[0].address : "Noida"),
                scheduledDate: data.scheduledDate || new Date().toISOString().split("T")[0],
                scheduledTime: data.scheduledTime || "10:00 AM - 12:00 PM",
                date: data.scheduledDate || new Date().toISOString().split("T")[0],
                timeSlot: data.scheduledTime || "10:00 AM - 12:00 PM",
                scrapType: data.scrapType || "Mixed Recyclables",
                items: data.items || [
                    { category: "Paper", type: "Newspaper", estimatedWeight: 10.0, verifiedWeight: null, rate: 14.0 }
                ],
                estimatedWeight: data.estimatedWeight || 10.0,
                estimatedValue: data.estimatedValue || 140.0,
                finalWeight: null,
                finalValue: null,
                status: "requested",
                paymentStatus: "pending",
                paymentMethod: data.paymentMethod || "UPI",
                ecoCoinsAwarded: 0,
                notes: data.notes || "",
                createdAt: new Date().toISOString()
            };

            storage.insert("pickups", pickup);

            // Notify Citizen
            notificationService.create({
                userId: citizen ? citizen.userId : "USR-CIT-001",
                role: "citizen",
                type: "pickup",
                title: "Pickup Scheduled",
                message: `Request ${pickup.id} sent to ${pickup.collectorName} for ${pickup.scheduledDate}.`
            });

            // Notify Collector
            notificationService.create({
                userId: collector ? collector.userId : "USR-COL-001",
                role: "collector",
                type: "pickup",
                title: "New Pickup Request!",
                message: `${pickup.citizenName} booked pickup for ${pickup.scrapType} (${pickup.estimatedWeight} kg).`
            });

            // Notify Admin Activity
            notificationService.create({
                userId: "USR-ADMIN-001",
                role: "admin",
                type: "pickup",
                title: "New Pickup Order",
                message: `${pickup.citizenName} scheduled ${pickup.id} with ${pickup.collectorName}.`
            });

            return pickup;
        },

        // Step 2: Collector accepts
        acceptPickup(pickupId, collectorId) {
            const pickup = storage.findById("pickups", pickupId);
            if (!pickup) return null;

            if (pickup.status === "accepted") {
                return { ...pickup, success: true, alreadyAccepted: true };
            }

            const updated = storage.update("pickups", pickupId, {
                status: "accepted",
                acceptedAt: new Date().toISOString()
            });

            const citizen = storage.findById("citizens", pickup.citizenId);
            if (citizen) {
                notificationService.create({
                    userId: citizen.userId,
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
        },

        // State Machine transitions: ON_THE_WAY, ARRIVED, COLLECTING, COMPLETED, PAID, CANCELLED
        updateStatus(pickupId, newStatus, extra = {}) {
            const pickup = storage.findById("pickups", pickupId);
            if (!pickup) return null;

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

            const updated = storage.update("pickups", pickupId, updates);

            // Citizen notifications
            const citizen = storage.findById("citizens", pickup.citizenId);
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
                    msg = `Final weight: ${updated.finalWeight} kg. Preparing payment settlement.`;
                }

                notificationService.create({
                    userId: citizen.userId,
                    role: "citizen",
                    type: "pickup",
                    title,
                    message: msg
                });
            }

            return updated;
        },

        // Step 3: Complete collection, Digital scale settlement, auto-payment & Eco Coins
        completeCollection(pickupId, collectionData) {
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

        // Cancellation Rule
        cancelPickup(pickupId, roleOrReason = "citizen", reasonOrRole = "Cancelled by user") {
            const pickup = storage.findById("pickups", pickupId);
            if (!pickup) return { success: false, error: "Pickup not found" };

            let role = "citizen";
            let reason = "Cancelled by user";
            if (["citizen", "collector", "admin"].includes(String(roleOrReason).toLowerCase())) {
                role = String(roleOrReason).toLowerCase();
                reason = reasonOrRole || "Cancelled by " + role;
            } else {
                reason = roleOrReason || "Cancelled by user";
                role = ["citizen", "collector", "admin"].includes(String(reasonOrRole).toLowerCase()) ? reasonOrRole : "citizen";
            }

            if (["completed", "paid", "collecting"].includes(pickup.status)) {
                return { success: false, error: "Cannot cancel pickup once weighing scale session is active or completed." };
            }

            const updated = this.updateStatus(pickupId, "cancelled", { reason });
            return { success: true, pickup: updated };
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
            // Idempotency: Prevent duplicate support ticket within 5 seconds
            const allTickets = this.getAllTickets();
            const recentDuplicate = allTickets.find(t => 
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

            storage.insert("issues", ticket);

            notificationService.create({
                userId: "USR-ADMIN-001",
                role: "admin",
                type: "dispute",
                title: "New Support Ticket",
                message: `${ticket.raisedBy} submitted #${ticket.id}: "${ticket.title}".`
            });

            return ticket;
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

    return {
        auth: authService,
        citizen: citizenService,
        collector: collectorService,
        scrapAnalysis: scrapAnalysisService,
        pickup: pickupService,
        payment: paymentService,
        reward: rewardService,
        notification: notificationService,
        support: supportService
    };
}));
