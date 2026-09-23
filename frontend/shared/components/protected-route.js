/* =========================================================
   E-KABAADI PLATFORM
   Shared Protected Route Script Tag Handler
   File: frontend/shared/components/protected-route.js
   ========================================================= */

(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        if (typeof EKABADI_ROUTER !== "undefined" && typeof EKABADI_ROUTER.requireAuth === "function") {
            const path = window.location.pathname.replace(/\\/g, "/");
            let role = null;
            if (path.includes("/citizen/")) role = "citizen";
            else if (path.includes("/collector/")) role = "collector";
            else if (path.includes("/admin/")) role = "admin";

            if (role) {
                EKABADI_ROUTER.requireAuth(role);
            }
        }
    });
})();
