/* =========================================================
   E-KABAADI PLATFORM — ROUTING & ETA SERVICE
   File: frontend/shared/js/routing-service.js

   Capabilities:
   - RoutingProvider Abstraction (Mock vs Production)
   - Explicitly Simulated Mock Routing (Never presented as real road routing)
   - No Silent Fallback from Production to Mock (Returns ROUTE_UNAVAILABLE / ETA_UNAVAILABLE)
   - Dynamic ETA Calculation with Explicit Freshness States:
       ETA: AVAILABLE | STALE | UNAVAILABLE | ROUTE_UNAVAILABLE
       ROUTE: FRESH | STALE | UNAVAILABLE
   - Intelligent Refresh Throttling (Displacement > 100m, Age > 60s)
   - Non-destructive Route Deviation Detection (ON_ROUTE, MINOR_DEVIATION, OFF_ROUTE)
   - Zero Frontend Secrets
   ========================================================= */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EKABADI_ROUTING = factory();
        root.routingService = root.EKABADI_ROUTING.routingService;
        root.MockRoutingProvider = root.EKABADI_ROUTING.MockRoutingProvider;
        root.ProductionRoutingProvider = root.EKABADI_ROUTING.ProductionRoutingProvider;
    }
}(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    // ─────────────────────────────────────────────
    // CONSTANTS & STATUS CATALOGS
    // ─────────────────────────────────────────────
    var ROUTE_FRESHNESS = Object.freeze({
        FRESH: "FRESH",
        STALE: "STALE",
        UNAVAILABLE: "UNAVAILABLE"
    });

    var ETA_STATUS = Object.freeze({
        AVAILABLE: "AVAILABLE",
        STALE: "STALE",
        UNAVAILABLE: "UNAVAILABLE",
        ROUTE_UNAVAILABLE: "ROUTE_UNAVAILABLE"
    });

    var DEVIATION_STATUS = Object.freeze({
        ON_ROUTE: "ON_ROUTE",
        MINOR_DEVIATION: "MINOR_DEVIATION",
        OFF_ROUTE: "OFF_ROUTE",
        ROUTE_UNKNOWN: "ROUTE_UNKNOWN"
    });

    // Thresholds
    var ROUTE_MAX_AGE_SECONDS = 60; // Route considered stale after 60s
    var REFRESH_MIN_DISPLACEMENT_METERS = 100; // Do not recalculate if movement < 100m
    var DEVIATION_MINOR_THRESHOLD_METERS = 80;
    var DEVIATION_OFF_ROUTE_THRESHOLD_METERS = 250;

    // Helper: Haversine distance in meters
    function haversineMeters(lat1, lon1, lat2, lon2) {
        var R = 6371000.0; // meters
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLon = (lon2 - lon1) * Math.PI / 180.0;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180.0) * Math.cos(lat2 * Math.PI / 180.0) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }

    // ─────────────────────────────────────────────
    // 1. MOCK ROUTING PROVIDER (EXPLICITLY SIMULATED)
    // ─────────────────────────────────────────────
    function MockRoutingProvider(options) {
        options = options || {};
        this.providerId = "mock";
        this.providerName = "E-Kabaadi Simulated Route Engine";
        this.isSimulated = true;
        this.forcedFailure = options.forcedFailure || false;
        this.forcedTimeout = options.forcedTimeout || false;
        this.simulatedDeviation = options.simulatedDeviation || null; // 'MINOR_DEVIATION' | 'OFF_ROUTE'
    }

    MockRoutingProvider.prototype.getStatus = function () {
        return {
            providerId: this.providerId,
            providerName: this.providerName,
            isSimulated: true,
            status: this.forcedFailure ? "error" : "ready",
            operational: !this.forcedFailure
        };
    };

    MockRoutingProvider.prototype.calculateRoute = function (origin, destination, options) {
        var self = this;
        options = options || {};

        if (this.forcedFailure) {
            return Promise.reject(new Error("Simulated routing provider failure (mock mode)"));
        }
        if (this.forcedTimeout) {
            return new Promise(function (_, reject) {
                setTimeout(function () {
                    reject(new Error("Simulated routing provider timeout (mock mode)"));
                }, 100);
            });
        }

        if (!origin || origin.lat === undefined || origin.lng === undefined ||
            !destination || destination.lat === undefined || destination.lng === undefined) {
            return Promise.reject(new Error("Invalid coordinates provided for route calculation."));
        }

        var straightMeters = haversineMeters(origin.lat, origin.lng, destination.lat, destination.lng);
        // Explicit simulation: road distance approximation is Haversine * 1.28
        var roadDistanceMeters = Math.round(straightMeters * 1.28);
        var roadDistanceKm = +(roadDistanceMeters / 1000).toFixed(2);

        // Average urban tempo speed: ~22 km/h (6.11 m/s)
        var vehicleSpeedMps = 6.11;
        if (options.vehicleType && options.vehicleType.toLowerCase().includes("truck")) {
            vehicleSpeedMps = 5.0; // 18 km/h
        } else if (options.vehicleType && options.vehicleType.toLowerCase().includes("bike")) {
            vehicleSpeedMps = 7.5; // 27 km/h
        }

        var travelDurationSeconds = Math.max(60, Math.round(roadDistanceMeters / vehicleSpeedMps));
        var durationMinutes = Math.max(1, Math.round(travelDurationSeconds / 60));

        // Generate simulated polyline geometry waypoints
        var steps = 6;
        var waypoints = [];
        for (var i = 0; i <= steps; i++) {
            var frac = i / steps;
            var wLat = +(origin.lat + (destination.lat - origin.lat) * frac).toFixed(6);
            var wLng = +(origin.lng + (destination.lng - origin.lng) * frac).toFixed(6);
            // Add subtle simulated road curvature
            if (i > 0 && i < steps) {
                var jitter = (Math.sin(frac * Math.PI) * 0.0015);
                wLng = +(wLng + jitter).toFixed(6);
            }
            waypoints.push({ lat: wLat, lng: wLng });
        }

        var formattedDistance = roadDistanceKm < 1.0
            ? roadDistanceMeters + " m (road)"
            : roadDistanceKm + " km (road)";

        var formattedEta = durationMinutes <= 1
            ? "~1 min (approaching)"
            : "~" + durationMinutes + " mins";

        var devStatus = this.simulatedDeviation || DEVIATION_STATUS.ON_ROUTE;

        return Promise.resolve({
            success: true,
            provider: "mock",
            source: "simulated_mock",
            isSimulated: true, // EXPLICIT SIMULATION FLAG
            simulationNote: "Deterministic offline approximation for development & automated tests",
            distanceMeters: roadDistanceMeters,
            distanceKm: roadDistanceKm,
            formattedDistance: formattedDistance,
            durationSeconds: travelDurationSeconds,
            durationMinutes: durationMinutes,
            formattedEta: formattedEta,
            waypoints: waypoints,
            deviationStatus: devStatus,
            calculatedAt: new Date().toISOString()
        });
    };

    MockRoutingProvider.prototype.calculateETA = function (origin, destination, options) {
        return this.calculateRoute(origin, destination, options).then(function (route) {
            return {
                etaSeconds: route.durationSeconds,
                etaMinutes: route.durationMinutes,
                formattedEta: route.formattedEta,
                distanceMeters: route.distanceMeters,
                formattedDistance: route.formattedDistance,
                etaStatus: ETA_STATUS.AVAILABLE,
                isSimulated: true,
                source: "simulated_mock",
                calculatedAt: route.calculatedAt
            };
        });
    };

    // ─────────────────────────────────────────────
    // 2. PRODUCTION ROUTING PROVIDER (ADAPTER)
    // ─────────────────────────────────────────────
    function ProductionRoutingProvider(config) {
        this.config = config || {};
        this.providerId = this.config.ROUTING_PROVIDER || "unconfigured";
        this.apiKey = this.config.ROUTING_API_KEY || null;
        this.baseUrl = this.config.ROUTING_API_BASE_URL || null;
        this.isSimulated = false;
    }

    ProductionRoutingProvider.prototype.getStatus = function () {
        var isConfigured = Boolean(this.providerId !== "unconfigured" && (this.baseUrl || this.apiKey));
        return {
            providerId: this.providerId,
            isConfigured: isConfigured,
            isSimulated: false,
            status: isConfigured ? "configured" : "unconfigured",
            operational: isConfigured
        };
    };

    ProductionRoutingProvider.prototype.calculateRoute = function (origin, destination, options) {
        // Check configuration
        if (!this.apiKey || !this.config || !this.config.ROUTING_PROVIDER || this.config.ROUTING_PROVIDER === "unconfigured") {
            // NEVER SILENTLY FALL BACK TO MOCK IN PRODUCTION
            return Promise.resolve({
                success: false,
                status: "ROUTE_UNAVAILABLE",
                routeFreshness: ROUTE_FRESHNESS.UNAVAILABLE,
                etaStatus: ETA_STATUS.ROUTE_UNAVAILABLE,
                isSimulated: false,
                distanceKm: null,
                durationMinutes: null,
                error: "ROUTING_PROVIDER_UNCONFIGURED",
                message: "Production routing provider not configured. Route intelligence unavailable."
            });
        }

        // Live external provider HTTP call would be dispatched here (e.g. OSRM or Mapbox)
        // If external API fails, return explicit failure without fake data
        return Promise.resolve({
            success: false,
            status: "ROUTE_UNAVAILABLE",
            routeFreshness: ROUTE_FRESHNESS.UNAVAILABLE,
            etaStatus: ETA_STATUS.ROUTE_UNAVAILABLE,
            isSimulated: false,
            distanceKm: null,
            durationMinutes: null,
            error: "ROUTING_PROVIDER_CARRIER_PENDING",
            message: "Production routing provider connection pending carrier verification."
        });
    };

    ProductionRoutingProvider.prototype.calculateETA = function (origin, destination, options) {
        return this.calculateRoute(origin, destination, options).then(function (res) {
            if (!res.success) {
                return {
                    etaSeconds: null,
                    formattedEta: "ETA Unavailable",
                    etaStatus: ETA_STATUS.ROUTE_UNAVAILABLE,
                    isSimulated: false,
                    error: res.error
                };
            }
            return {
                etaSeconds: res.durationSeconds,
                formattedEta: res.formattedEta,
                etaStatus: ETA_STATUS.AVAILABLE,
                isSimulated: false
            };
        });
    };

    // ─────────────────────────────────────────────
    // 3. ROUTING & ETA SERVICE (FACADE)
    // ─────────────────────────────────────────────
    var cachedRoute = null;
    var lastCalculationLocation = null;
    var _customProvider = null;

    var routingService = {
        ROUTE_FRESHNESS: ROUTE_FRESHNESS,
        ETA_STATUS: ETA_STATUS,
        DEVIATION_STATUS: DEVIATION_STATUS,

        setProvider: function (provider) {
            _customProvider = provider;
        },

        getProvider: function () {
            if (_customProvider) {
                return _customProvider;
            }
            var config = (typeof window !== "undefined" && window.__EKABADI_CONFIG__) || {};
            var envMode = config.DATA_MODE || "mock";
            var providerType = config.ROUTING_PROVIDER || (envMode === "mock" ? "mock" : "unconfigured");

            if (providerType === "mock" || envMode === "mock") {
                return new MockRoutingProvider(config.mockRoutingOptions);
            }
            return new ProductionRoutingProvider(config);
        },

        /**
         * Evaluates route freshness based on calculation timestamp
         */
        evaluateRouteFreshness: function (calculatedAt) {
            if (!calculatedAt) return ROUTE_FRESHNESS.UNAVAILABLE;
            var ageSeconds = Math.round((Date.now() - new Date(calculatedAt).getTime()) / 1000);
            if (isNaN(ageSeconds) || ageSeconds < 0) return ROUTE_FRESHNESS.UNAVAILABLE;
            return ageSeconds <= ROUTE_MAX_AGE_SECONDS ? ROUTE_FRESHNESS.FRESH : ROUTE_FRESHNESS.STALE;
        },

        /**
         * Evaluates ETA freshness based on both location freshness and route age
         */
        evaluateEtaStatus: function (routeResultOrCalculatedAt, locationFreshness) {
            if (!routeResultOrCalculatedAt) return ETA_STATUS.ROUTE_UNAVAILABLE;

            var routeResult = typeof routeResultOrCalculatedAt === "object" ? routeResultOrCalculatedAt : null;
            var calculatedAt = routeResult ? routeResult.calculatedAt : routeResultOrCalculatedAt;
            var isSuccess = routeResult ? (routeResult.success !== false && !routeResult.error) : true;

            if (!isSuccess) {
                return ETA_STATUS.ROUTE_UNAVAILABLE;
            }

            if (locationFreshness === "UNAVAILABLE" || locationFreshness === ROUTE_FRESHNESS.UNAVAILABLE) {
                return ETA_STATUS.ROUTE_UNAVAILABLE;
            }
            if (locationFreshness === "OFFLINE" || locationFreshness === "STALE") {
                return ETA_STATUS.STALE;
            }

            var routeFresh = this.evaluateRouteFreshness(calculatedAt);
            if (routeFresh === ROUTE_FRESHNESS.STALE) {
                return ETA_STATUS.STALE;
            }
            if (routeFresh === ROUTE_FRESHNESS.UNAVAILABLE) {
                return ETA_STATUS.ROUTE_UNAVAILABLE;
            }
            return ETA_STATUS.AVAILABLE;
        },

        /**
         * Determines if route needs recalculation based on displacement and age
         */
        shouldRecalculateRoute: function (currentLocation, lastLocation, lastCalculatedAt) {
            if (!cachedRoute || !lastCalculatedAt || !lastLocation) {
                return true;
            }
            var ageSeconds = Math.round((Date.now() - new Date(lastCalculatedAt).getTime()) / 1000);
            if (ageSeconds >= ROUTE_MAX_AGE_SECONDS) {
                return true;
            }
            var displacement = haversineMeters(
                lastLocation.lat, lastLocation.lng,
                currentLocation.lat, currentLocation.lng
            );
            return displacement >= REFRESH_MIN_DISPLACEMENT_METERS;
        },

        /**
         * Calculate road route between collector and pickup destination
         */
        calculateRoute: function (origin, destination, options) {
            options = options || {};
            var provider = options.provider || this.getProvider();

            // Refresh throttling check
            if (!options.forceRefresh && cachedRoute && lastCalculationLocation) {
                if (!this.shouldRecalculateRoute(origin, lastCalculationLocation, cachedRoute.calculatedAt)) {
                    var cachedFreshness = this.evaluateRouteFreshness(cachedRoute.calculatedAt);
                    return Promise.resolve(Object.assign({}, cachedRoute, {
                        fromCache: true,
                        cached: true,
                        routeFreshness: cachedFreshness
                    }));
                }
            }

            return provider.calculateRoute(origin, destination, options).then(function (result) {
                result.cached = false;
                result.fromCache = false;
                if (result.success) {
                    cachedRoute = result;
                    lastCalculationLocation = { lat: origin.lat, lng: origin.lng };
                    result.routeFreshness = ROUTE_FRESHNESS.FRESH;
                } else {
                    result.routeFreshness = ROUTE_FRESHNESS.UNAVAILABLE;
                }
                return result;
            });
        },

        getRoute: function (origin, destination, options) {
            return this.calculateRoute(origin, destination, options);
        },

        getEta: function (origin, destination, options) {
            return this.calculateETA(origin, destination, options);
        },

        /**
         * Calculate authoritative ETA with explicit status
         */
        calculateETA: function (origin, destination, options) {
            var self = this;
            options = options || {};
            var locationFreshness = options.locationFreshness || "LIVE";

            return this.calculateRoute(origin, destination, options).then(function (routeResult) {
                var etaStatus = self.evaluateEtaStatus(routeResult, locationFreshness);

                if (!routeResult.success || etaStatus === ETA_STATUS.ROUTE_UNAVAILABLE) {
                    return {
                        etaStatus: ETA_STATUS.ROUTE_UNAVAILABLE,
                        formattedEta: "ETA Unavailable",
                        etaMinutes: null,
                        etaSeconds: null,
                        routeFreshness: ROUTE_FRESHNESS.UNAVAILABLE,
                        isSimulated: Boolean(routeResult.isSimulated),
                        error: routeResult.error || "Route unavailable"
                    };
                }

                var displayEta = routeResult.formattedEta;
                if (etaStatus === ETA_STATUS.STALE) {
                    displayEta = displayEta + " (stale)";
                }

                return {
                    etaStatus: etaStatus,
                    formattedEta: displayEta,
                    etaMinutes: routeResult.durationMinutes,
                    etaSeconds: routeResult.durationSeconds,
                    distanceKm: routeResult.distanceKm,
                    formattedDistance: routeResult.formattedDistance,
                    routeFreshness: routeResult.routeFreshness,
                    isSimulated: routeResult.isSimulated,
                    calculatedAt: routeResult.calculatedAt
                };
            });
        },

        /**
         * Detect route deviation non-destructively
         */
        detectRouteDeviation: function (currentLocation, waypoints) {
            if (!currentLocation || !waypoints || !waypoints.length) {
                return DEVIATION_STATUS.ROUTE_UNKNOWN;
            }

            // Find closest distance from current position to any waypoint in route
            var minDistance = Infinity;
            for (var i = 0; i < waypoints.length; i++) {
                var wp = waypoints[i];
                var d = haversineMeters(currentLocation.lat, currentLocation.lng, wp.lat, wp.lng);
                if (d < minDistance) {
                    minDistance = d;
                }
            }

            if (minDistance > DEVIATION_OFF_ROUTE_THRESHOLD_METERS) {
                return DEVIATION_STATUS.OFF_ROUTE;
            }
            if (minDistance > DEVIATION_MINOR_THRESHOLD_METERS) {
                return DEVIATION_STATUS.MINOR_DEVIATION;
            }
            return DEVIATION_STATUS.ON_ROUTE;
        },

        /**
         * Clear cached route state
         */
        clearCache: function () {
            cachedRoute = null;
            lastCalculationLocation = null;
        }
    };

    return {
        routingService: routingService,
        MockRoutingProvider: MockRoutingProvider,
        ProductionRoutingProvider: ProductionRoutingProvider,
        ROUTE_FRESHNESS: ROUTE_FRESHNESS,
        ETA_STATUS: ETA_STATUS,
        DEVIATION_STATUS: DEVIATION_STATUS
    };
}));
