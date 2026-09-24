/* =========================================================
   E-KABAADI PLATFORM
   Runtime Environment & Adapter Switcher
   File: frontend/config/environment.js
   
   Reads configuration from window.__EKABADI_CONFIG__ which
   is set by config-loader.js + optional config.local.js.
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

    // Read runtime config (set by config-loader.js)
    var runtimeConfig = (typeof self !== "undefined" && self.__EKABADI_CONFIG__) 
        ? self.__EKABADI_CONFIG__ 
        : {};

    // Determine DATA_MODE: "mock" (default) or "supabase"
    var dataMode = runtimeConfig.DATA_MODE || "mock";

    var env = {
        // ── Runtime Mode ──
        mode: "development",           // "development" | "production" | "staging"
        
        // ── Data Adapter Selection ──
        // "mock"     → localStorage StateAdapter (default, no external deps)
        // "supabase" → SupabaseAdapter (requires configured credentials)
        DATA_MODE: dataMode,
        adapter: dataMode === "supabase" ? "supabase" : "localStorage",

        // ── Supabase Configuration ──
        supabaseUrl: runtimeConfig.SUPABASE_URL || "",
        supabaseAnonKey: runtimeConfig.SUPABASE_ANON_KEY || "",

        // ── API Configuration ──
        apiBaseUrl: "https://api.ekabaadi.in/v1",

        // ── Mock Mode Settings ──
        enableMockDelay: true,          // simulates network latency for real feel
        mockLatencyMs: 250,

        // ── Debug ──
        enableConsoleAudit: true,

        // ── Helper Methods ──
        isSupabaseMode: function () {
            return this.DATA_MODE === "supabase";
        },

        isMockMode: function () {
            return this.DATA_MODE === "mock";
        },

        isSupabaseConfigured: function () {
            return !!(this.supabaseUrl && this.supabaseAnonKey);
        }
    };

    // Log active mode on startup
    if (typeof console !== "undefined" && env.enableConsoleAudit) {
        console.info(
            "[E-Kabaadi] DATA_MODE=" + env.DATA_MODE + 
            (env.DATA_MODE === "supabase" 
                ? " | Supabase: " + env.supabaseUrl 
                : " | Using localStorage mock engine")
        );
    }

    return env;
}));
