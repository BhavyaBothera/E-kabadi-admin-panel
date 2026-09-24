/* =========================================================
   E-KABAADI PLATFORM
   Runtime Configuration Loader
   File: frontend/config/config-loader.js

   This script bootstraps the environment configuration for
   static HTML pages. Since we don't use a build tool,
   environment variables are injected via config.local.js.

   Load order (in HTML):
   1. config-loader.js   (this file — sets defaults)
   2. config.local.js    (gitignored — overrides with real values)
   3. environment.js     (reads window.__EKABADI_CONFIG__)
   ========================================================= */

(function (root) {
    "use strict";

    // Read existing config or initialize defaults
    var existing = root.__EKABADI_CONFIG__ || {};

    // Support Node.js process.env if available (for tests and SSR)
    var nodeEnv = (typeof process !== "undefined" && process.env) ? process.env : {};

    var dataMode = existing.DATA_MODE || nodeEnv.DATA_MODE || nodeEnv.EKABADI_DATA_MODE || "mock";
    var supabaseUrl = existing.SUPABASE_URL || nodeEnv.SUPABASE_URL || nodeEnv.EKABADI_SUPABASE_URL || "";
    var supabaseAnonKey = existing.SUPABASE_ANON_KEY || nodeEnv.SUPABASE_ANON_KEY || nodeEnv.EKABADI_SUPABASE_ANON_KEY || "";

    var config = {
        DATA_MODE: dataMode,
        SUPABASE_URL: supabaseUrl,
        SUPABASE_ANON_KEY: supabaseAnonKey
    };

    // Helper for config.local.js or dynamic reconfiguration
    root.__EKABADI_SET_CONFIG__ = function (updates) {
        if (!updates || typeof updates !== "object") return;
        if (updates.DATA_MODE !== undefined) config.DATA_MODE = updates.DATA_MODE;
        if (updates.SUPABASE_URL !== undefined) config.SUPABASE_URL = updates.SUPABASE_URL;
        if (updates.SUPABASE_ANON_KEY !== undefined) config.SUPABASE_ANON_KEY = updates.SUPABASE_ANON_KEY;

        // Auto-validate Supabase configuration
        if (config.DATA_MODE === "supabase") {
            if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
                if (typeof console !== "undefined") {
                    console.warn(
                        "[E-Kabaadi Config] DATA_MODE=supabase requested but SUPABASE_URL or SUPABASE_ANON_KEY is missing. Operating in fallback mock mode."
                    );
                }
                config.DATA_MODE = "mock";
            }
        }
    };

    // Initial validation
    if (config.DATA_MODE === "supabase") {
        if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
            if (typeof console !== "undefined") {
                console.warn(
                    "[E-Kabaadi Config] DATA_MODE=supabase requested but SUPABASE_URL or SUPABASE_ANON_KEY is missing. Operating in fallback mock mode."
                );
            }
            config.DATA_MODE = "mock";
        }
    }

    root.__EKABADI_CONFIG__ = config;

}(typeof self !== "undefined" ? self : this));
