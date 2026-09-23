/* =========================================================
   E-KABAADI PLATFORM
   Service Abstractions Layer
   File: js/services.js
   =========================================================

   All data access goes through these services.
   Currently backed by localStorage.
   Replace with real API calls later without touching UI code.
   ========================================================= */

(function () {
    "use strict";

    /* ─── Storage Keys ─── */
    const KEYS = {
        users: "ekabadi_users_v1",
        session: "ekabadi_platform_session_v1",
        pickups: "ekabadi_pickups_v1",
        payments: "ekabadi_payments_v1",
        notifications: "ekabadi_notifications_v1",
        rewards: "ekabadi_rewards_v1",
        applications: "ekabadi_applications_v1"
    };

    function read(key, fallback = null) {
        try {
            const v = localStorage.getItem(key);
            return v ? JSON.parse(v) : fallback;
        } catch { return fallback; }
    }
    function write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error("Storage write error:", e); }
    }
    function genId(prefix) {
        return prefix + "-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    }

    /* =========================================================
       AUTH SERVICE
       ========================================================= */

    const DEMO_USERS = [
        {
            id: "USR-ADMIN-001",
            email: "admin@ekabadi.demo",
            phone: "+91 99999 00000",
            password: "admin123",
            name: "Bhavya Bothera",
            role: "admin",
            status: "active",
            avatar: "BB",
            verified: { phone: true, email: true, identity: true }
        },
        {
            id: "USR-CIT-001",
            email: "citizen@ekabadi.demo",
            phone: "+91 98765 43210",
            password: "citizen123",
            name: "Aarav Sharma",
            role: "citizen",
            status: "active",
            avatar: "AS",
            verified: { phone: true, email: true, address: true },
            ecoCoins: 860,
            totalEarnings: 3240,
            totalScrapSold: 42.6,
            location: { address: "Sector 62, Noida", city: "Noida", state: "Uttar Pradesh", pin: "201309" }
        },
        {
            id: "USR-COL-001",
            email: "collector@ekabadi.demo",
            phone: "+91 98111 55500",
            password: "collector123",
            name: "Ramesh Kumar",
            role: "collector",
            status: "active",
            avatar: "RK",
            verified: { phone: true, email: true, identity: true },
            rating: 4.8,
            completedPickups: 342,
            totalEarnings: 128500,
            ecoCoins: 2400,
            vehicleType: "Three-Wheeler",
            vehicleNumber: "UP 16 AB 1234",
            serviceRadius: 8,
            isOnline: true,
            scrapCategories: ["Paper", "Plastic", "Metal", "E-waste"],
            location: { address: "Sector 15, Noida", city: "Noida", lat: 28.5855, lng: 77.3101 }
        }
    ];

    const authService = {

        login(emailOrPhone, password) {
            const users = this.getAllUsers();
            const normalized = String(emailOrPhone).trim().toLowerCase();
            const user = users.find(u =>
                (u.email && u.email.toLowerCase() === normalized) ||
                (u.phone && u.phone.replace(/\s+/g, "") === normalized.replace(/\s+/g, ""))
            );
            if (!user) return { success: false, error: "Invalid email or password." };
            if (user.password !== password) return { success: false, error: "Invalid email or password." };
            if (user.status === "pending_approval") return { success: false, error: "Your account is pending admin approval.", status: "pending" };
            if (user.status === "rejected") return { success: false, error: "Your application was rejected. Please check your status.", status: "rejected" };
            if (user.status === "suspended") return { success: false, error: "Your account has been suspended. Contact support." };

            const session = {
                loggedIn: true,
                user: { ...user, password: undefined },
                role: user.role,
                loginTime: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            };
            write(KEYS.session, session);
            return { success: true, session, role: user.role };
        },

        logout() {
            localStorage.removeItem(KEYS.session);
        },

        getSession() {
            const session = read(KEYS.session);
            if (!session || !session.loggedIn) return null;
            if (new Date(session.expiresAt) <= new Date()) { this.logout(); return null; }
            return session;
        },

        getCurrentUser() {
            const session = this.getSession();
            return session ? session.user : null;
        },

        getRole() {
            const session = this.getSession();
            return session ? session.role : null;
        },

        isAuthenticated() {
            return !!this.getSession();
        },

        getAllUsers() {
            const stored = read(KEYS.users);
            if (stored && stored.length) return stored;
            write(KEYS.users, DEMO_USERS);
            return DEMO_USERS;
        },

        registerUser(userData) {
            const users = this.getAllUsers();
            const existing = users.find(u => u.email === userData.email);
            if (existing) return { success: false, error: "An account with this email already exists." };

            const newUser = {
                id: genId("USR"),
                ...userData,
                status: "pending_approval",
                createdAt: new Date().toISOString(),
                verified: { phone: false, email: false, identity: false, address: false }
            };
            users.push(newUser);
            write(KEYS.users, users);

            const app = {
                id: genId("APP"),
                userId: newUser.id,
                role: newUser.role,
                name: newUser.name,
                email: newUser.email,
                status: "pending",
                submittedAt: new Date().toISOString(),
                documents: userData.documents || []
            };
            const apps = read(KEYS.applications, []);
            apps.push(app);
            write(KEYS.applications, apps);

            return { success: true, user: newUser, applicationId: app.id };
        },

        refreshSession() {
            const session = read(KEYS.session);
            if (!session || !session.loggedIn) return;
            session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            write(KEYS.session, session);
        }
    };

    /* =========================================================
       CITIZEN SERVICE
       ========================================================= */

    const citizenService = {
        getDashboardStats() {
            const user = authService.getCurrentUser();
            if (!user) return null;
            const pickups = pickupService.getByUser(user.id);
            return {
                ecoCoins: user.ecoCoins || 0,
                totalEarnings: user.totalEarnings || 0,
                totalScrapSold: user.totalScrapSold || 0,
                completedPickups: pickups.filter(p => p.status === "completed").length,
                pendingPickups: pickups.filter(p => !["completed", "cancelled"].includes(p.status)).length,
                co2Saved: Math.round((user.totalScrapSold || 0) * 2.3),
                treesEquivalent: Math.round((user.totalScrapSold || 0) * 0.06)
            };
        },

        analyzeScrap(imageFile) {
            const categories = [
                { name: "Paper", rate: 14, unit: "kg", icon: "📄", confidence: 0.92 },
                { name: "Plastic", rate: 10, unit: "kg", icon: "♻️", confidence: 0.88 },
                { name: "Metal", rate: 38, unit: "kg", icon: "🔩", confidence: 0.95 },
                { name: "Cardboard", rate: 8, unit: "kg", icon: "📦", confidence: 0.90 },
                { name: "Glass", rate: 3, unit: "kg", icon: "🫙", confidence: 0.85 },
                { name: "E-waste", rate: 22, unit: "kg", icon: "💻", confidence: 0.87 }
            ];
            const detected = categories[Math.floor(Math.random() * categories.length)];
            const estQty = +(Math.random() * 8 + 1).toFixed(1);
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        material: detected.name,
                        confidence: detected.confidence,
                        icon: detected.icon,
                        estimatedQuantity: estQty,
                        unit: detected.unit,
                        ratePerUnit: detected.rate,
                        estimatedValue: Math.round(estQty * detected.rate)
                    });
                }, 2000);
            });
        }
    };

    /* =========================================================
       COLLECTOR SERVICE
       ========================================================= */

    const MOCK_COLLECTORS = [
        { id: "USR-COL-001", name: "Ramesh Kumar", avatar: "RK", rating: 4.8, distance: 1.2, completedPickups: 342, isOnline: true, queue: 2, responseTime: "~15 min", vehicleType: "Three-Wheeler", scrapCategories: ["Paper", "Plastic", "Metal", "E-waste"], serviceArea: "Sector 15-65, Noida", verified: true },
        { id: "USR-COL-002", name: "Suresh Yadav", avatar: "SY", rating: 4.6, distance: 2.5, completedPickups: 218, isOnline: true, queue: 1, responseTime: "~20 min", vehicleType: "Pickup Truck", scrapCategories: ["Metal", "Cardboard", "Glass"], serviceArea: "Sector 1-30, Noida", verified: true },
        { id: "USR-COL-003", name: "Mohan Lal", avatar: "ML", rating: 4.9, distance: 3.8, completedPickups: 561, isOnline: true, queue: 0, responseTime: "~10 min", vehicleType: "Three-Wheeler", scrapCategories: ["Paper", "Plastic", "Metal", "Cardboard", "Glass", "E-waste"], serviceArea: "Sector 40-80, Noida", verified: true },
        { id: "USR-COL-004", name: "Vikram Singh", avatar: "VS", rating: 4.4, distance: 4.1, completedPickups: 156, isOnline: false, queue: 0, responseTime: "~25 min", vehicleType: "Bicycle Cart", scrapCategories: ["Paper", "Cardboard"], serviceArea: "Sector 50-70, Noida", verified: true },
        { id: "USR-COL-005", name: "Ashok Verma", avatar: "AV", rating: 4.7, distance: 1.8, completedPickups: 289, isOnline: true, queue: 3, responseTime: "~12 min", vehicleType: "Three-Wheeler", scrapCategories: ["Plastic", "Metal", "E-waste"], serviceArea: "Sector 10-45, Noida", verified: true },
        { id: "USR-COL-006", name: "Dinesh Gupta", avatar: "DG", rating: 4.5, distance: 5.2, completedPickups: 198, isOnline: true, queue: 1, responseTime: "~30 min", vehicleType: "Mini Truck", scrapCategories: ["Metal", "Glass", "E-waste"], serviceArea: "Sector 20-60, Noida", verified: true }
    ];

    const collectorService = {
        getNearbyCollectors(filters = {}) {
            let collectors = [...MOCK_COLLECTORS];
            if (filters.onlineOnly) collectors = collectors.filter(c => c.isOnline);
            if (filters.material) collectors = collectors.filter(c => c.scrapCategories.includes(filters.material));
            if (filters.maxDistance) collectors = collectors.filter(c => c.distance <= filters.maxDistance);
            if (filters.minRating) collectors = collectors.filter(c => c.rating >= filters.minRating);
            if (filters.sortBy === "distance") collectors.sort((a, b) => a.distance - b.distance);
            else if (filters.sortBy === "rating") collectors.sort((a, b) => b.rating - a.rating);
            else if (filters.sortBy === "pickups") collectors.sort((a, b) => b.completedPickups - a.completedPickups);
            else collectors.sort((a, b) => a.distance - b.distance);
            return collectors;
        },

        getCollectorById(id) {
            return MOCK_COLLECTORS.find(c => c.id === id) || null;
        },

        toggleOnline() {
            const user = authService.getCurrentUser();
            if (!user || user.role !== "collector") return false;
            const session = read(KEYS.session);
            session.user.isOnline = !session.user.isOnline;
            write(KEYS.session, session);
            return session.user.isOnline;
        },

        getDashboardStats() {
            const user = authService.getCurrentUser();
            if (!user) return null;
            const pickups = pickupService.getByCollector(user.id);
            const todayPickups = pickups.filter(p => {
                const d = new Date(p.createdAt);
                const today = new Date();
                return d.toDateString() === today.toDateString();
            });
            return {
                isOnline: user.isOnline !== false,
                todayPickups: todayPickups.length,
                pendingRequests: pickups.filter(p => p.status === "requested").length,
                completedPickups: user.completedPickups || pickups.filter(p => p.status === "completed").length,
                todayEarnings: todayPickups.filter(p => p.status === "completed").reduce((s, p) => s + (p.finalValue || 0), 0),
                totalEarnings: user.totalEarnings || 0,
                rating: user.rating || 0,
                ecoCoins: user.ecoCoins || 0
            };
        },

        getRequests() {
            const user = authService.getCurrentUser();
            if (!user) return [];
            return pickupService.getByCollector(user.id).filter(p => p.status === "requested");
        }
    };

    /* =========================================================
       PICKUP SERVICE
       ========================================================= */

    const MOCK_PICKUPS = [
        { id: "PKP-1001", citizenId: "USR-CIT-001", citizenName: "Aarav Sharma", collectorId: "USR-COL-001", collectorName: "Ramesh Kumar", scrapType: "Paper", estimatedQty: 5, estimatedValue: 70, address: "B-42, Sector 62, Noida", preferredDate: "2026-09-24", preferredTime: "10:00 AM - 12:00 PM", status: "requested", createdAt: "2026-09-23T03:30:00", notes: "Bundle near gate" },
        { id: "PKP-1002", citizenId: "USR-CIT-001", citizenName: "Aarav Sharma", collectorId: "USR-COL-003", collectorName: "Mohan Lal", scrapType: "Metal", estimatedQty: 3.2, estimatedValue: 122, address: "B-42, Sector 62, Noida", preferredDate: "2026-09-22", preferredTime: "2:00 PM - 4:00 PM", status: "completed", createdAt: "2026-09-20T14:00:00", completedAt: "2026-09-22T15:30:00", finalQty: 3.5, finalValue: 133, paymentStatus: "paid" },
        { id: "PKP-1003", citizenId: "USR-CIT-001", citizenName: "Aarav Sharma", collectorId: "USR-COL-005", collectorName: "Ashok Verma", scrapType: "E-waste", estimatedQty: 2, estimatedValue: 44, address: "B-42, Sector 62, Noida", preferredDate: "2026-09-25", preferredTime: "11:00 AM - 1:00 PM", status: "accepted", createdAt: "2026-09-23T01:00:00" }
    ];

    const pickupService = {
        getAll() {
            const stored = read(KEYS.pickups);
            if (stored && stored.length) return stored;
            write(KEYS.pickups, MOCK_PICKUPS);
            return MOCK_PICKUPS;
        },
        getByUser(userId) { return this.getAll().filter(p => p.citizenId === userId); },
        getByCollector(collectorId) { return this.getAll().filter(p => p.collectorId === collectorId); },
        getById(id) { return this.getAll().find(p => p.id === id) || null; },

        create(data) {
            const pickups = this.getAll();
            const pickup = {
                id: genId("PKP"),
                ...data,
                status: "requested",
                createdAt: new Date().toISOString()
            };
            pickups.push(pickup);
            write(KEYS.pickups, pickups);
            notificationService.add({
                userId: data.collectorId,
                type: "pickup",
                title: "New Pickup Request",
                message: `${data.citizenName} has requested a ${data.scrapType} pickup.`
            });
            return pickup;
        },

        updateStatus(pickupId, newStatus, extra = {}) {
            const pickups = this.getAll();
            const pickup = pickups.find(p => p.id === pickupId);
            if (!pickup) return null;
            pickup.status = newStatus;
            Object.assign(pickup, extra);
            if (newStatus === "completed") pickup.completedAt = new Date().toISOString();
            write(KEYS.pickups, pickups);
            return pickup;
        }
    };

    /* =========================================================
       PAYMENT SERVICE
       ========================================================= */

    const paymentService = {
        getByUser(userId) {
            const pickups = pickupService.getByUser(userId).filter(p => p.status === "completed");
            return pickups.map(p => ({
                id: "TXN-" + p.id.split("-")[1],
                pickupId: p.id,
                scrapType: p.scrapType,
                amount: p.finalValue || p.estimatedValue,
                date: p.completedAt || p.createdAt,
                status: p.paymentStatus || "completed",
                method: "UPI"
            }));
        },
        getByCollector(collectorId) {
            const pickups = pickupService.getByCollector(collectorId).filter(p => p.status === "completed");
            return pickups.map(p => ({
                id: "TXN-" + p.id.split("-")[1],
                pickupId: p.id,
                citizenName: p.citizenName,
                scrapType: p.scrapType,
                amount: p.finalValue || p.estimatedValue,
                date: p.completedAt || p.createdAt,
                status: "completed"
            }));
        }
    };

    /* =========================================================
       REWARD SERVICE
       ========================================================= */

    const REWARDS_CATALOG = [
        { id: "RWD-001", name: "Plant a Tree", description: "We plant a tree on your behalf", cost: 100, icon: "🌳", category: "environment" },
        { id: "RWD-002", name: "₹50 Cashback", description: "Redeemable on next pickup", cost: 200, icon: "💰", category: "cashback" },
        { id: "RWD-003", name: "Eco Badge: Bronze", description: "Show your commitment", cost: 500, icon: "🥉", category: "badge" },
        { id: "RWD-004", name: "₹100 Cashback", description: "Redeemable on next pickup", cost: 400, icon: "💰", category: "cashback" },
        { id: "RWD-005", name: "Eco Badge: Silver", description: "You're making a difference!", cost: 1000, icon: "🥈", category: "badge" },
        { id: "RWD-006", name: "Eco Badge: Gold", description: "True environmental champion", cost: 2500, icon: "🥇", category: "badge" },
        { id: "RWD-007", name: "Donate to Clean India", description: "Support the Swachh Bharat mission", cost: 150, icon: "🇮🇳", category: "donation" }
    ];

    const rewardService = {
        getCatalog() { return REWARDS_CATALOG; },
        getUserRewards(userId) { return read(KEYS.rewards + "_" + userId, []); },
        redeem(userId, rewardId) {
            const user = authService.getCurrentUser();
            if (!user) return { success: false, error: "Not authenticated" };
            const reward = REWARDS_CATALOG.find(r => r.id === rewardId);
            if (!reward) return { success: false, error: "Reward not found" };
            if ((user.ecoCoins || 0) < reward.cost) return { success: false, error: "Insufficient Eco Coins" };

            const redeemed = read(KEYS.rewards + "_" + userId, []);
            redeemed.push({ ...reward, redeemedAt: new Date().toISOString() });
            write(KEYS.rewards + "_" + userId, redeemed);
            return { success: true, reward };
        }
    };

    /* =========================================================
       NOTIFICATION SERVICE
       ========================================================= */

    const MOCK_CITIZEN_NOTIFICATIONS = [
        { id: "NOT-C001", userId: "USR-CIT-001", type: "pickup", title: "Pickup Request Accepted", message: "Ramesh Kumar has accepted your pickup request for Paper.", read: false, createdAt: new Date(Date.now() - 15 * 60000).toISOString() },
        { id: "NOT-C002", userId: "USR-CIT-001", type: "payment", title: "Payment Received", message: "₹133 has been credited for your Metal pickup.", read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
        { id: "NOT-C003", userId: "USR-CIT-001", type: "reward", title: "Eco Coins Earned!", message: "You earned 25 Eco Coins for your recent pickup.", read: true, createdAt: new Date(Date.now() - 7200000).toISOString() }
    ];

    const MOCK_COLLECTOR_NOTIFICATIONS = [
        { id: "NOT-R001", userId: "USR-COL-001", type: "pickup", title: "New Pickup Request", message: "Aarav Sharma has requested a Paper pickup in Sector 62.", read: false, createdAt: new Date(Date.now() - 10 * 60000).toISOString() },
        { id: "NOT-R002", userId: "USR-COL-001", type: "success", title: "Pickup Completed", message: "E-waste collection from Priya Verma completed successfully.", read: true, createdAt: new Date(Date.now() - 5400000).toISOString() }
    ];

    const notificationService = {
        getByUser(userId) {
            let notifs = read(KEYS.notifications + "_" + userId);
            if (!notifs) {
                if (userId === "USR-CIT-001") notifs = MOCK_CITIZEN_NOTIFICATIONS;
                else if (userId === "USR-COL-001") notifs = MOCK_COLLECTOR_NOTIFICATIONS;
                else notifs = [];
                write(KEYS.notifications + "_" + userId, notifs);
            }
            return notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        },
        getUnreadCount(userId) {
            return this.getByUser(userId).filter(n => !n.read).length;
        },
        markRead(userId, notifId) {
            const notifs = this.getByUser(userId);
            const n = notifs.find(x => x.id === notifId);
            if (n) { n.read = true; write(KEYS.notifications + "_" + userId, notifs); }
        },
        markAllRead(userId) {
            const notifs = this.getByUser(userId);
            notifs.forEach(n => n.read = true);
            write(KEYS.notifications + "_" + userId, notifs);
        },
        add(data) {
            const notifs = this.getByUser(data.userId);
            notifs.unshift({ id: genId("NOT"), ...data, read: false, createdAt: new Date().toISOString() });
            write(KEYS.notifications + "_" + data.userId, notifs);
        }
    };

    /* =========================================================
       GLOBAL EXPORTS
       ========================================================= */

    window.ekabadiServices = {
        auth: authService,
        citizen: citizenService,
        collector: collectorService,
        pickup: pickupService,
        payment: paymentService,
        reward: rewardService,
        notification: notificationService
    };

    // Shorthand
    window.authService = authService;
    window.citizenService = citizenService;
    window.collectorService = collectorService;
    window.pickupService = pickupService;
    window.paymentService = paymentService;
    window.rewardService = rewardService;
    window.notificationService = notificationService;

})();
