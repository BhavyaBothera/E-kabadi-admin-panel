/* =========================================================
   E-KABAADI PLATFORM
   Runtime Environment & Adapter Switcher
   File: frontend/config/environment.js
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EKABADI_ENV = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    return Object.freeze({
        mode: "development", // "development" | "production" | "staging"
        adapter: "localStorage", // "localStorage" | "supabase" | "rest"
        apiBaseUrl: "https://api.ekabaadi.in/v1",
        enableMockDelay: true, // simulates network latency for real feel
        mockLatencyMs: 250,
        enableConsoleAudit: true
    });
}));
