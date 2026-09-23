/* =========================================================
   E-KABAADI PLATFORM
   Client-Side Route Protection & Role Redirector
   File: frontend/shared/js/router.js
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(["./storage", "./services"], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory(require("./storage"), require("./services"));
    } else {
        root.EKABADI_ROUTER = factory(root.EKABADI_STORAGE, root.EKABADI_SERVICES);
        root.requireAuth = root.EKABADI_ROUTER.requireAuth;
        root.requireRole = root.EKABADI_ROUTER.requireRole;
    }
}(typeof self !== "undefined" ? self : this, function (storageModule, servicesModule) {
    "use strict";

    const storage = (storageModule && storageModule.adapter) ? storageModule.adapter : (typeof window !== "undefined" && window.EKABADI_STORAGE ? window.EKABADI_STORAGE.adapter : null);
    const authService = (servicesModule && servicesModule.auth) ? servicesModule.auth : (typeof window !== "undefined" ? window.authService : null);

    function getRelativeAuthPrefix() {
        if (typeof window === "undefined") return "../";
        const path = window.location.pathname.replace(/\\/g, "/");
        if (path.includes("/citizen/") || path.includes("/collector/") || path.includes("/admin/")) {
            return "../";
        }
        if (path.includes("/auth/")) {
            return "./";
        }
        return "frontend/";
    }

    const router = {
        getCurrentPath() {
            if (typeof window === "undefined") return "";
            return window.location.pathname.replace(/\\/g, "/");
        },

        isAuthPage() {
            const path = this.getCurrentPath();
            return path.includes("/auth/") || path.endsWith("login.html") || path.endsWith("signup.html");
        },

        isPublicPage() {
            const path = this.getCurrentPath();
            return path.includes("/public/") || (path.endsWith("index.html") && !path.includes("/admin/"));
        },

        /**
         * Validates active session, approval status, and role.
         * Redirects unauthorized users immediately.
         */
        requireAuth(allowedRole = null) {
            if (!storage) return true;
            const session = storage.getSession();
            const prefix = getRelativeAuthPrefix();

            // 1. Unauthenticated -> Redirect to Login
            const isLoggedIn = session && (session.loggedIn !== false) && (session.loggedIn === true || !!session.userId || !!session.user);
            if (!isLoggedIn) {
                if (typeof window !== "undefined") {
                    window.location.replace(`${prefix}auth/login.html`);
                }
                return false;
            }

            // 2. Account Status Validation (Pending / Rejected / Suspended)
            const userStatus = session.status || (session.user && session.user.status) || "active";
            if (userStatus === "pending_approval") {
                if (typeof window !== "undefined" && !this.getCurrentPath().includes("pending.html")) {
                    window.location.replace(`${prefix}auth/pending.html`);
                }
                return false;
            }

            if (userStatus === "rejected") {
                if (typeof window !== "undefined" && !this.getCurrentPath().includes("rejected.html")) {
                    window.location.replace(`${prefix}auth/rejected.html`);
                }
                return false;
            }

            if (userStatus === "suspended") {
                if (typeof storage.clearSession === "function") storage.clearSession();
                if (typeof window !== "undefined") {
                    window.location.replace(`${prefix}auth/login.html?error=suspended`);
                }
                return false;
            }

            // 3. Role Authorization Guard
            const userRole = session.role || (session.user && session.user.role);
            if (allowedRole && userRole !== allowedRole) {
                console.warn(`[EKABADI_ROUTER] Access denied for role '${userRole}' on protected '${allowedRole}' route.`);
                if (typeof window !== "undefined") {
                    if (userRole === "citizen") {
                        window.location.replace(`${prefix}citizen/dashboard.html`);
                    } else if (userRole === "collector") {
                        window.location.replace(`${prefix}collector/dashboard.html`);
                    } else if (userRole === "admin") {
                        window.location.replace(`${prefix}admin/dashboard.html`);
                    } else {
                        window.location.replace(`${prefix}auth/login.html`);
                    }
                }
                return false;
            }

            return true;
        },

        requireRole(role) {
            return this.requireAuth(role);
        }
    };

    return router;
}));
