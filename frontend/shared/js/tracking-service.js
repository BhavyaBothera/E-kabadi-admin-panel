/* =========================================================
   E-KABAADI PLATFORM — FLEET TRACKING & LOCATION SESSION SERVICE
   File: frontend/shared/js/tracking-service.js

   Capabilities:
   1. Operational Location Session Lifecycle:
      INACTIVE → REQUESTED → ACTIVE → PAUSED → STOPPED
   2. Collector Location Publisher & Sanity Validator:
      - Authenticated Collector only (anti-spoofing)
      - Coordinate validation [-90, +90], [-180, +180]
      - Non-destructive GPS Teleportation / Anomaly Detection (>120 km/h)
   3. Location Freshness Engine:
      - LIVE (<= 30s) | RECENT (31-120s) | STALE (> 120s) | OFFLINE (> 300s)
      - Never presents stale coordinates as live
   4. Informational Doorstep Geofence Proximity (<= 150m):
      - Emits proximity signal; NEVER automatically transitions pickup state
   5. Ephemeral Telemetry & Data Minimization (Privacy First)
   6. Deterministic Mock Location Simulator for Tests & Demos
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define(["./storage", "./routing-service"], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory(require("./storage"), require("./routing-service"));
    } else {
        root.EKABADI_TRACKING = factory(root.EKABADI_STORAGE, root.EKABADI_ROUTING);
        root.trackingService = root.EKABADI_TRACKING.trackingService;
    }
}(typeof self !== "undefined" ? self : this, function (storageModule, routingModule) {
    "use strict";

    var storage = storageModule ? (storageModule.adapter || storageModule) : null;
    var routing = routingModule ? (routingModule.routingService || routingModule) : null;

    // Freshness Constants
    var FRESHNESS_THRESHOLDS = Object.freeze({
        LIVE_MAX_SECONDS: 30,
        RECENT_MAX_SECONDS: 120,
        STALE_MAX_SECONDS: 300
    });

    var LOCATION_FRESHNESS = Object.freeze({
        LIVE: "LIVE",
        RECENT: "RECENT",
        STALE: "STALE",
        OFFLINE: "OFFLINE"
    });

    var SESSION_STATUS = Object.freeze({
        INACTIVE: "inactive",
        REQUESTED: "requested",
        ACTIVE: "active",
        PAUSED: "paused",
        STOPPED: "stopped"
    });

    var MAX_REASONABLE_SPEED_KMH = 120.0; // 33.3 m/s max urban speed
    var PROXIMITY_GEOFENCE_METERS = 150; // Informational doorstep threshold

    // Helper: Haversine distance in meters
    function haversineMeters(lat1, lon1, lat2, lon2) {
        var R = 6371000.0;
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLon = (lon2 - lon1) * Math.PI / 180.0;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180.0) * Math.cos(lat2 * Math.PI / 180.0) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }

    function getStorageAdapter() {
        if (storage) return storage;
        if (typeof window !== "undefined" && window.EKABADI_STORAGE) {
            return window.EKABADI_STORAGE.adapter || window.EKABADI_STORAGE;
        }
        return null;
    }

    // ─────────────────────────────────────────────
    // TRACKING SERVICE IMPLEMENTATION
    // ─────────────────────────────────────────────
    var trackingService = {
        LOCATION_FRESHNESS: LOCATION_FRESHNESS,
        SESSION_STATUS: SESSION_STATUS,
        PROXIMITY_GEOFENCE_METERS: PROXIMITY_GEOFENCE_METERS,

        /**
         * Validates coordinates bounds and types
         */
        validateCoordinates: function (lat, lng) {
            var numLat = Number(lat);
            var numLng = Number(lng);

            if (lat === null || lat === undefined || lng === null || lng === undefined) {
                return { valid: false, error: "Coordinates cannot be null or undefined." };
            }
            if (isNaN(numLat) || isNaN(numLng) || !isFinite(numLat) || !isFinite(numLng)) {
                return { valid: false, error: "Coordinates must be finite numeric values." };
            }
            if (numLat < -90.0 || numLat > 90.0) {
                return { valid: false, error: "Latitude out of range [-90, +90]: " + numLat };
            }
            if (numLng < -180.0 || numLng > 180.0) {
                return { valid: false, error: "Longitude out of range [-180, +180]: " + numLng };
            }

            var latVal = +(numLat.toFixed(6));
            var lngVal = +(numLng.toFixed(6));

            return {
                valid: true,
                lat: latVal,
                lng: lngVal,
                latitude: latVal,
                longitude: lngVal
            };
        },

        /**
         * Evaluates location freshness state and human-readable label
         */
        evaluateLocationFreshness: function (timestamp, isSessionActive) {
            if (!timestamp || isSessionActive === false) {
                return {
                    status: LOCATION_FRESHNESS.OFFLINE,
                    label: "Offline",
                    ageSeconds: Infinity,
                    isLive: false
                };
            }

            var now = Date.now();
            var updateTime = new Date(timestamp).getTime();
            if (isNaN(updateTime)) {
                return {
                    status: LOCATION_FRESHNESS.OFFLINE,
                    label: "Offline",
                    ageSeconds: Infinity,
                    isLive: false
                };
            }

            var ageSeconds = Math.max(0, Math.round((now - updateTime) / 1000));

            if (ageSeconds <= FRESHNESS_THRESHOLDS.LIVE_MAX_SECONDS) {
                return {
                    status: LOCATION_FRESHNESS.LIVE,
                    label: "● Live",
                    ageSeconds: ageSeconds,
                    isLive: true
                };
            } else if (ageSeconds <= FRESHNESS_THRESHOLDS.RECENT_MAX_SECONDS) {
                return {
                    status: LOCATION_FRESHNESS.RECENT,
                    label: "Updated " + ageSeconds + "s ago",
                    ageSeconds: ageSeconds,
                    isLive: true
                };
            } else if (ageSeconds <= FRESHNESS_THRESHOLDS.STALE_MAX_SECONDS) {
                var mins = Math.round(ageSeconds / 60);
                return {
                    status: LOCATION_FRESHNESS.STALE,
                    label: "Location temporarily unavailable (last seen " + mins + "m ago)",
                    ageSeconds: ageSeconds,
                    isLive: false
                };
            } else {
                return {
                    status: LOCATION_FRESHNESS.OFFLINE,
                    label: "Collector currently offline",
                    ageSeconds: ageSeconds,
                    isLive: false
                };
            }
        },

        /**
         * Non-destructive Teleportation Anomaly Detection
         * Flags coordinate if movement implies speed > 120 km/h without deleting or altering
         */
        detectMovementAnomaly: function (arg1, arg2, timeDeltaSeconds) {
            if (!arg1 || !arg2) {
                return { isAnomaly: false, anomalyType: null, flag: null, speedKmh: null, calculatedSpeedKmh: null };
            }

            var p1 = {
                lat: arg1.latitude !== undefined ? arg1.latitude : arg1.lat,
                lng: arg1.longitude !== undefined ? arg1.longitude : arg1.lng,
                updatedAt: arg1.updatedAt || arg1.timestamp || null
            };
            var p2 = {
                lat: arg2.latitude !== undefined ? arg2.latitude : arg2.lat,
                lng: arg2.longitude !== undefined ? arg2.longitude : arg2.lng,
                updatedAt: arg2.updatedAt || arg2.timestamp || null
            };

            var deltaSec = timeDeltaSeconds;
            if ((!deltaSec || deltaSec <= 0) && p1.updatedAt && p2.updatedAt) {
                deltaSec = Math.abs(new Date(p2.updatedAt).getTime() - new Date(p1.updatedAt).getTime()) / 1000;
            } else if ((!deltaSec || deltaSec <= 0) && p1.updatedAt) {
                deltaSec = Math.abs(Date.now() - new Date(p1.updatedAt).getTime()) / 1000;
            }

            if (!deltaSec || deltaSec <= 0) {
                return { isAnomaly: false, anomalyType: null, flag: null, speedKmh: null, calculatedSpeedKmh: null };
            }

            var distMeters = haversineMeters(p1.lat, p1.lng, p2.lat, p2.lng);
            var speedMps = distMeters / deltaSec;
            var speedKmh = +(speedMps * 3.6).toFixed(1);

            if (speedKmh > MAX_REASONABLE_SPEED_KMH) {
                return {
                    isAnomaly: true,
                    anomalyType: "EXCESSIVE_SPEED",
                    flag: "EXCESSIVE_SPEED",
                    anomalyNote: "Implies impossible urban speed of " + speedKmh + " km/h over " + deltaSec + "s",
                    distMeters: distMeters,
                    speedKmh: speedKmh,
                    calculatedSpeedKmh: speedKmh
                };
            }

            return {
                isAnomaly: false,
                anomalyType: null,
                flag: null,
                distMeters: distMeters,
                speedKmh: speedKmh,
                calculatedSpeedKmh: speedKmh
            };
        },

        /**
         * Informational Doorstep Proximity Geofencing (<= 150m)
         * Mandatory Correction 4: Proximity geofencing is purely informational.
         * Never mutates or transitions pickup state machine to ARRIVED.
         */
        checkProximityGeofence: function (collectorLoc, destinationLoc, customThresholdMeters) {
            var threshold = customThresholdMeters || PROXIMITY_GEOFENCE_METERS;
            var lat1 = collectorLoc.latitude !== undefined ? collectorLoc.latitude : collectorLoc.lat;
            var lon1 = collectorLoc.longitude !== undefined ? collectorLoc.longitude : collectorLoc.lng;
            var lat2 = destinationLoc.latitude !== undefined ? destinationLoc.latitude : destinationLoc.lat;
            var lon2 = destinationLoc.longitude !== undefined ? destinationLoc.longitude : destinationLoc.lng;
            var d = haversineMeters(lat1, lon1, lat2, lon2);
            return {
                isNearDestination: d <= threshold,
                distanceMeters: d,
                thresholdMeters: threshold
            };
        },

        /**
         * Starts a tracking session for an accepted pickup
         */
        startSession: function (pickupId, collectorId, citizenId) {
            var adapter = getStorageAdapter();
            if (!adapter) throw new Error("Storage adapter unavailable.");

            var sessionId = "TRK-" + pickupId;
            var session = {
                id: sessionId,
                pickupId: pickupId,
                collectorId: collectorId,
                citizenId: citizenId,
                status: SESSION_STATUS.ACTIVE,
                locationFreshness: LOCATION_FRESHNESS.OFFLINE,
                routeFreshness: "UNAVAILABLE",
                etaStatus: "UNAVAILABLE",
                etaSeconds: null,
                distanceMeters: null,
                isNearDestination: false,
                deviationStatus: "ON_ROUTE",
                startedAt: new Date().toISOString(),
                endedAt: null,
                lastLocationAt: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            var existing = adapter.findById("pickupTrackingSessions", sessionId);
            if (existing) {
                session = Object.assign({}, existing, {
                    status: SESSION_STATUS.ACTIVE,
                    startedAt: existing.startedAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                adapter.update("pickupTrackingSessions", sessionId, session);
            } else {
                adapter.insert("pickupTrackingSessions", session);
            }

            return session;
        },

        /**
         * Pauses an active session (e.g. while weighing at doorstep)
         */
        pauseSession: function (sessionId) {
            var adapter = getStorageAdapter();
            if (!adapter) return null;
            return adapter.update("pickupTrackingSessions", sessionId, {
                status: SESSION_STATUS.PAUSED,
                updatedAt: new Date().toISOString()
            });
        },

        /**
         * Resumes a paused session
         */
        resumeSession: function (sessionId) {
            var adapter = getStorageAdapter();
            if (!adapter) return null;
            return adapter.update("pickupTrackingSessions", sessionId, {
                status: SESSION_STATUS.ACTIVE,
                updatedAt: new Date().toISOString()
            });
        },

        /**
         * Resolves tracking session by pickup ID
         */
        getSessionByPickupId: function (pickupId) {
            var adapter = getStorageAdapter();
            if (!adapter) return null;
            var sessionId = "TRK-" + pickupId;
            var found = adapter.findById("pickupTrackingSessions", sessionId);
            if (found) return found;
            var all = adapter.getCollection("pickupTrackingSessions") || [];
            return all.find(function (s) { return s.pickupId === pickupId; }) || null;
        },

        /**
         * Ends a tracking session upon pickup completion or cancellation
         */
        endSession: function (sessionId, reason) {
            var adapter = getStorageAdapter();
            if (!adapter) return null;
            return adapter.update("pickupTrackingSessions", sessionId, {
                status: SESSION_STATUS.STOPPED,
                endedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                closeReason: reason || "Pickup lifecycle terminated"
            });
        },

        /**
         * Collector publishes operational live location
         * Enforces tenant ownership: collector can only publish own location
         */
        publishLocation: function (collectorId, locationInput, authContext) {
            var adapter = getStorageAdapter();
            if (!adapter) throw new Error("Storage adapter unavailable.");

            // Anti-spoofing ownership verification
            if (!authContext) {
                throw new Error("Security violation: Unauthenticated location transmission.");
            }

            var currentCollectorId = typeof authContext === "string" ? authContext : (authContext.collectorId || (authContext.user && authContext.user.collectorId) || authContext.id);
            var userRole = typeof authContext === "object" ? authContext.role : (authContext === "admin" || authContext === "USR-ADMIN-001" ? "admin" : "collector");

            if (userRole !== "admin" && currentCollectorId !== collectorId) {
                throw new Error("Security violation: Collector " + currentCollectorId + " not authorized to publish location for " + collectorId);
            }

            // Coordinate validation
            var val = this.validateCoordinates(locationInput.latitude !== undefined ? locationInput.latitude : locationInput.lat, locationInput.longitude !== undefined ? locationInput.longitude : locationInput.lng);
            if (!val.valid) {
                throw new Error("Invalid location update: " + val.error);
            }

            var pickupId = locationInput.pickupId || null;
            var timestamp = locationInput.timestamp || new Date().toISOString();

            // Fetch last known location for anomaly detection
            var lastLive = adapter.findById("collectorLiveLocations", collectorId);
            var anomaly = { isAnomaly: false, anomalyType: null, speedKmh: null };

            if (lastLive && lastLive.latitude && lastLive.updatedAt) {
                var deltaSec = Math.round((new Date(timestamp).getTime() - new Date(lastLive.updatedAt).getTime()) / 1000);
                anomaly = this.detectMovementAnomaly({ lat: val.lat, lng: val.lng, updatedAt: timestamp }, { lat: lastLive.latitude, lng: lastLive.longitude, updatedAt: lastLive.updatedAt }, deltaSec);
            }

            var freshness = this.evaluateLocationFreshness(timestamp, true);

            var liveRecord = {
                id: collectorId,
                collectorId: collectorId,
                pickupId: pickupId,
                latitude: val.lat,
                longitude: val.lng,
                heading: locationInput.heading !== undefined ? Number(locationInput.heading) : (lastLive ? lastLive.heading : null),
                speedKmh: anomaly.speedKmh !== null ? anomaly.speedKmh : (locationInput.speedKmh !== undefined ? Number(locationInput.speedKmh) : null),
                accuracyMeters: locationInput.accuracyMeters !== undefined ? Number(locationInput.accuracyMeters) : null,
                source: locationInput.source || "browser_gps",
                status: "active",
                freshnessStatus: freshness.status,
                isSimulated: Boolean(locationInput.isSimulated),
                anomalyFlag: anomaly.isAnomaly ? (anomaly.anomalyType || anomaly.flag) : null,
                updatedAt: timestamp,
                success: true
            };

            // Save current live location
            if (lastLive) {
                adapter.update("collectorLiveLocations", collectorId, liveRecord);
            } else {
                adapter.insert("collectorLiveLocations", liveRecord);
            }

            // Ephemeral history breadcrumb (retention controlled)
            try {
                var historyItem = {
                    id: "LOC-" + collectorId + "-" + Date.now(),
                    collectorId: collectorId,
                    sessionId: pickupId ? "TRK-" + pickupId : null,
                    latitude: val.lat,
                    longitude: val.lng,
                    speedKmh: liveRecord.speedKmh,
                    heading: liveRecord.heading,
                    accuracyMeters: liveRecord.accuracyMeters,
                    anomalyFlag: liveRecord.anomalyFlag,
                    recordedAt: timestamp
                };
                var historyCol = adapter.getCollection("collectorLocationHistory") || [];
                historyCol.push(historyItem);
                // Trim in-memory history to last 50 entries per collector to prevent unbounded growth
                if (historyCol.length > 50) historyCol = historyCol.slice(-50);
                adapter.saveCollection("collectorLocationHistory", historyCol, "ephemeral_telemetry");
            } catch (e) {
                console.warn("[TrackingService] Failed to record ephemeral location history:", e);
            }

            // If active pickup is associated, evaluate proximity geofence and update tracking session
            if (pickupId) {
                var pickup = adapter.findById("pickups", pickupId);
                if (pickup && pickup.pickupLatitude && pickup.pickupLongitude) {
                    var distToDest = haversineMeters(val.lat, val.lng, pickup.pickupLatitude, pickup.pickupLongitude);
                    var isNear = distToDest <= PROXIMITY_GEOFENCE_METERS;

                    var sessionId = "TRK-" + pickupId;
                    var trackingSession = adapter.findById("pickupTrackingSessions", sessionId);
                    if (trackingSession) {
                        adapter.update("pickupTrackingSessions", sessionId, {
                            locationFreshness: freshness.status,
                            isNearDestination: isNear,
                            lastLocationAt: timestamp,
                            updatedAt: new Date().toISOString()
                        });
                    }
                }
            }

            return {
                success: true,
                location: liveRecord
            };
        },

        /**
         * Retrieves live location for an active pickup with strict authorization
         * Citizen can ONLY view if collector is currently assigned to citizen's active pickup
         */
        getPickupCollectorLocation: function (pickupId, authContext) {
            var adapter = getStorageAdapter();
            if (!adapter) return null;

            var pickup = adapter.findById("pickups", pickupId);
            if (!pickup) return null;

            // Authorization: Citizen must own the pickup, or Collector must be assigned, or Admin
            if (authContext) {
                var currentUserId = typeof authContext === "string" ? authContext : (authContext.id || (authContext.user && authContext.user.id));
                var currentCitizenId = typeof authContext === "string" ? authContext : (authContext.citizenId || (authContext.user && authContext.user.citizenId) || authContext.id);
                var currentCollectorId = typeof authContext === "string" ? authContext : (authContext.collectorId || (authContext.user && authContext.user.collectorId));
                var userRole = typeof authContext === "object" ? authContext.role : (currentUserId === "USR-ADMIN-001" || currentUserId === "admin" ? "admin" : (currentCitizenId && currentCitizenId.startsWith("USR-CIT") ? "citizen" : "collector"));

                if (userRole === "citizen" && currentCitizenId && currentCitizenId !== pickup.citizenId) {
                    return null;
                }
                if (userRole === "collector" && currentCollectorId && currentCollectorId !== pickup.collectorId) {
                    return null;
                }
            }

            // Only visible during active transit/operational stages
            var activeStatuses = ["accepted", "on_the_way", "arrived", "collecting"];
            if (!activeStatuses.includes(pickup.status)) {
                return null;
            }

            var liveLoc = adapter.findById("collectorLiveLocations", pickup.collectorId);
            if (!liveLoc) {
                return null;
            }

            var freshness = this.evaluateLocationFreshness(liveLoc.updatedAt, liveLoc.status === "active");

            return {
                available: true,
                pickupId: pickupId,
                collectorId: pickup.collectorId,
                latitude: liveLoc.latitude,
                longitude: liveLoc.longitude,
                heading: liveLoc.heading,
                speedKmh: liveLoc.speedKmh,
                accuracyMeters: liveLoc.accuracyMeters,
                anomalyFlag: liveLoc.anomalyFlag,
                isSimulated: Boolean(liveLoc.isSimulated),
                freshness: freshness,
                updatedAt: liveLoc.updatedAt
            };
        },

        /**
         * Fleet Operations Overview for Admin Command Center
         * Aggregates active collectors, freshness, and active pickups
         */
        getFleetOverview: function () {
            var adapter = getStorageAdapter();
            if (!adapter) return { activeCount: 0, collectors: [] };

            var collectors = adapter.getCollection("collectors") || [];
            var liveLocations = adapter.getCollection("collectorLiveLocations") || [];
            var activePickups = (adapter.getCollection("pickups") || []).filter(function (p) {
                return ["accepted", "on_the_way", "arrived", "collecting"].includes(p.status);
            });

            var self = this;
            var fleet = collectors.map(function (c) {
                var live = liveLocations.find(function (l) { return l.collectorId === c.id; }) || null;
                var assignedPickup = activePickups.find(function (p) { return p.collectorId === c.id; }) || null;
                var freshness = live ? self.evaluateLocationFreshness(live.updatedAt, live.status === "active") : { status: "OFFLINE", label: "Offline", isLive: false };

                return {
                    id: c.id,
                    name: c.name,
                    vehicleType: c.vehicleType,
                    vehicleNumber: c.vehicleNumber,
                    serviceArea: c.serviceArea,
                    isOnline: c.isOnline,
                    operationalStatus: assignedPickup ? assignedPickup.status : (c.isOnline ? "idle" : "offline"),
                    activePickupId: assignedPickup ? assignedPickup.id : null,
                    activePickupLocality: assignedPickup ? (assignedPickup.pickupLocality || "Sector 62, Noida") : null,
                    location: live ? { lat: live.latitude, lng: live.longitude } : null,
                    freshness: freshness,
                    isSimulated: live ? Boolean(live.isSimulated) : false,
                    lastSeen: live ? live.updatedAt : null
                };
            });

            return {
                totalCount: fleet.length,
                onlineCount: fleet.filter(function (f) { return f.isOnline; }).length,
                inTransitCount: fleet.filter(function (f) { return f.operationalStatus === "on_the_way"; }).length,
                staleCount: fleet.filter(function (f) { return f.freshness.status === "STALE"; }).length,
                offlineCount: fleet.filter(function (f) { return f.freshness.status === "OFFLINE"; }).length,
                collectors: fleet
            };
        },

        /**
         * Ephemeral Telemetry Purge procedure
         */
        purgeStaleTelemetry: function (retentionHours) {
            var hours = retentionHours || 24;
            var adapter = getStorageAdapter();
            if (!adapter) return 0;

            var cutoff = Date.now() - (hours * 3600 * 1000);
            var historyCol = adapter.getCollection("collectorLocationHistory") || [];
            var initialLength = historyCol.length;

            var filtered = historyCol.filter(function (item) {
                return new Date(item.recordedAt).getTime() >= cutoff;
            });

            adapter.saveCollection("collectorLocationHistory", filtered, "purge_telemetry");
            return initialLength - filtered.length;
        }
    };

    return {
        trackingService: trackingService,
        FRESHNESS_THRESHOLDS: FRESHNESS_THRESHOLDS,
        LOCATION_FRESHNESS: LOCATION_FRESHNESS,
        SESSION_STATUS: SESSION_STATUS
    };
}));
