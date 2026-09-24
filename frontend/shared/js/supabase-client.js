/* =========================================================
   E-KABAADI PLATFORM
   Supabase Client Singleton
   File: frontend/shared/js/supabase-client.js

   Lazy-initialized Supabase client.
   Only creates the client when Supabase mode is active.
   Uses the Supabase JS SDK loaded via CDN.
   
   CDN Script (add to HTML before this file):
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EKABADI_SUPABASE = factory();
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    var _client = null;
    var _initialized = false;

    /**
     * Get or create the Supabase client singleton.
     * Returns null if Supabase is not configured.
     */
    function getClient() {
        if (_client) return _client;
        if (_initialized) return null; // Already tried, wasn't available

        _initialized = true;

        // Check for Supabase SDK
        var supabase = (typeof self !== "undefined" && self.supabase) ? self.supabase : null;
        if (!supabase && typeof require === "function") {
            try {
                supabase = require("@supabase/supabase-js");
            } catch (e) {}
        }
        if (!supabase || !supabase.createClient) {
            if (typeof console !== "undefined") {
                console.warn("[E-Kabaadi Supabase] SDK not loaded. Add @supabase/supabase-js.");
            }
            return null;
        }

        // Get config
        var env = (typeof self !== "undefined" && self.EKABADI_ENV) ? self.EKABADI_ENV : null;
        if (!env && typeof require === "function") {
            try {
                env = require("../../config/environment");
            } catch (e) {}
        }
        if (!env || !env.supabaseUrl || !env.supabaseAnonKey) {
            if (typeof console !== "undefined") {
                console.warn("[E-Kabaadi Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment config.");
            }
            return null;
        }

        try {
            _client = supabase.createClient(env.supabaseUrl, env.supabaseAnonKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true,
                    storageKey: "ekabadi_supabase_auth_v1"
                },
                realtime: {
                    params: {
                        eventsPerSecond: 10
                    }
                }
            });

            if (typeof console !== "undefined") {
                console.info("[E-Kabaadi Supabase] Client initialized for: " + env.supabaseUrl);
            }
        } catch (err) {
            if (typeof console !== "undefined") {
                console.error("[E-Kabaadi Supabase] Failed to initialize client:", err);
            }
            _client = null;
        }

        return _client;
    }

    /**
     * Check if Supabase is available and configured.
     */
    function isAvailable() {
        if (_client) return true;
        return !!getClient();
    }

    /**
     * Perform real live connectivity check against Supabase REST endpoint.
     * Returns { connected: true } or { connected: false, error: ... }
     */
    function checkConnection() {
        var client = getClient();
        if (!client) {
            return Promise.resolve({
                connected: false,
                error: "Supabase client not initialized (missing credentials or SDK)"
            });
        }
        var start = Date.now();
        return client.from("scrap_categories").select("id").limit(1).then(function (res) {
            if (res.error) {
                return { connected: false, error: res.error.message, code: res.error.code };
            }
            return { connected: true, latencyMs: Date.now() - start };
        }).catch(function (err) {
            return { connected: false, error: (err && err.message) ? err.message : "Network error" };
        });
    }

    /**
     * Get the current authenticated user from Supabase Auth.
     * Returns a Promise that resolves to the user or null.
     */
    function getCurrentUser() {
        var client = getClient();
        if (!client) return Promise.resolve(null);

        return client.auth.getUser().then(function (result) {
            return (result.data && result.data.user) ? result.data.user : null;
        }).catch(function () {
            return null;
        });
    }

    /**
     * Get the current session from Supabase Auth.
     * Returns a Promise that resolves to the session or null.
     */
    function getSession() {
        var client = getClient();
        if (!client) return Promise.resolve(null);

        return client.auth.getSession().then(function (result) {
            return (result.data && result.data.session) ? result.data.session : null;
        }).catch(function () {
            return null;
        });
    }

    /**
     * Listen to auth state transitions.
     */
    function onAuthStateChange(callback) {
        var client = getClient();
        if (!client) return { data: { subscription: { unsubscribe: function () {} } } };
        return client.auth.onAuthStateChange(callback);
    }

    /**
     * Upload KYC Document to private storage bucket.
     */
    function uploadKycDoc(userId, file, fileName, contentType) {
        var client = getClient();
        if (!client) return Promise.reject(new Error("Supabase client not available"));
        var cleanName = (fileName || "doc_" + Date.now()).replace(/[^a-zA-Z0-9._-]/g, "_");
        var filePath = userId + "/" + cleanName;
        return client.storage.from("kyc-documents").upload(filePath, file, {
            contentType: contentType || "application/octet-stream",
            upsert: true
        }).then(function (res) {
            if (res.error) throw res.error;
            return { success: true, path: res.data.path };
        });
    }

    /**
     * Generate 60-second time-limited signed URL for private KYC doc review.
     */
    function createSignedKycUrl(filePath, expiresInSeconds) {
        var client = getClient();
        if (!client) return Promise.reject(new Error("Supabase client not available"));
        return client.storage.from("kyc-documents").createSignedUrl(filePath, expiresInSeconds || 60).then(function (res) {
            if (res.error) throw res.error;
            return { success: true, signedUrl: res.data.signedUrl };
        });
    }

    /**
     * Reset the client (for testing/logout).
     */
    function reset() {
        _client = null;
        _initialized = false;
    }

    return {
        getClient: getClient,
        isAvailable: isAvailable,
        checkConnection: checkConnection,
        getCurrentUser: getCurrentUser,
        getSession: getSession,
        onAuthStateChange: onAuthStateChange,
        uploadKycDoc: uploadKycDoc,
        createSignedKycUrl: createSignedKycUrl,
        reset: reset
    };
}));
