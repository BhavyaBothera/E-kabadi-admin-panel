/* =========================================================
   E-KABAADI PLATFORM
   Supabase Realtime Subscription Manager
   File: frontend/shared/js/realtime.js

   Subscribes to Supabase Realtime channels for live updates.
   Dispatches the same `ekabadi:statechange` custom event that
   the localStorage adapter uses, so existing UI listeners
   work with zero changes.

   In mock mode, this module is a graceful no-op.
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(["./supabase-client"], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory(require("./supabase-client"));
    } else {
        root.EKABADI_REALTIME = factory(root.EKABADI_SUPABASE);
    }
}(typeof self !== "undefined" ? self : this, function (supabaseModule) {
    "use strict";

    var supabase = supabaseModule || (typeof self !== "undefined" ? self.EKABADI_SUPABASE : null);
    var _channels = {};
    var _initialized = false;

    function dispatchStateChange(entity, action, payload) {
        if (typeof window !== "undefined") {
            var event = new CustomEvent("ekabadi:statechange", {
                detail: {
                    entity: entity,
                    action: action,
                    payload: payload,
                    source: "realtime",
                    timestamp: new Date().toISOString()
                }
            });
            window.dispatchEvent(event);
        }
    }

    function mapEventType(eventType) {
        switch (eventType) {
            case "INSERT": return "insert";
            case "UPDATE": return "update";
            case "DELETE": return "delete";
            default: return "sync";
        }
    }

    /**
     * Subscribe to a Supabase table for realtime changes.
     * @param {string} tableName - The Supabase table name
     * @param {string} entityName - The entity name for state change events
     * @param {object} filter - Optional filter (e.g., { column: "citizen_id", value: "CIT-1001" })
     */
    function subscribe(tableName, entityName, filter) {
        if (!supabase || !supabase.isAvailable()) return null;

        var client = supabase.getClient();
        if (!client) return null;

        var channelName = "realtime:" + tableName + (filter ? ":" + filter.column + "=" + filter.value : "");

        // Avoid duplicate subscriptions
        if (_channels[channelName]) {
            return _channels[channelName];
        }

        var channelConfig = {
            event: "*",
            schema: "public",
            table: tableName
        };

        if (filter && filter.column && filter.value) {
            channelConfig.filter = filter.column + "=eq." + filter.value;
        }

        var channel = client
            .channel(channelName)
            .on("postgres_changes", channelConfig, function (payload) {
                var action = mapEventType(payload.eventType);
                var record = payload.new || payload.old;

                if (typeof console !== "undefined") {
                    console.info("[E-Kabaadi Realtime] " + entityName + ":" + action, record ? record.id : "");
                }

                dispatchStateChange(entityName, action, record);
            })
            .subscribe(function (status) {
                if (typeof console !== "undefined") {
                    console.info("[E-Kabaadi Realtime] Channel " + channelName + " → " + status);
                }
            });

        _channels[channelName] = channel;
        return channel;
    }

    /**
     * Unsubscribe from a specific channel.
     */
    function unsubscribe(channelName) {
        if (_channels[channelName]) {
            var client = supabase.getClient();
            if (client) {
                client.removeChannel(_channels[channelName]);
            }
            delete _channels[channelName];
        }
    }

    /**
     * Unsubscribe from all channels.
     */
    function unsubscribeAll() {
        var client = supabase ? supabase.getClient() : null;
        Object.keys(_channels).forEach(function (key) {
            if (client) client.removeChannel(_channels[key]);
            delete _channels[key];
        });
    }

    /**
     * Initialize default realtime subscriptions for the current user.
     * Call this after successful authentication.
     * @param {object} session - The app session with user role and IDs
     */
    function initForUser(session) {
        if (_initialized) return;
        if (!session || !session.user) return;

        var env = (typeof self !== "undefined" && self.EKABADI_ENV) ? self.EKABADI_ENV : null;
        if (!env || env.DATA_MODE !== "supabase") return;

        var role = session.user.role || session.role;

        // Everyone gets notification updates
        subscribe("notifications", "notifications", {
            column: "user_id",
            value: session.user.id
        });

        if (role === "citizen" && session.user.citizenId) {
            // Citizen: subscribe to their pickups
            subscribe("pickups", "pickups", {
                column: "citizen_id",
                value: session.user.citizenId
            });
            // Citizen: subscribe to their payments
            subscribe("payments", "payments", {
                column: "citizen_id",
                value: session.user.citizenId
            });
        } else if (role === "collector" && session.user.collectorId) {
            // Collector: subscribe to pickups assigned to them
            subscribe("pickups", "pickups", {
                column: "collector_id",
                value: session.user.collectorId
            });
            // Collector: subscribe to their payments
            subscribe("payments", "payments", {
                column: "collector_id",
                value: session.user.collectorId
            });
            // Collector: subscribe to own live location and tracking sessions
            subscribe("collector_live_locations", "collectorLiveLocations", {
                column: "collector_id",
                value: session.user.collectorId
            });
            subscribe("pickup_tracking_sessions", "pickupTrackingSessions", {
                column: "collector_id",
                value: session.user.collectorId
            });
        } else if (role === "admin") {
            // Admin: subscribe to all pickup changes (unfiltered)
            subscribe("pickups", "pickups");
            // Admin: subscribe to all payments
            subscribe("payments", "payments");
            // Admin: subscribe to admin notifications
            subscribe("notifications", "notifications", {
                column: "role",
                value: "admin"
            });
            // Admin: subscribe to fleet locations
            subscribe("collector_live_locations", "collectorLiveLocations");
            subscribe("pickup_tracking_sessions", "pickupTrackingSessions");
        }

        _initialized = true;

        if (typeof console !== "undefined") {
            console.info("[E-Kabaadi Realtime] Subscriptions initialized for role: " + role);
        }
    }

    /**
     * Clean up all subscriptions (call on logout).
     */
    function cleanup() {
        unsubscribeAll();
        _initialized = false;
    }

    // Auto-listen to window statechange events for session lifecycle
    if (typeof window !== "undefined") {
        window.addEventListener("ekabadi:statechange", function (e) {
            if (e && e.detail && e.detail.entity === "session") {
                if (e.detail.action === "login" && e.detail.payload) {
                    initForUser(e.detail.payload);
                } else if (e.detail.action === "logout") {
                    cleanup();
                }
            }
        });
    }

    return {
        subscribe: subscribe,
        unsubscribe: unsubscribe,
        unsubscribeAll: unsubscribeAll,
        initForUser: initForUser,
        cleanup: cleanup,
        getActiveChannels: function () {
            return Object.keys(_channels);
        },
        isConnected: function () {
            return _initialized && Object.keys(_channels).length > 0;
        },
        getStatus: function () {
            return {
                initialized: _initialized,
                activeChannels: Object.keys(_channels),
                count: Object.keys(_channels).length
            };
        }
    };
}));
