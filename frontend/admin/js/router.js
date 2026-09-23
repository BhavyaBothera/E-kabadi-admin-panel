/* =========================================================
   E-KABAADI PLATFORM
   Route Protection & Role-Based Navigation
   File: js/router.js
   ========================================================= */

(function () {
    "use strict";

    const ROUTES = {
        public: ["/public/", "/public/index.html"],
        auth: ["/auth/login.html", "/auth/signup.html", "/auth/citizen-signup.html", "/auth/collector-signup.html", "/auth/pending.html", "/auth/rejected.html"],
        admin: ["/dashboard.html", "/citizens.html", "/collectors.html", "/pickups.html", "/scrap.html", "/payments.html", "/rewards.html", "/analytics.html", "/issues.html", "/settings.html"],
        citizen: ["/citizen/"],
        collector: ["/collector/"]
    };

    function getBasePath() {
        const path = window.location.pathname;
        return path;
    }

    function isPathMatch(path, routes) {
        return routes.some(r => path.includes(r));
    }

    function getRelativeRoot() {
        const depth = window.location.pathname.split("/").filter(Boolean).length;
        const repoFolder = window.location.pathname.split("/").find(p => p.includes("E-KABADI"));
        if (window.location.protocol === "file:") {
            // For file:// serving, calculate relative path from current location
            const parts = window.location.pathname.split("/");
            const rootIdx = parts.findIndex(p => p.includes("E-KABADI") || p.includes("E-kabadi"));
            if (rootIdx >= 0) {
                const currentDepth = parts.length - rootIdx - 2; // -2 for file itself and root folder
                if (currentDepth <= 0) return "./";
                return "../".repeat(currentDepth);
            }
        }
        return "./";
    }

    const router = {

        /** Check if current user can access the current page */
        protect() {
            const path = getBasePath();

            // Public pages - always accessible
            if (isPathMatch(path, ROUTES.public)) return true;

            // Auth pages - accessible to unauthenticated users
            if (isPathMatch(path, ROUTES.auth)) {
                // If already logged in and on login page, redirect
                if (path.includes("login.html") && typeof authService !== "undefined" && authService.isAuthenticated()) {
                    const role = authService.getRole();
                    this.redirectToDashboard(role);
                    return false;
                }
                return true;
            }

            // Admin pages - handled by existing admin auth system
            if (isPathMatch(path, ROUTES.admin)) return true;

            // Citizen pages - require citizen role
            if (isPathMatch(path, ROUTES.citizen)) {
                if (typeof authService === "undefined" || !authService.isAuthenticated()) {
                    window.location.href = getRelativeRoot() + "auth/login.html";
                    return false;
                }
                if (authService.getRole() !== "citizen") {
                    this.redirectToDashboard(authService.getRole());
                    return false;
                }
                return true;
            }

            // Collector pages - require collector role
            if (isPathMatch(path, ROUTES.collector)) {
                if (typeof authService === "undefined" || !authService.isAuthenticated()) {
                    window.location.href = getRelativeRoot() + "auth/login.html";
                    return false;
                }
                if (authService.getRole() !== "collector") {
                    this.redirectToDashboard(authService.getRole());
                    return false;
                }
                return true;
            }

            return true;
        },

        redirectToDashboard(role) {
            const root = getRelativeRoot();
            switch (role) {
                case "admin": window.location.href = root + "dashboard.html"; break;
                case "citizen": window.location.href = root + "citizen/dashboard.html"; break;
                case "collector": window.location.href = root + "collector/dashboard.html"; break;
                default: window.location.href = root + "auth/login.html";
            }
        },

        getRelativeRoot
    };

    window.ekabadiRouter = router;

})();
